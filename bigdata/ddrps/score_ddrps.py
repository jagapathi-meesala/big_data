"""DDRPS 2.0: Disaster-Deficit Response Priority Scoring + ranking experiments.

Combines calibrated district hazard probabilities (Qd) with static Census-2011
deficits (Dd exposure, Hd healthcare, Md mobility, Vd housing) under three
weight schemes:

  baseline  0.30/0.25/0.20/0.15/0.10  (paper Table I)
  ahp       expert-prior variant     (sensitivity)
  learned   elastic-net weights from the legacy study, if present (comparison)

Also computes the paper's headline experiment on the decision snapshot:
  risk ranking (Qd alone) vs response-priority ranking (DDRPS) — Spearman,
  MARC, top-k overlap — now with genuinely heterogeneous district-level Qd.

Outputs:
  results/ddrps_ranking.csv   one row per district per weight scheme
  results/ranking_metrics.json
"""
import argparse
import sys
from pathlib import Path

import _bootstrap  # noqa: F401
import numpy as np
import pandas as pd

from common.io import read_csv, save_csv, save_json

from config import (
    CALIBRATED_PANEL_DIR,
    DDRPS_AHP_WEIGHTS,
    DDRPS_BASELINE_WEIGHTS,
    LEGACY_DISTRICTS,
    RANKING_METRICS_JSON,
    RESULTS_DIR,
    STATIC_DEFS_CSV,
    SPLIT_VAL_END,
)

LEARNED_WEIGHTS_CANDIDATES = [
    RESULTS_DIR / "learned_ddrps_weights.json",
    Path(__file__).resolve().parents[1] / "results" / "learned_ddrps_weights.json",
]


def latest_risk(calibrated_dir: Path, model: str = "rf") -> pd.DataFrame:
    """Per-district mean calibrated risk over the test period (the decision
    horizon). Uses the chosen model's flood target if present, else extreme."""
    preferred = calibrated_dir / f"flood_{model}.parquet"
    fallback = calibrated_dir / f"extreme_{model}.parquet"
    src = preferred if preferred.exists() else fallback
    if not src.exists():
        raise FileNotFoundError(
            f"no calibrated risk panel ({preferred.name} / {fallback.name}) — "
            "run models/calibrate_conformal.py first"
        )
    df = pd.read_parquet(src)
    df = df[df["model"] == ("flood_rf" if "flood" in src.name else "extreme_rf")]
    if df.empty:
        df = pd.read_parquet(src)
    df = df[df["split"] == "test"]
    snap = (
        df.groupby("district", as_index=False)
        .agg(Qd=("p_cal", "mean"), Qd_upper=("p_upper", "mean"),
             Qd_raw=("p_raw", "mean"))
    )
    return snap


def load_weights(scheme: str) -> dict:
    if scheme == "baseline":
        return dict(DDRPS_BASELINE_WEIGHTS)
    if scheme == "ahp":
        return dict(DDRPS_AHP_WEIGHTS)
    if scheme == "learned":
        for cand in LEARNED_WEIGHTS_CANDIDATES:
            if cand.exists():
                import json

                data = json.loads(cand.read_text(encoding="utf-8"))
                w = data.get("learned_weights", data)
                return {
                    "Qd": float(w.get("Qd", 0.3)),
                    "Dd": float(w.get("Dd", 0.25)),
                    "Hd": float(w.get("Hd", 0.2)),
                    "Md": float(w.get("Md", w.get("Rd", 0.15))),
                    "Vd": float(w.get("Vd", w.get("Sd", 0.1))),
                }
        print("[ddrps] no learned weights file — skipping scheme")
        return {}
    raise ValueError(scheme)


def score(df: pd.DataFrame, weights: dict) -> pd.DataFrame:
    out = df.copy()
    out["ddrps"] = (
        weights["Qd"] * out["Qd"]
        + weights["Dd"] * out["Dd"]
        + weights["Hd"] * out["Hd"]
        + weights["Md"] * out["Md"]
        + weights["Vd"] * out["Vd"]
    )
    return out


def ranking_metrics(scored: pd.DataFrame) -> dict:
    from scipy.stats import spearmanr

    risk_rank = scored["Qd"].rank(ascending=False)
    prio_rank = scored["ddrps"].rank(ascending=False)
    rho, pval = spearmanr(scored["Qd"], scored["ddrps"])
    marc = float((risk_rank - prio_rank).abs().mean())
    max_change = float((risk_rank - prio_rank).abs().max())
    top5_risk = set(scored.nlargest(5, "Qd")["district"])
    top5_prio = set(scored.nlargest(5, "ddrps")["district"])
    return {
        "spearman_rho": round(float(rho), 4),
        "spearman_p": round(float(pval), 6),
        "mean_abs_rank_change": round(marc, 2),
        "max_rank_change": round(max_change, 2),
        "top5_overlap_pct": round(100.0 * len(top5_risk & top5_prio) / 5.0, 1),
        "top5_risk": sorted(top5_risk),
        "top5_priority": sorted(top5_prio),
    }


def category(score: float) -> str:
    if score >= 0.70:
        return "PRIORITY_1_CRITICAL"
    if score >= 0.50:
        return "PRIORITY_2_HIGH"
    if score >= 0.30:
        return "PRIORITY_3_MEDIUM"
    return "PRIORITY_4_LOW"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--model", default="rf", help="rf|gbt|logreg calibrated panel")
    args = ap.parse_args()

    static = read_csv(STATIC_DEFS_CSV)[
        ["district", "Dd", "Hd", "Md", "Vd", "population"]
    ]
    risk = latest_risk(CALIBRATED_PANEL_DIR, args.model)
    base = static.merge(risk, on="district", how="inner")
    if len(base) < len(LEGACY_DISTRICTS):
        print(f"[ddrps] warning: only {len(base)}/23 districts matched "
              "(check canonical names in risk panel)")

    rows = []
    metrics = {}
    for scheme in ("baseline", "ahp", "learned"):
        weights = load_weights(scheme)
        if not weights:
            continue
        scored = score(base, weights)
        scored["scheme"] = scheme
        scored["priority_rank"] = scored["ddrps"].rank(ascending=False).astype(int)
        scored["risk_rank"] = scored["Qd"].rank(ascending=False).astype(int)
        scored["category"] = scored["ddrps"].map(category)
        rows.append(scored)
        metrics[scheme] = {
            "weights": weights,
            **ranking_metrics(scored),
        }
        print(f"[ddrps] {scheme}: rho={metrics[scheme]['spearman_rho']} "
              f"MARC={metrics[scheme]['mean_abs_rank_change']} "
              f"top5-overlap={metrics[scheme]['top5_overlap_pct']}%")

    out = pd.concat(rows, ignore_index=True)
    cols = ["district", "scheme", "Qd", "Qd_upper", "Dd", "Hd", "Md", "Vd",
            "ddrps", "risk_rank", "priority_rank", "category", "population"]
    save_csv(out[cols].sort_values(["scheme", "priority_rank"]), DDRPS_RANKING_CSV)
    metrics["decision_window"] = f"test period (years > {SPLIT_VAL_END})"
    save_json(metrics, RANKING_METRICS_JSON)
    print(f"[ddrps] saved {DDRPS_RANKING_CSV.name} + {RANKING_METRICS_JSON.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
