"""
evaluate_models.py — 4-model ML benchmark for paper Table V.
=============================================================
Trains and evaluates four classifiers on the district-month extreme-precipitation
panel using a strict temporal split (train ≤ 1990, val 1991-2005, test 2006-2015):

  1. Naive Persistence Baseline
  2. Logistic Regression (class-weighted)
  3. Random Forest       (class-weighted, balanced subsample)
  4. Gradient Boosted Trees (scale_pos_weight via XGBoost / sklearn GBT)

Class imbalance is handled via:
  (a) Class weights  — primary approach (no data resampling needed)
  (b) SMOTE          — oversampling variant for ablation

Primary evaluation metric: PR-AUC (Precision-Recall AUC), because the dataset
has severe class imbalance (~8:1 negative:positive). ROC-AUC is reported
secondarily. Macro-F1 is reported for completeness.

Outputs:
  bigdata/legacy/results/model_metrics_detailed.json
  bigdata/legacy/results/model_metrics.csv
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

# Add project root and this script's dir to path
_HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE))                        # legacy/spark_monthly
sys.path.insert(0, str(_HERE.parents[2]))              # project root

from bigdata.config import DISTRICT_TIME_CSV, MODELS_DIR_LEGACY, LEGACY_RESULTS_DIR

# ── make sure output dirs exist ───────────────────────────────────────────────
LEGACY_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR_LEGACY.mkdir(parents=True, exist_ok=True)

# ── re-use the same feature set as risk_model.py ─────────────────────────────
RISK_FEATURE_COLS = [
    "rainfall_mm",
    "rainfall_lag_1",
    "rainfall_lag_2",
    "rolling_3_month_rainfall",
    "monsoon_cumulative_rainfall",
    "rainfall_zscore",
    "historical_extreme_count",
    "month_sin",
    "month_cos",
    "is_monsoon",
]
TARGET_COL = "risk_target"


# ─────────────────────────────────────────────────────────────────────────────
# Temporal split helpers
# ─────────────────────────────────────────────────────────────────────────────

def temporal_train_val_test_split(df: pd.DataFrame):
    """
    Strict chronological split — no shuffling, prevents temporal leakage.
    Train : 1901–1990  (90 years)
    Val   : 1991–2005  (15 years)
    Test  : 2006–2015  (10 years)
    """
    train = df[df["YEAR"] <= 1990].copy()
    val = df[(df["YEAR"] >= 1991) & (df["YEAR"] <= 2005)].copy()
    test = df[df["YEAR"] >= 2006].copy()
    print(
        f"[split] Train {len(train):,} | Val {len(val):,} | Test {len(test):,}  "
        f"(pos rate: train={train[TARGET_COL].mean():.3f}, "
        f"test={test[TARGET_COL].mean():.3f})"
    )
    return train, val, test


# ─────────────────────────────────────────────────────────────────────────────
# Metrics helper
# ─────────────────────────────────────────────────────────────────────────────

def compute_metrics(model_name: str, y_true, y_pred, y_prob) -> dict:
    """Full metric suite optimised for imbalanced binary classification."""
    acc = float(accuracy_score(y_true, y_pred))
    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    macro_prec = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    macro_rec = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    pos_prec = float(precision_score(y_true, y_pred, pos_label=1, zero_division=0))
    pos_rec = float(recall_score(y_true, y_pred, pos_label=1, zero_division=0))
    pos_f1 = float(f1_score(y_true, y_pred, pos_label=1, zero_division=0))
    try:
        roc_auc = float(roc_auc_score(y_true, y_prob))
    except Exception:
        roc_auc = 0.5
    try:
        pr_auc = float(average_precision_score(y_true, y_prob))
    except Exception:
        pr_auc = 0.0
    cm = confusion_matrix(y_true, y_pred).tolist()
    support = [int((y_true == 0).sum()), int((y_true == 1).sum())]

    return {
        "model_name": model_name,
        "accuracy": round(acc, 4),
        "macro_precision": round(macro_prec, 4),
        "macro_recall": round(macro_rec, 4),
        "macro_f1": round(macro_f1, 4),
        "positive_class_precision": round(pos_prec, 4),
        "positive_class_recall": round(pos_rec, 4),
        "positive_class_f1": round(pos_f1, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "confusion_matrix": cm,
        "class_support_neg_pos": support,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Model trainers
# ─────────────────────────────────────────────────────────────────────────────

def _persistence_baseline(df_test: pd.DataFrame) -> tuple:
    """Predicts last month's label as next month's label (lag-1 persistence)."""
    # Use lagged extreme count delta as proxy for persistence
    y_prob = (
        df_test["historical_extreme_count"].diff().fillna(0).clip(0, 1).values
    )
    y_pred = (y_prob >= 0.5).astype(int)
    return y_pred, y_prob


def train_logistic_regression(X_train, y_train):
    n_neg = (y_train == 0).sum()
    n_pos = (y_train == 1).sum()
    pos_weight = n_neg / max(n_pos, 1)
    clf = LogisticRegression(
        max_iter=2000,
        class_weight={0: 1.0, 1: pos_weight},
        C=0.1,
        solver="lbfgs",
        random_state=42,
    )
    clf.fit(X_train, y_train)
    return clf


def train_random_forest(X_train, y_train):
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train, y_train)
    return clf


def train_random_forest_smote(X_train, y_train):
    """RF with SMOTE oversampling — ablation variant."""
    from imblearn.over_sampling import SMOTE

    sm = SMOTE(random_state=42, k_neighbors=min(5, int((y_train == 1).sum()) - 1))
    X_res, y_res = sm.fit_resample(X_train, y_train)
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        min_samples_leaf=5,
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_res, y_res)
    return clf


def train_gradient_boosted_trees(X_train, y_train):
    n_neg = (y_train == 0).sum()
    n_pos = (y_train == 1).sum()
    pos_weight = n_neg / max(n_pos, 1)
    # Try XGBoost first (better calibration), fall back to sklearn GBT
    try:
        from xgboost import XGBClassifier
        clf = XGBClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            scale_pos_weight=pos_weight,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric="aucpr",
            verbosity=0,
            use_label_encoder=False,
        )
        clf.fit(X_train, y_train)
        return clf, "XGBoost GBT"
    except ImportError:
        pass
    # sklearn GBT fallback
    clf = GradientBoostingClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        random_state=42,
    )
    # Approximate class weighting via sample_weight
    sample_weight = np.where(y_train == 1, pos_weight, 1.0)
    clf.fit(X_train, y_train, sample_weight=sample_weight)
    return clf, "Sklearn GBT"


# ─────────────────────────────────────────────────────────────────────────────
# Main evaluation runner
# ─────────────────────────────────────────────────────────────────────────────

def run_model_evaluation(df_master: pd.DataFrame | None = None) -> pd.DataFrame:
    """
    Trains and evaluates 4 classifiers + SMOTE ablation on the district-month panel.
    Returns DataFrame with one row per model.
    """
    print("\n" + "=" * 65)
    print("  4-Model ML Benchmark (Temporal Split, Imbalance-Corrected)")
    print("=" * 65)

    # ── load data ──────────────────────────────────────────────────────────
    if df_master is None:
        if DISTRICT_TIME_CSV.exists():
            df_master = pd.read_csv(DISTRICT_TIME_CSV)
            print(f"[eval] Loaded {len(df_master):,} rows from {DISTRICT_TIME_CSV.name}")
        else:
            print("[eval] district_time_master.csv not found — building dataset...")
            sys.path.insert(0, str(Path(__file__).resolve().parents[0]))
            from district_time_features import build_district_time_dataset
            df_master = build_district_time_dataset()

    df_train, df_val, df_test = temporal_train_val_test_split(df_master)

    # Combine train+val for final model fitting (standard practice)
    df_trainval = pd.concat([df_train, df_val], ignore_index=True)

    X_train = df_trainval[RISK_FEATURE_COLS].fillna(0.0)
    y_train = df_trainval[TARGET_COL].values
    X_test = df_test[RISK_FEATURE_COLS].fillna(0.0)
    y_test = df_test[TARGET_COL].values

    class_dist = dict(zip(*np.unique(y_train, return_counts=True)))
    print(f"[eval] Train+Val class distribution: {class_dist}  "
          f"(imbalance ratio: {class_dist.get(0,0)/max(class_dist.get(1,1),1):.1f}:1)")

    metrics_list = []

    # ── 1. Persistence Baseline ────────────────────────────────────────────
    print("\n[1/5] Persistence Baseline...")
    y_pred_p, y_prob_p = _persistence_baseline(df_test)
    metrics_list.append(compute_metrics("Persistence Baseline", y_test, y_pred_p, y_prob_p))
    print(f"      ROC-AUC={metrics_list[-1]['roc_auc']:.4f}  "
          f"PR-AUC={metrics_list[-1]['pr_auc']:.4f}")

    # ── 2. Logistic Regression ─────────────────────────────────────────────
    print("[2/5] Logistic Regression (class-weighted)...")
    lr = train_logistic_regression(X_train, y_train)
    y_prob_lr = lr.predict_proba(X_test)[:, 1]
    y_pred_lr = lr.predict(X_test)
    metrics_list.append(compute_metrics("Logistic Regression (balanced)", y_test, y_pred_lr, y_prob_lr))
    print(f"      ROC-AUC={metrics_list[-1]['roc_auc']:.4f}  "
          f"PR-AUC={metrics_list[-1]['pr_auc']:.4f}")

    # ── 3. Random Forest (class weights) ──────────────────────────────────
    print("[3/5] Random Forest (class_weight='balanced')...")
    rf = train_random_forest(X_train, y_train)
    y_prob_rf = rf.predict_proba(X_test)[:, 1]
    y_pred_rf = rf.predict(X_test)
    metrics_list.append(compute_metrics("Random Forest (balanced)", y_test, y_pred_rf, y_prob_rf))
    print(f"      ROC-AUC={metrics_list[-1]['roc_auc']:.4f}  "
          f"PR-AUC={metrics_list[-1]['pr_auc']:.4f}")

    # ── 3b. Random Forest + SMOTE (ablation) ──────────────────────────────
    print("[4/5] Random Forest + SMOTE (ablation)...")
    try:
        rf_smote = train_random_forest_smote(X_train, y_train)
        y_prob_rfs = rf_smote.predict_proba(X_test)[:, 1]
        y_pred_rfs = rf_smote.predict(X_test)
        metrics_list.append(
            compute_metrics("Random Forest + SMOTE", y_test, y_pred_rfs, y_prob_rfs)
        )
        print(f"      ROC-AUC={metrics_list[-1]['roc_auc']:.4f}  "
              f"PR-AUC={metrics_list[-1]['pr_auc']:.4f}")
    except Exception as exc:
        print(f"      [skip] SMOTE failed: {exc}")

    # ── 4. Gradient Boosted Trees ─────────────────────────────────────────
    print("[5/5] Gradient Boosted Trees (scale_pos_weight)...")
    gbt_clf, gbt_name = train_gradient_boosted_trees(X_train, y_train)
    y_prob_gbt = gbt_clf.predict_proba(X_test)[:, 1]
    y_pred_gbt = gbt_clf.predict(X_test)
    metrics_list.append(compute_metrics(gbt_name, y_test, y_pred_gbt, y_prob_gbt))
    print(f"      ROC-AUC={metrics_list[-1]['roc_auc']:.4f}  "
          f"PR-AUC={metrics_list[-1]['pr_auc']:.4f}")

    # ── Save best model probabilities for DDRPS Qd input ─────────────────
    # Use GBT (best expected) as the canonical Qd predictor
    df_master_copy = df_master.copy()
    X_full = df_master_copy[RISK_FEATURE_COLS].fillna(0.0)
    df_master_copy["Qd"] = gbt_clf.predict_proba(X_full)[:, 1]
    df_master_copy["Qd_rf"] = rf.predict_proba(X_full)[:, 1]
    df_master_copy["risk_prediction"] = (df_master_copy["Qd"] >= 0.50).astype(int)
    pred_path = LEGACY_RESULTS_DIR / "risk_predictions.csv"
    df_master_copy.to_csv(pred_path, index=False)
    print(f"\n[eval] Saved risk predictions (Qd=GBT) → {pred_path}")

    # ── Print summary table ───────────────────────────────────────────────
    df_metrics = pd.DataFrame(metrics_list)
    print("\n" + "=" * 100)
    print("  MODEL EVALUATION SUMMARY (Test Set 2006–2015)")
    print("=" * 100)
    cols_show = ["model_name", "accuracy", "macro_f1", "positive_class_precision",
                 "positive_class_recall", "roc_auc", "pr_auc"]
    print(df_metrics[cols_show].to_string(index=False))
    print("=" * 100)

    # ── Identify best model by PR-AUC ─────────────────────────────────────
    best_idx = df_metrics["pr_auc"].idxmax()
    best = df_metrics.loc[best_idx]
    print(f"\n  Best model by PR-AUC: {best['model_name']}")
    print(f"    PR-AUC  = {best['pr_auc']:.4f}")
    print(f"    ROC-AUC = {best['roc_auc']:.4f}")
    print(f"    Macro-F1 = {best['macro_f1']:.4f}")

    # ── Save outputs ──────────────────────────────────────────────────────
    csv_path = LEGACY_RESULTS_DIR / "model_metrics.csv"
    json_path = LEGACY_RESULTS_DIR / "model_metrics_detailed.json"
    df_metrics.to_csv(csv_path, index=False)
    with open(json_path, "w") as fp:
        json.dump(metrics_list, fp, indent=2)
    print(f"\n[eval] Saved CSV → {csv_path}")
    print(f"[eval] Saved JSON → {json_path}")

    return df_metrics


# ─────────────────────────────────────────────────────────────────────────────
# Generate LaTeX table for paper (Table V)
# ─────────────────────────────────────────────────────────────────────────────

def generate_latex_table(df_metrics: pd.DataFrame) -> str:
    """Returns a ready-to-paste LaTeX table string for paper Section IX."""
    best_pr = df_metrics["pr_auc"].max()
    lines = [
        r"\begin{table}[t]",
        r"\caption{ML Model Evaluation Results (Test Period 2006--2015, 23 Districts)}",
        r"\label{tab:modelresults}",
        r"\centering",
        r"\footnotesize",
        r"\begin{tabularx}{\columnwidth}{@{}l c c c c@{}}",
        r"\toprule",
        r"Model & Accuracy & Macro-F1 & PR-AUC & ROC-AUC \\",
        r"\midrule",
    ]
    for _, row in df_metrics.iterrows():
        name = row["model_name"]
        acc  = f"{row[chr(39)+'accuracy'+chr(39)]:.4f}"
        mf1  = f"{row[chr(39)+'macro_f1'+chr(39)]:.4f}"
        pr   = f"{row[chr(39)+'pr_auc'+chr(39)]:.4f}"
        roc  = f"{row[chr(39)+'roc_auc'+chr(39)]:.4f}"
        if abs(row["pr_auc"] - best_pr) < 1e-9:
            line = ("\\textbf{" + name + "} & \\textbf{" + acc + "} & "
                    "\\textbf{" + mf1 + "} & \\textbf{" + pr + "} & "
                    "\\textbf{" + roc + "} \\\\")
        else:
            line = name + " & " + acc + " & " + mf1 + " & " + pr + " & " + roc + " \\\\"
        lines.append(line)
    lines += [
        r"\midrule",
        r"\multicolumn{5}{l}{\footnotesize PR-AUC = Precision-Recall AUC (primary metric for imbalanced data)} \\",
        r"\bottomrule",
        r"\end{tabularx}",
        r"\end{table}",
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    df = run_model_evaluation()
    print("\n% ---- LaTeX Table ----")
    print(generate_latex_table(df))
