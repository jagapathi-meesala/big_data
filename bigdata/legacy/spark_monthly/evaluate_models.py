import os
import sys
import pandas as pd
import numpy as np
import json
from pathlib import Path
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix
)

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from bigdata.config import (
    DISTRICT_TIME_CSV,
    RESULTS_DIR,
    MODELS_DIR
)
from bigdata.spark.risk_model import (
    temporal_train_val_test_split,
    RISK_FEATURE_COLS,
    TARGET_COL
)

def evaluate_classifier(y_true, y_pred, y_prob, model_name="RandomForest"):
    """
    Evaluates classification performance using strict macro-averaged metrics (average='macro').
    DOCUMENTATION:
    Explicitly computes macro-averaged Precision, Recall, and F1 across all target classes.
    Does NOT confuse binary positive-class F1 with Macro-F1.
    """
    acc = float(accuracy_score(y_true, y_pred))
    macro_prec = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    macro_rec = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    macro_f1 = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    
    # Binary positive class specific metrics for reference
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
    
    metrics = {
        "model_name": model_name,
        "accuracy": round(acc, 4),
        "macro_precision": round(macro_prec, 4),
        "macro_recall": round(macro_rec, 4),
        "macro_f1": round(macro_f1, 4),
        "positive_class_f1": round(pos_f1, 4),
        "positive_class_precision": round(pos_prec, 4),
        "positive_class_recall": round(pos_rec, 4),
        "roc_auc": round(roc_auc, 4),
        "pr_auc": round(pr_auc, 4),
        "confusion_matrix": cm,
        "class_support": support
    }
    return metrics

def run_model_evaluation():
    print("=== Running Comprehensive Model Evaluation (Temporal Split) ===")
    if not DISTRICT_TIME_CSV.exists():
        from bigdata.spark.district_time_features import build_district_time_dataset
        df_master = build_district_time_dataset()
    else:
        df_master = pd.read_csv(DISTRICT_TIME_CSV)
        
    pred_path = RESULTS_DIR / "risk_predictions.csv"
    if not pred_path.exists():
        from bigdata.spark.risk_model import train_temporal_risk_model
        _, df_master = train_temporal_risk_model()
    else:
        df_master = pd.read_csv(pred_path)
        
    df_train, df_val, df_test = temporal_train_val_test_split(df_master)
    
    # Evaluate Test Set Predictions
    y_test_true = df_test[TARGET_COL]
    y_test_pred = df_test['risk_prediction']
    y_test_prob = df_test['Qd']
    
    metrics_rf = evaluate_classifier(y_test_true, y_test_pred, y_test_prob, "RandomForestClassifier")
    
    # Baseline Naive Persistence Model (Predicting t-1 extreme event status)
    y_test_persistence = df_test['historical_extreme_count'].diff().fillna(0).clip(0, 1)
    metrics_persistence = evaluate_classifier(y_test_true, y_test_persistence, y_test_persistence, "PersistenceBaseline")
    
    metrics_list = [metrics_rf, metrics_persistence]
    df_metrics = pd.DataFrame(metrics_list)
    
    metrics_path = RESULTS_DIR / "model_metrics.csv"
    df_metrics.to_csv(metrics_path, index=False)
    
    json_metrics_path = RESULTS_DIR / "model_metrics_detailed.json"
    with open(json_metrics_path, "w") as fp:
        json.dump(metrics_list, fp, indent=2)
        
    print(f"[evaluation] Evaluation complete. Saved metrics to: {metrics_path}")
    print("\n=== Model Metrics Summary (Test Set 2006-2015) ===")
    print(df_metrics[['model_name', 'accuracy', 'macro_precision', 'macro_recall', 'macro_f1', 'roc_auc', 'pr_auc']].to_string(index=False))
    return df_metrics

if __name__ == "__main__":
    run_model_evaluation()
