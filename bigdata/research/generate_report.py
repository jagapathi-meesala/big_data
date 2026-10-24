"""Generate bigdata/research/REPORT.md from the results directory.

Pulls real numbers from the pipeline's JSON/CSV artifacts — nothing is
hardcoded. Re-run after every pipeline execution.

Usage: python generate_report.py
"""
import sys
from pathlib import Path

import _bootstrap  # noqa: F401
import pandas as pd

from common.io import load_json, read_csv, save_text

from config import (
    CONFORMAL_JSON,
    FIGURES_DIR,
    MODEL_METRICS_CSV,
    RANKING_METRICS_JSON,
    RESULTS_DIR,
    VALIDATION_SUMMARY_JSON,
)

REPORT_PATH = RESULTS_DIR / "REPORT.md"


def _md_table(df: pd.DataFrame) -> str:
    return df.to_markdown(index=False)


def build() -> str:
    lines = [
        "# RADAR pipeline report",
        "",
        f"_Auto-generated {pd.Timestamp.now().isoformat()} — all numbers below come "
        "straight from the result artifacts, nothing is hand-written._",
        "",
    ]

    if MODEL_METRICS_CSV.exists():
        m = read_csv(MODEL_METRICS_CSV)
        lines += ["## 1. Hazard model performance (temporal splits)", "",
                  _md_table(m.round(4)), ""]
    else:
        lines += ["## 1. Hazard model performance", "",
                  "_Run models/train_risk_model.py — no metrics yet._", ""]

    if CONFORMAL_JSON.exists():
        c = load_json(CONFORMAL_JSON)
        rows = [
            {"model": k, "q_cal": round(v["q_cal"], 4),
             "test_coverage": round(v["coverage_test"], 3), "rows": v["rows"]}
            for k, v in c.get("models", {}).items()
        ]
        if rows:
            lines += ["## 2. Conformal calibration (target coverage 0.90)", "",
                      _md_table(pd.DataFrame(rows)), ""]
    else:
        lines += ["## 2. Conformal calibration", "",
                  "_Run models/calibrate_conformal.py._", ""]

    if RANKING_METRICS_JSON.exists():
        r = load_json(RANKING_METRICS_JSON)
        lines += ["## 3. Risk vs response priority (decision snapshot)", ""]
        for scheme, v in r.items():
            if not isinstance(v, dict) or "spearman_rho" not in v:
                continue
            lines += [
                f"**{scheme}** (weights {v.get('weights')})",
                f"- Spearman rho = {v['spearman_rho']} (p={v['spearman_p']})",
                f"- MARC = {v['mean_abs_rank_change']}, max = {v['max_rank_change']}",
                f"- Top-5 overlap = {v['top5_overlap_pct']}%",
                f"- Top-5 risk: {', '.join(v['top5_risk'])}",
                f"- Top-5 priority: {', '.join(v['top5_priority'])}",
                "",
            ]
    else:
        lines += ["## 3. Risk vs response priority", "",
                  "_Run ddrps/score_ddrps.py._", ""]

    if VALIDATION_SUMMARY_JSON.exists():
        v = load_json(VALIDATION_SUMMARY_JSON)
        lines += [f"## 4. Pre-positioning evaluation "
                  f"({v.get('holdout_events', '?')} holdout events)", ""]
        strat = v.get("strategies", [])
        if strat:
            lines += [_md_table(pd.DataFrame(strat)), ""]
    else:
        lines += ["## 4. Pre-positioning evaluation", "",
                  "_Run allocation/optimize_prepositioning.py + "
                  "allocation/evaluate_on_events.py._", ""]

    figs = sorted(p.name for p in FIGURES_DIR.glob("*.png"))
    if figs:
        lines += ["## 5. Figures", ""] + [f"- ![{f}](figures/{f})" for f in figs]

    return "\n".join(lines)


def main() -> int:
    save_text(build(), REPORT_PATH)
    print(f"[report] -> {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
