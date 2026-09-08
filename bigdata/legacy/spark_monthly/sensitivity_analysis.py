import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path
from scipy.stats import spearmanr

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from bigdata.config import (
    RESULTS_DIR
)
from bigdata.spark.ddrps import calculate_ddrps_priorities, run_ddrps_pipeline

SENSITIVITY_CONFIGS = {
    "Baseline": {
        "Qd": 0.30, "Dd": 0.25, "Hd": 0.20, "Md": 0.15, "Vd": 0.10
    },
    "Risk_Dominant": {
        "Qd": 0.50, "Dd": 0.20, "Hd": 0.15, "Md": 0.10, "Vd": 0.05
    },
    "Exposure_Dominant": {
        "Qd": 0.20, "Dd": 0.45, "Hd": 0.15, "Md": 0.10, "Vd": 0.10
    },
    "Capacity_Dominant": {
        "Qd": 0.20, "Dd": 0.20, "Hd": 0.35, "Md": 0.15, "Vd": 0.10
    }
}

def run_sensitivity_analysis():
    print("=== Running DDRPS Weight Sensitivity Analysis ===")
    pred_path = RESULTS_DIR / "risk_predictions.csv"
    if not pred_path.exists():
        df_preds = run_ddrps_pipeline()
    else:
        df_preds = pd.read_csv(pred_path)
        
    # 1. Compute Baseline Priority Ranks
    _, df_base_snap = calculate_ddrps_priorities(df_preds, weights=SENSITIVITY_CONFIGS["Baseline"])
    base_ranks = df_base_snap.set_index('district')['priority_rank'].to_dict()
    base_top5 = set(df_base_snap.sort_values('priority_rank')['district'].head(5))
    
    sensitivity_results = []
    
    for cfg_name, w_dict in SENSITIVITY_CONFIGS.items():
        _, df_cfg_snap = calculate_ddrps_priorities(df_preds, weights=w_dict)
        cfg_ranks = df_cfg_snap.set_index('district')['priority_rank'].to_dict()
        cfg_top5 = set(df_cfg_snap.sort_values('priority_rank')['district'].head(5))
        
        # Calculate Rank Differences vs Baseline
        rank_diffs = [abs(cfg_ranks[d] - base_ranks[d]) for d in base_ranks if d in cfg_ranks]
        marc = float(np.mean(rank_diffs))
        
        # Spearman correlation vs Baseline
        base_list = [base_ranks[d] for d in base_ranks if d in cfg_ranks]
        cfg_list = [cfg_ranks[d] for d in base_ranks if d in cfg_ranks]
        rho, _ = spearmanr(base_list, cfg_list)
        
        # Top-5 Overlap
        overlap_cnt = len(base_top5.intersection(cfg_top5))
        overlap_pct = (overlap_cnt / 5.0) * 100.0
        
        res = {
            "weight_configuration": cfg_name,
            "weights_Qd_Dd_Hd_Md_Vd": f"{w_dict['Qd']:.2f}/{w_dict['Dd']:.2f}/{w_dict['Hd']:.2f}/{w_dict['Md']:.2f}/{w_dict['Vd']:.2f}",
            "spearman_correlation_rho": round(float(rho), 4),
            "mean_absolute_rank_change_MARC": round(marc, 2),
            "top_5_overlap_percentage": round(overlap_pct, 1),
            "top_5_districts": ", ".join(list(cfg_top5))
        }
        sensitivity_results.append(res)
        
    df_sens = pd.DataFrame(sensitivity_results)
    out_csv = RESULTS_DIR / "sensitivity_results.csv"
    df_sens.to_csv(out_csv, index=False)
    
    print(f"[sensitivity] Sensitivity Analysis complete. Output saved to: {out_csv}")
    print("\n=== Sensitivity Analysis Summary ===")
    print(df_sens[['weight_configuration', 'weights_Qd_Dd_Hd_Md_Vd', 'spearman_correlation_rho', 'mean_absolute_rank_change_MARC', 'top_5_overlap_percentage']].to_string(index=False))
    return df_sens

if __name__ == "__main__":
    run_sensitivity_analysis()
