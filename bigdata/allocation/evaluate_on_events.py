"""Replay held-out historical flood events against each pre-positioning strategy.

Metrics (paper Table: strategy comparison):
  realized_unmet_units  sum of unmet demand over holdout events (> SPLIT_VAL_END)
  unmet_per_event       mean unmet per event
  precision@5 / recall@5  does the strategy's top-5 priority list contain the
                        districts actually hit?
  unmet_ratio_vs_uniform  relative performance (1.0 = no better than uniform)

Outputs: results/allocation_evaluation.csv, results/validation_summary.json
(the dashboard reads the validation summary).
"""
import sys

import _bootstrap  # noqa: F401
import numpy as np
import pandas as pd

from common.aliases import canonical_district
from common.io import read_csv, save_csv, save_json

from config import (
    ALLOCATION_RESULTS_CSV,
    ALLOCATION_UNIT_POP_COVERED,
    FLOOD_EVENTS_CSV,
    RANKING_METRICS_JSON,
    RESULTS_DIR,
    SPLIT_VAL_END,
    STATIC_DEFS_CSV,
    TRANSFER_FRACTION,
    UNAFFECTED_DEMAND_RATE,
    VALIDATION_SUMMARY_JSON,
)

NEIGHBOUR_DEG = 1.2
TOP_K = 5


def load_events() -> pd.DataFrame:
    ev = read_csv(FLOOD_EVENTS_CSV)
    ev["district"] = ev["district"].map(canonical_district)
    ev["date_start"] = pd.to_datetime(ev["date_start"], errors="coerce")
    ev = ev.dropna(subset=["district", "date_start"])
    return ev[ev["date_start"].dt.year > SPLIT_VAL_END]


def demand_vector(group: pd.DataFrame, populations: pd.Series,
                  districts: pd.Index) -> np.ndarray:
    need = pd.Series(0.0, index=districts)
    for _, ev in group.iterrows():
        d = ev["district"]
        if d not in need.index:
            continue
        affected = ev.get("affected")
        base = (
            float(affected)
            if affected is not None and pd.notna(affected) and affected > 0
            else UNAFFECTED_DEMAND_RATE * float(populations.get(d, 0.0))
        )
        need[d] += base / ALLOCATION_UNIT_POP_COVERED
    return need.to_numpy()


def main() -> int:
    stocks = read_csv(ALLOCATION_RESULTS_CSV).set_index("district")
    districts = stocks.index
    static = read_csv(STATIC_DEFS_CSV)[["district", "population"]] \
        .drop_duplicates("district").set_index("district")
    populations = static.reindex(districts)["population"].fillna(0.0)

    strategy_cols = [c for c in stocks.columns if c != "district"]
    events = load_events()
    if events.empty:
        print("[eval] no holdout events — nothing to evaluate")
        return 1

    # neighbour support matrix from centroid distances
    from config import DISTRICT_CENTROIDS_CSV

    cent = read_csv(DISTRICT_CENTROIDS_CSV).set_index("district").reindex(districts)
    lat, lon = cent["lat"].to_numpy(), cent["lon"].to_numpy()
    d = np.sqrt(
        (lat[:, None] - lat[None, :]) ** 2
        + ((lon[:, None] - lon[None, :]) * np.cos(np.radians(lat[:, None]))) ** 2
    )
    neighbours = (d <= NEIGHBOUR_DEG).astype(float)

    per_strategy = {c: 0.0 for c in strategy_cols}
    per_event_rows = []
    precision = {c: [] for c in strategy_cols}
    recall = {c: [] for c in strategy_cols}

    for start, group in events.groupby("date_start"):
        need = demand_vector(group, populations, districts)
        hit_districts = set(group["district"])
        for c in strategy_cols:
            x = stocks[c].to_numpy(dtype=float)
            support = x[None, :] + TRANSFER_FRACTION * (x[None, :] @ neighbours.T)
            unmet = float(np.clip(need - support, 0, None).sum())
            per_strategy[c] += unmet
            # ranking quality: stock size as the strategy's priority score
            order = np.argsort(-x)
            topk = set(districts[order[:TOP_K]])
            hits = len(topk & hit_districts)
            precision[c].append(hits / TOP_K)
            recall[c].append(hits / len(hit_districts))
        per_event_rows.append(
            {"date": str(start.date()), "n_districts_hit": len(hit_districts),
             **{f"unmet_{c}": float(np.clip(
                 need - (stocks[c].to_numpy(float)[None, :]
                         + TRANSFER_FRACTION * (stocks[c].to_numpy(float)[None, :] @ neighbours.T)),
                 0, None).sum()) for c in strategy_cols}}
        )

    rows = []
    baseline = per_strategy.get("uniform", 0.0)
    for c in strategy_cols:
        rows.append(
            {
                "strategy": c,
                "realized_unmet_units": round(per_strategy[c], 2),
                "unmet_per_event": round(per_strategy[c] / len(per_event_rows), 3),
                "unmet_ratio_vs_uniform": round(
                    per_strategy[c] / baseline if baseline > 0 else float("nan"), 3
                ),
                f"precision@{TOP_K}": round(float(np.mean(precision[c])), 3),
                f"recall@{TOP_K}": round(float(np.mean(recall[c])), 3),
            }
        )
    out = pd.DataFrame(rows).sort_values("realized_unmet_units")
    save_csv(out, RESULTS_DIR / "allocation_evaluation.csv")
    save_csv(pd.DataFrame(per_event_rows), RESULTS_DIR / "allocation_per_event.csv")

    summary = {"holdout_events": len(per_event_rows), "strategies": rows}
    if RANKING_METRICS_JSON.exists():
        summary["ranking"] = read_json_safe(RANKING_METRICS_JSON)
    save_json(summary, VALIDATION_SUMMARY_JSON)
    print(out.to_string(index=False))
    print(f"[eval] summary -> {VALIDATION_SUMMARY_JSON.name}")
    return 0


def read_json_safe(path) -> dict:
    try:
        import json

        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


if __name__ == "__main__":
    sys.exit(main())
