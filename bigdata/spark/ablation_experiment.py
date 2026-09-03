import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from bigdata.config import (
    DISTRICT_TIME_CSV,
    RESULTS_DIR
)
from bigdata.spark.risk_model import temporal_train_val_test_split, TARGET_COL
from bigdata.spark.evaluate_models import evaluate_classifier

# Ablation Feature Subsets
ABLATION_SUBSETS = {
    "Subset_A_Rainfall_Only": [
        'rainfall_mm', 'rainfall_lag_1', 'rainfall_lag_2'
    ],
    "Subset_B_Rainfall_Temporal": [
        'rainfall_mm', 'rainfall_lag_1', 'rainfall_lag_2',
        'rolling_3_month_rainfall', 'month_sin', 'month_cos'
    ],
    "Subset_C_Rainfall_Extremes": [
        'rainfall_mm', 'rainfall_lag_1', 'rainfall_lag_2',
        'rainfall_zscore', 'historical_extreme_count', 'monsoon_cumulative_rainfall'
    ],
    "Subset_D_Full_Risk_Set": [
        'rainfall_mm', 'rainfall_lag_1', 'rainfall_lag_2',
        'rolling_3_month_rainfall', 'monsoon_cumulative_rainfall',
        'rainfall_zscore', 'historical_extreme_count', 'month_sin', 'month_cos', 'is_monsoon'
    ]
}

def run_ablation_experiments():
    print("=== Running Feature Ablation Experiment ===")
    if not DISTRICT_TIME_CSV.exists():
        from bigdata.spark.district_time_features import build_district_time_dataset
        df_master = build_district_time_dataset()
    else:
        df_master = pd.read_csv(DISTRICT_TIME_CSV)
        
    df_train, df_val, df_test = temporal_train_val_test_split(df_master)
    
    ablation_results = []
    
    for name, cols in ABLATION_SUBSETS.items():
        X_train, y_train = df_train[cols], df_train[TARGET_COL]
        X_test, y_test = df_test[cols], df_test[TARGET_COL]
        
        rf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, class_weight='balanced_subsample')
        rf.fit(X_train, y_train)
        
        y_pred = rf.predict(X_test)
        y_prob = rf.predict_proba(X_test)[:, 1]
        
        metrics = evaluate_classifier(y_test, y_pred, y_prob, name)
        metrics['num_features'] = len(cols)
        metrics['features_used'] = ", ".join(cols)
        ablation_results.append(metrics)
        
    df_ablation = pd.DataFrame(ablation_results)
    output_path = RESULTS_DIR / "ablation_results.csv"
    df_ablation.to_csv(output_path, index=False)
    
    print(f"[ablation] Feature Ablation complete. Saved to: {output_path}")
    print("\n=== Ablation Results Summary (Test Set 2006-2015) ===")
    print(df_ablation[['model_name', 'num_features', 'accuracy', 'macro_precision', 'macro_recall', 'macro_f1', 'roc_auc', 'pr_auc']].to_string(index=False))
    return df_ablation

if __name__ == "__main__":
    run_ablation_experiments()
