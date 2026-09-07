"""Uncertainty-aware resource pre-positioning (the paper's core experiment).

Decision: allocate B relief units across the 23 legacy districts BEFORE the
flood season. Each strategy is a district->units stock vector:

  uniform    B spread evenly
  risk_only  proportional to calibrated hazard Qd
  ddrps      proportional to the DDRPS composite score
  conformal  proportional to the conformal UPPER bound Qd_upper
             (risk-averse: hedges district-level model uncertainty)
  oracle     LP-optimal with the TRUE historical event distribution
             (upper bound on achievable performance)

Demand model: units needed = affected population / UNITS_PER_POP_COVERED;
events without an affected count fall back to 2% of district population
(the coefficient is documented in the paper and unit-tested).

Scenario weights come from the fitting window (<= SPLIT_VAL_END); evaluation
on held-out events is done by evaluate_on_events.py.

Usage:
    python optimize_prepositioning.py --budget 200
"""
import argparse
import sys

import _bootstrap  # noqa: F401
import numpy as np
import pandas as pd

from common.aliases import canonical_district
from common.io import read_csv, save_csv, save_json

from config import (
    ALLOCATION_BUDGET_UNITS,
    ALLOCATION_RESULTS_CSV,
    ALLOCATION_STRATEGIES_JSON,
    ALLOCATION_UNIT_POP_COVERED,
    CALIBRATED_PANEL_DIR,
    DDRPS_RANKING_CSV,
    DISTRICT_CENTROIDS_CSV,
    FLOOD_EVENTS_CSV,
    LEGACY_DISTRICTS,
    SPLIT_VAL_END,
    STATIC_DEFS_CSV,
    TRANSFER_FRACTION,
    UNAFFECTED_DEMAND_RATE,
)

NEIGHBOUR_DEG = 1.2   # centroid distance treated as "adjacent"


def load_context() -> pd.DataFrame:
    static = read_csv(STATIC_DEFS_CSV)[["district", "population"]]
    centroids = read_csv(DISTRICT_CENTROIDS_CSV)[["district", "lat", "lon"]]
    ddrps = read_csv(DDRPS_RANKING_CSV)
    ddrps = ddrps[ddrps["scheme"] == "baseline"]

    risk_src = CALIBRATED_PANEL_DIR / "flood_rf.parquet"
    src = risk_src if risk_src.exists() else CALIBRATED_PANEL_DIR / "extreme_rf.parquet"
    risk = pd.read_parquet(src)
    risk = risk[risk["split"] == "test"]
    r = risk.groupby("district", as_index=False).agg(
        Qd=("p_cal", "mean"), Qd_upper=("p_upper", "mean")
    )

    ctx = (
        static.merge(centroids, on="district", how="left")
        .merge(r, on="district", how="left")
        .merge(ddrps[["district", "ddrps"]], on="district", how="left")
        .drop_duplicates("district")
        .set_index("district")
        .reindex(LEGACY_DISTRICTS)
    )
    if ctx[["lat", "lon"]].isna().any().any():
        raise ValueError("missing centroids — run district_grid_map.py first")
    na_risk = ctx[["Qd", "Qd_upper", "ddrps"]].isna().any().any()
    if na_risk:
        print("[alloc] warning: districts missing risk values; filling with mean")
        ctx[["Qd", "Qd_upper", "ddrps"]] = ctx[["Qd", "Qd_upper", "ddrps"]].fillna(
            ctx[["Qd", "Qd_upper", "ddrps"]].mean()
        )
    return ctx


def neighbour_matrix(ctx: pd.DataFrame) -> np.ndarray:
    lat = ctx["lat"].to_numpy()
    lon = ctx["lon"].to_numpy()
    d = np.sqrt(
        (lat[:, None] - lat[None, :]) ** 2
        + ((lon[:, None] - lon[None, :]) * np.cos(np.radians(lat[:, None]))) ** 2
    )
    return (d <= NEIGHBOUR_DEG).astype(float)


# ------------------------------------------------------------- strategies ---
def stock_uniform(n_d: int, budget: int) -> np.ndarray:
    return np.full(n_d, budget / n_d)


def stock_proportional(weights: np.ndarray, budget: int) -> np.ndarray:
    w = np.clip(weights.astype(float), 1e-9, None)
    return budget * w / w.sum()


def scenario_matrix(events: pd.DataFrame, ctx: pd.DataFrame):
    """Rows = distinct event dates, cols = districts, value = units needed."""
    rows, keys = [], []
    for start, group in events.groupby("date_start"):
        need = pd.Series(0.0, index=ctx.index)
        for _, ev in group.iterrows():
            d = ev["district"]
            if d not in need.index:
                continue
            affected = ev.get("affected")
            base = (
                float(affected)
                if affected is not None and pd.notna(affected) and affected > 0
                else UNAFFECTED_DEMAND_RATE * float(ctx.loc[d, "population"])
            )
            need[d] += base / ALLOCATION_UNIT_POP_COVERED
        rows.append(need.to_numpy())
        keys.append(start)
    needs = np.array(rows) if rows else np.zeros((1, len(ctx)))
    freq = np.full(len(rows or [1]), 1.0)
    freq = freq / freq.sum()
    return needs, freq, keys


def unmet_for_stock(x: np.ndarray, needs: np.ndarray, freq: np.ndarray,
                    neighbours: np.ndarray) -> float:
    """Expected unmet demand for a stock vector (includes neighbour transfer)."""
    support = x[None, :] + TRANSFER_FRACTION * (x[None, :] @ neighbours.T)
    shortfall = np.clip(needs - support, 0.0, None)
    return float((shortfall * freq[:, None]).sum())


def lp_optimal_stock(needs: np.ndarray, freq: np.ndarray, neighbours: np.ndarray,
                     budget: int) -> np.ndarray | None:
    """LP: min sum_s p_s * sum_d unmet[s,d]
           s.t. unmet[s,d] >= need[s,d] - x[d] - T * sum_{d'~d} x[d']
                unmet >= 0,  sum_d x[d] <= budget."""
    try:
        import pulp
    except ImportError:
        return None
    n_d, n_s = needs.shape[1], needs.shape[0]
    prob = pulp.LpProblem("preposition", pulp.LpMinimize)
    x = [pulp.LpVariable(f"x_{d}", lowBound=0) for d in range(n_d)]
    unmet = [
        [pulp.LpVariable(f"u_{s}_{d}", lowBound=0) for d in range(n_d)]
        for s in range(n_s)
    ]
    prob += pulp.lpSum(freq[s] * unmet[s][d] for s in range(n_s) for d in range(n_d))
    prob += pulp.lpSum(x) <= budget
    for s in range(n_s):
        for d in range(n_d):
            neighbour_stock = pulp.lpSum(
                x[d2] for d2 in range(n_d) if neighbours[d, d2] > 0 and d2 != d
            )
            prob += unmet[s][d] >= needs[s, d] - x[d] - TRANSFER_FRACTION * neighbour_stock
    prob.solve(pulp.PULP_CBC_CMD(msg=False))
    if pulp.LpStatus[prob.status] != "Optimal":
        return None
    return np.array([v.value() for v in x])


def greedy_stock(needs: np.ndarray, freq: np.ndarray, neighbours: np.ndarray,
                 budget: int) -> np.ndarray:
    """Unit-by-unit greedy: each unit goes to the district with the highest
    marginal expected-unmet reduction."""
    n_d = needs.shape[1]
    x = np.zeros(n_d)
    total = float((needs * freq[:, None]).sum())
    for _ in range(budget):
        best_d, best_gain = -1, 0.0
        for d in range(n_d):
            x[d] += 1
            after = unmet_for_stock(x, needs, freq, neighbours)
            x[d] -= 1
            gain = total - after
            if gain > best_gain + 1e-12:
                best_gain, best_d = gain, d
        if best_d < 0:
            break
        x[best_d] += 1
        total = unmet_for_stock(x, needs, freq, neighbours)
    return x


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--budget", type=int, default=ALLOCATION_BUDGET_UNITS)
    args = ap.parse_args()

    ctx = load_context()
    neighbours = neighbour_matrix(ctx)

    if not FLOOD_EVENTS_CSV.exists():
        print("[alloc] no flood_events.csv — run download_flood_events.py first")
        return 1
    events = read_csv(FLOOD_EVENTS_CSV)
    events["district"] = events["district"].map(canonical_district)
    events["date_start"] = pd.to_datetime(events["date_start"], errors="coerce")
    events = events.dropna(subset=["district", "date_start"])
    events = events[events["date_start"].dt.year > 1977]

    fit_events = events[events["date_start"].dt.year <= SPLIT_VAL_END]
    needs_fit, freq_fit, _ = scenario_matrix(fit_events, ctx)
    print(f"[alloc] fitting scenarios: {needs_fit.shape[0]} events, "
          f"budget={args.budget}")

    strategies = {
        "uniform": stock_uniform(len(ctx), args.budget),
        "risk_only": stock_proportional(ctx["Qd"].to_numpy(), args.budget),
        "ddrps": stock_proportional(ctx["ddrps"].to_numpy(), args.budget),
        "conformal": stock_proportional(ctx["Qd_upper"].to_numpy(), args.budget),
    }
    lp = lp_optimal_stock(needs_fit, freq_fit, neighbours, args.budget)
    if lp is not None:
        strategies["oracle_lp"] = lp
    else:
        print("[alloc] PuLP not installed — using greedy for the oracle column")
        strategies["oracle_greedy"] = greedy_stock(
            needs_fit, freq_fit, neighbours, args.budget
        )

    out = pd.DataFrame(
        {"district": ctx.index,
         **{k: np.round(np.asarray(v, dtype=float), 3) for k, v in strategies.items()}}
    )
    save_csv(out, ALLOCATION_RESULTS_CSV)
    save_json(
        {
            "budget": args.budget,
            "strategies": list(strategies),
            "transfer_fraction": TRANSFER_FRACTION,
            "fit_scenarios": int(needs_fit.shape[0]),
        },
        ALLOCATION_STRATEGIES_JSON,
    )
    for name, x in strategies.items():
        print(f"[alloc] {name:12s} expected unmet (fit): "
              f"{unmet_for_stock(np.asarray(x, float), needs_fit, freq_fit, neighbours):.2f}")
    print(f"[alloc] saved -> {ALLOCATION_RESULTS_CSV.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
