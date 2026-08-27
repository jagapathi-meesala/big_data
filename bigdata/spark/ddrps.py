import os
import sys
import pandas as pd
import numpy as np
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from bigdata.config import (
    RESULTS_DIR,
    DDRPS_WEIGHTS
)

def min_max_normalize(series: pd.Series) -> pd.Series:
    s_min, s_max = series.min(), series.max()
    if s_max == s_min:
        return pd.Series(0.5, index=series.index)
    return (series - s_min) / (s_max - s_min)

def calculate_ddrps_priorities(df_predictions: pd.DataFrame, weights: dict = None, forecast_period: str = None) -> pd.DataFrame:
    """
    Computes Distributed Disaster Resource Provisioning System (DDRPS) Priority Score:
    DDRPS_d = 0.30 * Qd + 0.25 * Dd + 0.20 * Hd + 0.15 * Md + 0.10 * Vd
    
    RESEARCH PIPELINE SPECIFICATION:
    - Qd: Predicted Extreme Precipitation Risk Probability in [0, 1]
    - Dd: Population Exposure Deficit
    - Hd: Healthcare Capacity Deficit
    - Md: Mobility Access Deficit (Household transport access proxy)
    - Vd: Housing Vulnerability (Dilapidated dwellings structural vulnerability proxy)
    
    Decision Snapshot (Requirement #9):
    Extracts a specific forecast_period snapshot (e.g. 2015-09) to compute 1..N priority ranks
    for operational decision making, keeping it distinct from historical analytical time series.
    """
    if weights is None:
        weights = DDRPS_WEIGHTS
        
    df = df_predictions.copy()
    
    # 1. Normalize sub-scores across district decision population
    df['Qd'] = np.clip(df['Qd'], 0.0, 1.0)
    df['Dd'] = min_max_normalize(df['exposure_deficit_Dd'])
    df['Hd'] = min_max_normalize(df['healthcare_deficit_Hd'])
    df['Md'] = min_max_normalize(df['mobility_access_deficit_Md'])
    df['Vd'] = min_max_normalize(df['housing_vulnerability_Vd'])
    
    # Backward compatibility aliases
    df['Rd'] = df['Md']
    df['Sd'] = df['Vd']
    
    # 2. Mathematical Weighted DDRPS Calculation
    w_q = weights.get('Qd', 0.30)
    w_d = weights.get('Dd', 0.25)
    w_h = weights.get('Hd', 0.20)
    w_m = weights.get('Md', weights.get('Rd', 0.15))
    w_v = weights.get('Vd', weights.get('Sd', 0.10))
    
    df['ddrps'] = (
        w_q * df['Qd'] +
        w_d * df['Dd'] +
        w_h * df['Hd'] +
        w_m * df['Md'] +
        w_v * df['Vd']
    )
    df['ddrps'] = np.clip(df['ddrps'], 0.0, 1.0)
    
    # 3. Factor Contribution Percentage Breakdown
    df['risk_contribution'] = (w_q * df['Qd']) / (df['ddrps'] + 1e-8)
    df['exposure_contribution'] = (w_d * df['Dd']) / (df['ddrps'] + 1e-8)
    df['healthcare_contribution'] = (w_h * df['Hd']) / (df['ddrps'] + 1e-8)
    df['mobility_contribution'] = (w_m * df['Md']) / (df['ddrps'] + 1e-8)
    df['housing_contribution'] = (w_v * df['Vd']) / (df['ddrps'] + 1e-8)
    
    # Backward compatibility contribution aliases
    df['population_contribution'] = df['exposure_contribution']
    df['road_contribution'] = df['mobility_contribution']
    df['shelter_contribution'] = df['housing_contribution']
    
    # Priority Category Assignment
    def categorize_priority(score):
        if score >= 0.70:
            return 'PRIORITY_1_CRITICAL'
        elif score >= 0.50:
            return 'PRIORITY_2_HIGH'
        elif score >= 0.30:
            return 'PRIORITY_3_MEDIUM'
        else:
            return 'PRIORITY_4_LOW'
            
    df['priority_category'] = df['ddrps'].apply(categorize_priority)
    
    # 4. DECISION SNAPSHOT EXTRACTION (Requirement #9)
    if forecast_period is None:
        # Default to latest peak monsoon date in dataset
        if 'date' in df.columns:
            forecast_period = df[df['date'].str.endswith('-09')]['date'].max()
            if pd.isna(forecast_period):
                forecast_period = df['date'].max()
        else:
            forecast_period = "LATEST_PERIOD"
            
    # Extract decision snapshot dataframe
    if 'date' in df.columns and forecast_period != "LATEST_PERIOD":
        df_snapshot = df[df['date'] == forecast_period].copy()
        if len(df_snapshot) == 0:
            df_snapshot = df.groupby('district').last().reset_index()
    else:
        df_snapshot = df.groupby('district').last().reset_index()
        
    df_snapshot['forecast_period'] = forecast_period
    
    # Rank ordering 1..N strictly across snapshot districts
    df_snapshot['priority_rank'] = df_snapshot['ddrps'].rank(ascending=False, method='min').astype(int)
    df_snapshot['risk_rank'] = df_snapshot['Qd'].rank(ascending=False, method='min').astype(int)
    df_snapshot['rank_change'] = df_snapshot['risk_rank'] - df_snapshot['priority_rank']
    
    df_snapshot = df_snapshot.sort_values('priority_rank').reset_index(drop=True)
    return df, df_snapshot

def run_ddrps_pipeline():
    print("=== Running DDRPS Mathematical Prioritization Solver ===")
    pred_path = RESULTS_DIR / "risk_predictions.csv"
    if not pred_path.exists():
        from bigdata.spark.risk_model import train_temporal_risk_model
        _, df_preds = train_temporal_risk_model()
    else:
        df_preds = pd.read_csv(pred_path)
        
    df_full, df_snapshot = calculate_ddrps_priorities(df_preds)
    
    output_full_path = RESULTS_DIR / "ddrps_historical_analytical.csv"
    output_snapshot_path = RESULTS_DIR / "ddrps_priorities.csv"
    
    df_full.to_csv(output_full_path, index=False)
    
    snapshot_cols = [
        'district', 'subdivision', 'forecast_period', 'Qd', 'Dd', 'Hd', 'Md', 'Vd', 
        'ddrps', 'priority_rank', 'risk_rank', 'rank_change', 'priority_category'
    ]
    available_cols = [c for c in snapshot_cols if c in df_snapshot.columns]
    df_snapshot[available_cols].to_csv(output_snapshot_path, index=False)
    
    print(f"[ddrps] DDRPS Prioritization complete.")
    print(f"[ddrps] Full Analytical Dataset saved to: {output_full_path}")
    print(f"[ddrps] Decision Snapshot (Period: {df_snapshot['forecast_period'].iloc[0]}) saved to: {output_snapshot_path}")
    print("\n=== Top 10 Operational Decision Snapshot Districts ===")
    print(df_snapshot[available_cols].head(10).to_string(index=False))
    return df_snapshot

if __name__ == "__main__":
    run_ddrps_pipeline()
