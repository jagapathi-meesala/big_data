"""RADAR hazard models — Spark MLlib RF / GBT / Logistic baselines.

Two targets over the district-day panel:
  extreme  extreme_rain_day   (rainfall >= district p99 of the 1901-1990 baseline)
  flood    flood_event_next{K} (ground-truth flood event within lead window;
                                rows restricted to >= 1978 where IFI covers)

Temporal split: train <= 2005, val 2006-2010, test > 2010 (no shuffling).
Class imbalance handled with positive-class weights. Outputs:
  bigdata/research/models/<target>_<model>.spark    fitted Spark pipeline
  bigdata/research/results/predictions_<target>.parquet
  bigdata/research/results/model_metrics.csv

Usage:
    spark-submit train_risk_model.py --target extreme
    python train_risk_model.py --target flood      # local Spark
"""
import argparse
import sys

import _bootstrap  # noqa: F401
import pandas as pd

from common.spark_utils import get_spark, stop_spark

from config import (
    FLOOD_LEAD_DAYS,
    MODEL_METRICS_CSV,
    MODELS_DIR,
    RESULTS_DIR,
    SPLIT_TRAIN_END,
    SPLIT_VAL_END,
    RANDOM_SEED,
    panel_uri,
)

FEATURES = [
    "rain_anom", "rain_lag1", "rain_lag7", "rain_roll7_sum", "rain_roll30_sum",
    "monsoon_cumulative", "month_sin", "month_cos", "doy_sin", "doy_cos",
    "is_monsoon", "enso_oni",
]


def split_col(df):
    from pyspark.sql import functions as F

    year = F.year("date")
    return df.withColumn(
        "split",
        F.when(year <= SPLIT_TRAIN_END, "train")
        .when(year <= SPLIT_VAL_END, "val")
        .otherwise("test"),
    )


def train_target(spark, target: str) -> pd.DataFrame:
    from pyspark.ml import Pipeline
    from pyspark.ml.classification import (
        GBTClassifier,
        LogisticRegression,
        RandomForestClassifier,
    )
    from pyspark.ml.evaluation import BinaryClassificationEvaluator
    from pyspark.ml.feature import Imputer, VectorAssembler
    from pyspark.sql import functions as F

    df = spark.read.parquet(panel_uri())
    df = split_col(df)

    label = "extreme_rain_day" if target == "extreme" else f"flood_event_next{FLOOD_LEAD_DAYS}"
    if target == "flood":
        df = df.filter(F.year("date") >= 1978).filter(F.col(label).isNotNull())
    else:
        df = df.filter(F.col(label).isNotNull())
    df = df.fillna(0.0, subset=FEATURES)

    # positive-class weight to counter imbalance
    n_pos = df.filter(F.col(label) == 1).count()
    n_neg = df.filter(F.col(label) == 0).count()
    if n_pos == 0:
        raise ValueError(f"target {target} has no positive rows — is ground truth present?")
    pos_weight = float(n_neg) / float(n_pos)
    df = df.withColumn(
        "cls_weight", F.when(F.col(label) == 1, F.lit(pos_weight)).otherwise(F.lit(1.0))
    )

    assembler = VectorAssembler(inputCols=FEATURES, outputCol="features")
    models = {
        "logreg": LogisticRegression(
            maxIter=100, weightCol="cls_weight", featuresCol="features",
            labelCol=label, probabilityCol="p_raw",
        ),
        "rf": RandomForestClassifier(
            numTrees=100, maxDepth=10, seed=RANDOM_SEED, weightCol="cls_weight",
            featuresCol="features", labelCol=label, probabilityCol="p_raw",
        ),
        "gbt": GBTClassifier(
            maxIter=100, maxDepth=5, stepSize=0.1, seed=RANDOM_SEED,
            weightCol="cls_weight", featuresCol="features", labelCol=label,
            rawPredictionCol="raw_gbt", probabilityCol="p_raw",
        ),
    }

    all_predictions = []
    metrics_rows = []
    for name, model in models.items():
        imputer = Imputer(inputCols=FEATURES, outputCols=FEATURES).setStrategy("median")
        pipeline = Pipeline(stages=[imputer, assembler, model])
        train = df.filter(F.col("split") == "train")
        fitted = pipeline.fit(train)
        pred = fitted.transform(df).select(
            "district", "date", label, "p_raw", "split"
        ).withColumn("model", F.lit(name)).withColumn("target", F.lit(target))
        all_predictions.append(pred)

        evaluator_auc = BinaryClassificationEvaluator(
            labelCol=label, rawPredictionCol="p_raw", metricName="areaUnderROC"
        )
        evaluator_pr = BinaryClassificationEvaluator(
            labelCol=label, rawPredictionCol="p_raw", metricName="areaUnderPR"
        )
        for split in ("val", "test"):
            sub = pred.filter(F.col("split") == split)
            if sub.rdd.isEmpty():
                continue
            auc = evaluator_auc.evaluate(sub)
            pr = evaluator_pr.evaluate(sub)
            metrics_rows.append(
                {
                    "target": target,
                    "model": name,
                    "split": split,
                    "roc_auc": round(auc, 4),
                    "pr_auc": round(pr, 4),
                    "n_pos": sub.filter(F.col(label) == 1).count(),
                    "n": sub.count(),
                }
            )
            print(f"[train] {target}/{name}/{split}: ROC-AUC={auc:.4f} PR-AUC={pr:.4f}")

        model_path = MODELS_DIR / f"{target}_{name}.spark"
        try:
            fitted.write().overwrite().save(str(model_path))
        except Exception as exc:
            print(f"[train] model save skipped for {name}: {exc}")

    pred_df = all_predictions[0]
    for extra in all_predictions[1:]:
        pred_df = pred_df.unionByName(extra)
    out = RESULTS_DIR / f"predictions_{target}.parquet"
    pred_df.write.mode("overwrite").parquet(str(out))
    return pd.DataFrame(metrics_rows)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--target", choices=["extreme", "flood", "both"], default="both")
    args = ap.parse_args()

    targets = ["extreme", "flood"] if args.target == "both" else [args.target]
    spark = get_spark("radar-train")
    frames = []
    for t in targets:
        try:
            frames.append(train_target(spark, t))
        except Exception as exc:
            print(f"[train] FAILED {t}: {exc}")
    stop_spark(spark)

    if frames:
        metrics = pd.concat(frames, ignore_index=True)
        if MODEL_METRICS_CSV.exists():
            old = pd.read_csv(MODEL_METRICS_CSV)
            old = old[~old["target"].isin(metrics["target"].unique())]
            metrics = pd.concat([old, metrics], ignore_index=True)
        metrics.to_csv(MODEL_METRICS_CSV, index=False)
        print(f"[train] metrics -> {MODEL_METRICS_CSV}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
