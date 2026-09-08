"""
weight_learning.py
==================
Learns data-driven DDRPS weights using ElasticNet regression
on a cross-sectional district-level formulation.

WHY NOT TIME-SERIES XGBoost (Previous Attempt)?
------------------------------------------------
The initial XGBoost approach on the monthly time-series failed because
Dd, Hd, Md, Vd are static census values — identical for every month row
of a district. They have zero signal for predicting month-to-month rainfall
fluctuations, so SHAP correctly assigned them ~0 weight, collapsing
everything onto Qd alone (Qd=0.9949).

CORRECT FORMULATION — Cross-Sectional District-Level
-----------------------------------------------------
The DDRPS is a resource allocation priority score, not a rainfall predictor.
The deficit dimensions (Dd, Hd, Md, Vd) capture structural vulnerability —
they affect the *impact* of disasters, not their *occurrence probability*.
The correct scope is district-level:

  - Aggregate 31,741 rows -> 23 district rows
  - Features: mean Qd (avg precipitation risk), Dd, Hd, Md, Vd (static)
  - Target: annual extreme event rate per district (1901-1990 training window)
             normalized to [0,1] — reflects true long-run district vulnerability

  - Model: ElasticNet (L1 sparsity + L2 stability on the 5 DDRPS features)
           Positive-constrained coefficients normalized to sum=1.0 = learned weights

This asks: "Across districts, which combination of precipitation risk
and structural deficits best predicts long-run disaster burden?"
which is exactly what DDRPS weights should encode.
"""

import sys
import json
import warnings
import numpy as np
import pandas as pd
from pathlib import Path

warnings.filterwarnings("ignore")

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from bigdata.config import (
    DISTRICT_TIME_CSV,
    RESULTS_DIR,
    MODELS_DIR,
    DDRPS_WEIGHTS,
)

LEARNED_WEIGHTS_PATH = RESULTS_DIR / "learned_ddrps_weights.json"
COMPARISON_CSV_PATH  = RESULTS_DIR / "ddrps_priorities_learned.csv"

WEIGHT_KEYS = ['Qd', 'Dd', 'Hd', 'Md', 'Vd']

COL_TO_KEY = {
    'mean_Qd':                     'Qd',
    'exposure_deficit_Dd':         'Dd',
    'healthcare_deficit_Hd':       'Hd',
    'mobility_access_deficit_Md':  'Md',
    'housing_vulnerability_Vd':    'Vd',
}

FEATURE_LABELS = {
    'Qd': 'Qd (Precipitation Risk)',
    'Dd': 'Dd (Population Exposure)',
    'Hd': 'Hd (Healthcare Deficit)',
    'Md': 'Md (Mobility Deficit)',
    'Vd': 'Vd (Housing Vulnerability)',
}


def load_master_dataset() -> pd.DataFrame:
    if DISTRICT_TIME_CSV.exists():
        df = pd.read_csv(DISTRICT_TIME_CSV)
        print(f"[weight_learning] Loaded: {len(df):,} district-month rows")
    else:
        from bigdata.spark.district_time_features import build_district_time_dataset
        df = build_district_time_dataset()

    pred_path = RESULTS_DIR / "risk_predictions.csv"
    if 'Qd' not in df.columns and pred_path.exists():
        df_q = pd.read_csv(pred_path, usecols=['district', 'date', 'Qd'])
        df = df.merge(df_q, on=['district', 'date'], how='left')
        df['Qd'] = df['Qd'].fillna(0.5)
    elif 'Qd' not in df.columns:
        df['Qd'] = 0.5
    return df


def build_district_cross_section(df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregate monthly rows -> one row per district.

    Target: normalized long-run annual extreme event rate (training period only,
    1901-1990, to prevent data leakage from the 2006-2015 test window).
    """
    df_train = df[df['YEAR'] <= 1990].copy()
    n_years = 1990 - 1901 + 1

    district_agg = (
        df_train
        .groupby('district')
        .agg(
            mean_Qd                    = ('Qd',                         'mean'),
            exposure_deficit_Dd        = ('exposure_deficit_Dd',        'first'),
            healthcare_deficit_Hd      = ('healthcare_deficit_Hd',      'first'),
            mobility_access_deficit_Md = ('mobility_access_deficit_Md', 'first'),
            housing_vulnerability_Vd   = ('housing_vulnerability_Vd',   'first'),
            total_extreme_events       = ('extreme_precipitation_event', 'sum'),
            subdivision                = ('subdivision',                 'first'),
        )
        .reset_index()
    )

    district_agg['extreme_events_per_year'] = (
        district_agg['total_extreme_events'] / n_years
    )

    t_min = district_agg['extreme_events_per_year'].min()
    t_max = district_agg['extreme_events_per_year'].max()
    if t_max > t_min:
        district_agg['target_normalized'] = (
            (district_agg['extreme_events_per_year'] - t_min) / (t_max - t_min)
        )
    else:
        district_agg['target_normalized'] = 0.5

    print(f"[weight_learning] Cross-section built: {len(district_agg)} districts")
    print(f"[weight_learning] Extreme events/year range: "
          f"{district_agg['extreme_events_per_year'].min():.2f} – "
          f"{district_agg['extreme_events_per_year'].max():.2f}")
    return district_agg


def fit_elasticnet_weights(district_df: pd.DataFrame) -> tuple:
    """
    Fit positive-constrained ElasticNetCV on 23-district cross-section.
    Returns learned weights normalized to sum=1.0.
    """
    from sklearn.linear_model import ElasticNetCV
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.metrics import r2_score

    feature_cols = list(COL_TO_KEY.keys())
    X = district_df[feature_cols].values
    y = district_df['target_normalized'].values

    # MinMax scale features to [0,1] so coefficients are directly comparable
    scaler = MinMaxScaler()
    X_scaled = scaler.fit_transform(X)

    enet = ElasticNetCV(
        l1_ratio=[0.1, 0.3, 0.5, 0.7, 0.9, 0.95, 1.0],
        alphas=np.logspace(-4, 1, 60),
        cv=min(len(district_df), 10),
        max_iter=20000,
        random_state=42,
        positive=True,   # DDRPS constraint: weights must be non-negative
    )
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        enet.fit(X_scaled, y)

    y_pred = enet.predict(X_scaled)
    r2 = float(r2_score(y, y_pred))

    print(f"\n[elasticnet] Best alpha={enet.alpha_:.5f}  "
          f"l1_ratio={enet.l1_ratio_:.2f}  R²={r2:.4f}")
    print(f"[elasticnet] Raw coefs: "
          + "  ".join(f"{k}={v:.4f}" for k, v in zip(feature_cols, enet.coef_)))

    raw_coefs = dict(zip(feature_cols, enet.coef_))
    total = sum(abs(v) for v in raw_coefs.values())

    if total < 1e-10:
        # Fallback: Pearson correlation with target
        print("[elasticnet] Degenerate solution — using Pearson correlation fallback")
        learned = {}
        for col, key in COL_TO_KEY.items():
            corr = abs(float(np.corrcoef(district_df[col].values, y)[0, 1]))
            learned[key] = corr if not np.isnan(corr) else 0.01
        total_c = sum(learned.values()) or 1.0
        learned = {k: round(v / total_c, 6) for k, v in learned.items()}
        return learned, r2, "pearson_correlation_fallback"

    # Apply minimum floor (0.01) so no dimension is completely silenced
    floor = 0.01
    learned_raw = {COL_TO_KEY[col]: abs(v) / total
                   for col, v in raw_coefs.items()}
    floored = {k: max(v, floor) for k, v in learned_raw.items()}
    total_f = sum(floored.values())
    learned = {k: round(v / total_f, 6) for k, v in floored.items()}

    return learned, r2, "elasticnet_cv"


def run_weight_learning():
    print("\n" + "=" * 65)
    print("  ElasticNet Cross-Sectional DDRPS Weight Learning")
    print("=" * 65)

    # 1. Load data and build district cross-section
    df = load_master_dataset()
    district_df = build_district_cross_section(df)

    # 2. Fit ElasticNet
    print("\n[weight_learning] Step 1/3 — Fitting ElasticNet (cross-sectional)...")
    learned_weights, r2, method = fit_elasticnet_weights(district_df)

    # Backward-compat aliases
    learned_weights['Rd'] = learned_weights['Md']
    learned_weights['Sd'] = learned_weights['Vd']

    # 3. Print comparison table
    print("\n" + "-" * 62)
    print(f"  {'Feature':<35} {'Old W':>6}  {'Learned W':>10}  Change")
    print("-" * 62)
    for key in WEIGHT_KEYS:
        label = FEATURE_LABELS[key]
        old_w = DDRPS_WEIGHTS.get(key, 0.0)
        new_w = learned_weights[key]
        delta = new_w - old_w
        if delta > 0.001:
            arrow = f"↑ +{delta:.4f}"
        elif delta < -0.001:
            arrow = f"↓ {delta:.4f}"
        else:
            arrow = "≈ same"
        print(f"  {label:<35} {old_w:>6.4f}  {new_w:>10.6f}  {arrow}")
    print("-" * 62)
    print(f"  {'SUM':<35} "
          f"{sum(DDRPS_WEIGHTS[k] for k in WEIGHT_KEYS):>6.4f}  "
          f"{sum(learned_weights[k] for k in WEIGHT_KEYS):>10.6f}")
    print(f"\n  Method: {method}  |  R² on 23 districts = {r2:.4f}")

    # 4. Save weights JSON
    print(f"\n[weight_learning] Step 2/3 — Saving learned weights...")
    output = {
        "method": method,
        "description": (
            "Cross-sectional ElasticNet (positive-constrained) on 23 districts. "
            "Target = normalized long-run annual extreme event rate (1901-1990). "
            "Coefficients normalized to sum=1.0 as DDRPS weights."
        ),
        "r2_score": round(r2, 4),
        "old_weights":     {k: DDRPS_WEIGHTS.get(k, 0.0) for k in WEIGHT_KEYS},
        "learned_weights": {k: learned_weights[k] for k in WEIGHT_KEYS},
    }
    with open(LEARNED_WEIGHTS_PATH, "w") as f:
        json.dump(output, f, indent=2)
    print(f"[weight_learning] Saved -> {LEARNED_WEIGHTS_PATH}")

    # 5. Recompute DDRPS rankings with learned weights
    print(f"\n[weight_learning] Step 3/3 — Recomputing DDRPS rankings...")
    from bigdata.spark.ddrps import calculate_ddrps_priorities
    df_pred = pd.read_csv(RESULTS_DIR / "risk_predictions.csv")

    _, snap_old = calculate_ddrps_priorities(
        df_pred, weights=DDRPS_WEIGHTS, forecast_period="2015-09"
    )
    _, snap_new = calculate_ddrps_priorities(
        df_pred, weights=learned_weights, forecast_period="2015-09"
    )

    df_compare = snap_old[['district', 'ddrps', 'priority_rank',
                            'priority_category']].copy()
    df_compare.columns = ['district', 'ddrps_old', 'rank_old', 'category_old']
    slim = snap_new[['district', 'ddrps', 'priority_rank',
                     'priority_category']].copy()
    slim.columns = ['district', 'ddrps_new', 'rank_new', 'category_new']
    df_compare = df_compare.merge(slim, on='district', how='outer')
    df_compare['rank_shift'] = df_compare['rank_old'] - df_compare['rank_new']
    df_compare = df_compare.sort_values('rank_new').reset_index(drop=True)
    df_compare.to_csv(COMPARISON_CSV_PATH, index=False)

    # 6. Print top-10 ranking comparison
    print("\n" + "=" * 65)
    print("  TOP 10 DISTRICTS — OLD vs LEARNED WEIGHTS")
    print("=" * 65)
    cols = ['district', 'rank_old', 'ddrps_old', 'rank_new',
            'ddrps_new', 'rank_shift', 'category_new']
    print(df_compare[cols].head(10).to_string(index=False))

    print(f"\n  Full comparison -> {COMPARISON_CSV_PATH}")
    print(f"\n✅  Weight learning complete.")
    print(f"    Old:     DDRPS = 0.30·Qd + 0.25·Dd + 0.20·Hd + 0.15·Md + 0.10·Vd")
    new_fmt = " + ".join(f"{learned_weights[k]:.4f}·{k}" for k in WEIGHT_KEYS)
    print(f"    Learned: DDRPS = {new_fmt}")
    return learned_weights


if __name__ == "__main__":
    run_weight_learning()
