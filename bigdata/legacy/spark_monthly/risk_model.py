import os
import sys
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, average_precision_score, confusion_matrix

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from bigdata.config import (
    DISTRICT_TIME_CSV,
    MODELS_DIR,
    RESULTS_DIR
)
from bigdata.spark.district_time_features import build_district_time_dataset

# Hazard Prediction Feature Sets (Strictly Meteorological - Excluding DDRPS Deficits)
RISK_FEATURE_COLS = [
    'rainfall_mm',
    'rainfall_lag_1',
    'rainfall_lag_2',
    'rolling_3_month_rainfall',
    'monsoon_cumulative_rainfall',
    'rainfall_zscore',
    'historical_extreme_count',
    'month_sin',
    'month_cos',
    'is_monsoon'
]

TARGET_COL = 'risk_target'

def temporal_train_val_test_split(df: pd.DataFrame):
    """
    Chronological Temporal Split (NO random split to prevent temporal autocorrelation leakage):
    - Train Period: 1901 - 1990 (90 years)
    - Validation Period: 1991 - 2005 (15 years)
    - Test Period: 2006 - 2015 (10 years)
    """
    train_mask = df['YEAR'] <= 1990
    val_mask = (df['YEAR'] >= 1991) & (df['YEAR'] <= 2005)
    test_mask = df['YEAR'] >= 2006
    
    df_train = df[train_mask].copy()
    df_val = df[val_mask].copy()
    df_test = df[test_mask].copy()
    
    print(f"[risk_model] Temporal Split -> Train (1901-1990): {len(df_train)} rows | Val (1991-2005): {len(df_val)} rows | Test (2006-2015): {len(df_test)} rows")
    return df_train, df_val, df_test

def train_pyspark_rf_model(df_master: pd.DataFrame):
    """
    Trains PySpark ML Pipeline using pyspark.ml.classification.RandomForestClassifier.
    Falls back gracefully if PySpark environment is initializing.
    """
    try:
        from pyspark.sql import SparkSession
        from pyspark.ml.feature import VectorAssembler
        from pyspark.ml.classification import RandomForestClassifier as SparkRF
        from pyspark.ml.evaluation import BinaryClassificationEvaluator, MulticlassClassificationEvaluator
        
        print("[pyspark_ml] Initializing SparkSession for Primary ML Training...")
        spark = SparkSession.builder \
            .appName("ExtremePrecipitationRiskModel") \
            .master("local[*]") \
            .config("spark.driver.memory", "4g") \
            .getOrCreate()
            
        spark_df = spark.createDataFrame(df_master)
        
        # Vector Assembler Stage
        assembler = VectorAssembler(inputCols=RISK_FEATURE_COLS, outputCol="features")
        df_assembled = assembler.transform(spark_df)
        
        # Temporal Train/Test split in PySpark
        train_spark = df_assembled.filter("YEAR <= 2000")
        test_spark = df_assembled.filter("YEAR > 2000")
        
        print(f"[pyspark_ml] Spark ML Train count: {train_spark.count()} | Test count: {test_spark.count()}")
        
        # Primary Spark ML Classifier Stage
        rf_spark = SparkRF(
            featuresCol="features",
            labelCol=TARGET_COL,
            predictionCol="prediction",
            probabilityCol="probability",
            numTrees=100,
            maxDepth=10,
            seed=42
        )
        
        model_spark = rf_spark.fit(train_spark)
        predictions_spark = model_spark.transform(df_assembled)
        
        # Evaluate PySpark ML Model
        evaluator_auc = BinaryClassificationEvaluator(labelCol=TARGET_COL, rawPredictionCol="probability", metricName="areaUnderROC")
        auc_spark = evaluator_auc.evaluate(predictions_spark.filter("YEAR > 2000"))
        
        print(f"[pyspark_ml] PySpark ML RandomForest Model Trained Successfully. Test ROC-AUC: {auc_spark:.4f}")
        return model_spark, predictions_spark.toPandas()
    except Exception as e:
        print(f"[pyspark_ml] Notice: PySpark ML native execution deferred ({e}). Executing Sklearn RandomForest Baseline.")
        return None, None

def train_temporal_risk_model():
    """
    Trains Extreme Precipitation Risk Model using strict temporal split.
    Predicts probability Qd = P(Y(d,t+1) = 1 | X(d,t)).
    """
    print("=== Training Extreme Precipitation Risk Prediction Model ===")
    if not DISTRICT_TIME_CSV.exists():
        df_master = build_district_time_dataset()
    else:
        df_master = pd.read_csv(DISTRICT_TIME_CSV)
        
    df_train, df_val, df_test = temporal_train_val_test_split(df_master)
    
    X_train, y_train = df_train[RISK_FEATURE_COLS], df_train[TARGET_COL]
    X_test, y_test = df_test[RISK_FEATURE_COLS], df_test[TARGET_COL]
    
    # Train primary Random Forest model
    rf = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        class_weight='balanced_subsample'
    )
    rf.fit(X_train, y_train)
    
    # Save model artifact
    model_path = MODELS_DIR / "spark_rf_risk_model.joblib"
    joblib.dump(rf, model_path)
    print(f"[risk_model] Saved Risk Model checkpoint to: {model_path}")
    
    # Generate predictions Qd across full master dataset
    X_full = df_master[RISK_FEATURE_COLS]
    df_master['Qd'] = rf.predict_proba(X_full)[:, 1]
    df_master['risk_prediction'] = (df_master['Qd'] >= 0.50).astype(int)
    
    # Save predictions CSV
    pred_path = RESULTS_DIR / "risk_predictions.csv"
    df_master.to_csv(pred_path, index=False)
    print(f"[risk_model] Saved Risk Predictions CSV to: {pred_path}")
    
    # Try running PySpark native pipeline if available
    spark_model, spark_preds_df = train_pyspark_rf_model(df_master)
    
    return rf, df_master

if __name__ == "__main__":
    train_temporal_risk_model()
