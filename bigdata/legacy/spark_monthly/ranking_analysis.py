import os
import sys
import pandas as pd
import numpy as np
import json
from pathlib import Path
from scipy.stats import spearmanr

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from bigdata.config import (
    RESULTS_DIR
)
from bigdata.spark.ddrps import run_ddrps_pipeline

def run_ranking_analysis():
    """
    Executes Risk vs Response Priority Ranking Comparison Experiment (Task Requirement #13).
    Demonstrates mathematically that Hazard Risk (Qd) != Emergency Response Priority (DDRPS).
    """
    print("=== Running Risk vs Response Priority Ranking Experiment ===")
    pred_path = RESULTS_DIR / "ddrps_priorities.csv"
    if not pred_path.exists():
        df_snapshot = run_ddrps_pipeline()
    else:
        df_snapshot = pd.read_csv(pred_path)
        
    # Ensure rank columns exist
    df_snapshot['risk_rank'] = df_snapshot['Qd'].rank(ascending=False, method='min').astype(int)
    df_snapshot['priority_rank'] = df_snapshot['ddrps'].rank(ascending=False, method='min').astype(int)
    df_snapshot['rank_change'] = df_snapshot['risk_rank'] - df_snapshot['priority_rank']
    df_snapshot['abs_rank_change'] = df_snapshot['rank_change'].abs()
    
    # 1. Spearman Rank Correlation
    rho, p_val = spearmanr(df_snapshot['risk_rank'], df_snapshot['priority_rank'])
    
    # 2. Mean Absolute Rank Change (MARC)
    marc = float(df_snapshot['abs_rank_change'].mean())
    max_rank_change = int(df_snapshot['abs_rank_change'].max())
    
    # 3. Top-5 Overlap Percentage
    top_5_risk = set(df_snapshot.sort_values('risk_rank')['district'].head(5))
    top_5_ddrps = set(df_snapshot.sort_values('priority_rank')['district'].head(5))
    overlap_districts = list(top_5_risk.intersection(top_5_ddrps))
    top_5_overlap_pct = (len(overlap_districts) / 5.0) * 100.0
    
    ranking_metrics = {
        "forecast_period": str(df_snapshot['forecast_period'].iloc[0]) if 'forecast_period' in df_snapshot.columns else "N/A",
        "num_districts_evaluated": len(df_snapshot),
        "spearman_correlation_rho": round(float(rho), 4),
        "spearman_p_value": float(p_val),
        "mean_absolute_rank_change_MARC": round(marc, 2),
        "max_district_rank_change": max_rank_change,
        "top_5_hazard_risk_districts": list(top_5_risk),
        "top_5_response_priority_districts": list(top_5_ddrps),
        "top_5_overlap_districts": overlap_districts,
        "top_5_overlap_percentage": round(top_5_overlap_pct, 2)
    }
    
    out_csv = RESULTS_DIR / "ranking_comparison.csv"
    df_snapshot[['district', 'subdivision', 'Qd', 'risk_rank', 'ddrps', 'priority_rank', 'rank_change', 'priority_category']].to_csv(out_csv, index=False)
    
    out_json = RESULTS_DIR / "ranking_metrics.json"
    with open(out_json, "w") as fp:
        json.dump(ranking_metrics, fp, indent=2)
        
    print(f"[ranking_analysis] Ranking Analysis complete. Output saved to: {out_csv}")
    print(f"[ranking_analysis] Key Findings:")
    print(f"  - Spearman Rank Correlation (rho): {rho:.4f} (p-val: {p_val:.4e})")
    print(f"  - Mean Absolute Rank Change (MARC): {marc:.2f} rank positions")
    print(f"  - Max Individual District Rank Change: {max_rank_change} positions")
    print(f"  - Top-5 District Overlap: {top_5_overlap_pct:.1f}% ({len(overlap_districts)}/5 districts match)")
    print("\n=== Ranking Comparison Summary ===")
    print(df_snapshot[['district', 'subdivision', 'Qd', 'risk_rank', 'ddrps', 'priority_rank', 'rank_change', 'priority_category']].head(10).to_string(index=False))
    return df_snapshot, ranking_metrics

if __name__ == "__main__":
    run_ranking_analysis()
