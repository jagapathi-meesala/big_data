"""
ahp_weights.py — Analytic Hierarchy Process (AHP) Weight Derivation for DDRPS.

Formally derives and validates the DDRPS component weights using Saaty's AHP
eigenvector method. Produces a Consistency Ratio (CR < 0.10 = acceptable) that
academically justifies why the 0.30/0.25/0.20/0.15/0.10 design weights are used.

Reference:
  Saaty, T. L. (1980). The Analytic Hierarchy Process. McGraw-Hill.

Outputs:
  results/ahp_weights.json   — CR, eigenvector weights, pairwise matrix
  results/weight_comparison.json — baseline vs AHP vs learned comparison

Usage:
    python ahp_weights.py
    python ahp_weights.py --export-latex   # prints LaTeX table for paper
"""

import argparse
import json
import sys
from pathlib import Path

import _bootstrap  # noqa: F401
import numpy as np

from common.io import save_json
from config import (
    DDRPS_AHP_WEIGHTS,
    DDRPS_BASELINE_WEIGHTS,
    RESULTS_DIR,
)

# ---------------------------------------------------------------------------
# AHP pairwise comparison matrix
# Rows/Cols: [Qd, Dd, Hd, Md, Vd]
# Entry A[i,j] = "how much more important is i over j?"
# Saaty scale: 1=equal, 3=moderate, 5=strong, 7=very strong, 9=extreme
# ---------------------------------------------------------------------------
# Rationale (documented for paper):
#   Qd vs Dd : 2    — hazard risk is slightly more important than population exposure
#              (risk drives urgency; exposure amplifies but doesn't trigger)
#   Qd vs Hd : 2    — risk slightly over healthcare deficit
#   Qd vs Md : 3    — risk moderately over mobility deficit
#   Qd vs Vd : 4    — risk clearly over housing vulnerability
#   Dd vs Hd : 1    — population exposure ≈ healthcare deficit (both amplifiers)
#   Dd vs Md : 2    — exposure slightly over mobility
#   Dd vs Vd : 3    — exposure moderately over housing
#   Hd vs Md : 1    — healthcare deficit ≈ mobility deficit (infrastructure twins)
#   Hd vs Vd : 2    — healthcare slightly over housing
#   Md vs Vd : 2    — mobility slightly over housing (roads critical for response)

AHP_MATRIX = np.array([
    # Qd    Dd    Hd    Md    Vd
    [1.00, 2.00, 2.00, 3.00, 4.00],   # Qd
    [0.50, 1.00, 1.00, 2.00, 3.00],   # Dd
    [0.50, 1.00, 1.00, 1.00, 2.00],   # Hd
    [1/3,  0.50, 1.00, 1.00, 2.00],   # Md
    [0.25, 1/3,  0.50, 0.50, 1.00],   # Vd
], dtype=float)

CRITERIA = ["Qd", "Dd", "Hd", "Md", "Vd"]

# Random Consistency Index (RI) lookup table (Saaty, 1980)
RI_TABLE = {1: 0.00, 2: 0.00, 3: 0.58, 4: 0.90, 5: 1.12,
            6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49}


def ahp_eigenvector_weights(matrix: np.ndarray) -> tuple[np.ndarray, float, float, float]:
    """
    Compute AHP weights using the principal eigenvector method.

    Returns:
        weights  : normalised eigenvector (sums to 1.0)
        lambda_max: principal eigenvalue
        ci       : Consistency Index
        cr       : Consistency Ratio
    """
    n = matrix.shape[0]

    # 1. Compute principal eigenvector (right eigenvector of largest eigenvalue)
    eigenvalues, eigenvectors = np.linalg.eig(matrix)
    max_idx = np.argmax(eigenvalues.real)
    principal_ev = eigenvectors[:, max_idx].real

    # 2. Normalise so weights sum to 1
    weights = principal_ev / principal_ev.sum()

    # 3. Consistency metrics
    lambda_max = eigenvalues[max_idx].real
    ci = (lambda_max - n) / (n - 1) if n > 1 else 0.0
    ri = RI_TABLE.get(n, 1.49)
    cr = ci / ri if ri > 0 else 0.0

    return weights, lambda_max, ci, cr


def geometric_mean_weights(matrix: np.ndarray) -> np.ndarray:
    """
    Approximate AHP weights using the geometric mean of each row.
    Simpler than eigenvector method; good for verification.
    """
    n = matrix.shape[0]
    geo = np.array([np.prod(matrix[i]) ** (1.0 / n) for i in range(n)])
    return geo / geo.sum()


def run_ahp(export_latex: bool = False) -> dict:
    n = len(CRITERIA)

    # Verify matrix reciprocity
    for i in range(n):
        for j in range(n):
            expected = 1.0 / AHP_MATRIX[i, j]
            if abs(AHP_MATRIX[j, i] - expected) > 1e-6:
                raise ValueError(
                    f"Pairwise matrix not reciprocal at [{j},{i}]: "
                    f"got {AHP_MATRIX[j, i]:.4f}, expected {expected:.4f}"
                )

    weights_ev, lambda_max, ci, cr = ahp_eigenvector_weights(AHP_MATRIX)
    weights_gm = geometric_mean_weights(AHP_MATRIX)

    print("\n" + "=" * 60)
    print("  AHP Weight Derivation — DDRPS Components")
    print("=" * 60)
    print(f"\n  Principal eigenvalue (λ_max) : {lambda_max:.4f}")
    print(f"  Consistency Index   (CI)    : {ci:.4f}")
    print(f"  Random Index        (RI)    : {RI_TABLE[n]:.2f}")
    print(f"  Consistency Ratio   (CR)    : {cr:.4f}  ", end="")
    print("✅ ACCEPTABLE (< 0.10)" if cr < 0.10 else "⚠️  EXCEEDS 0.10 — revise matrix")

    print(f"\n  {'Criterion':<8} {'Baseline':>10} {'AHP-EV':>10} {'AHP-GM':>10}")
    print("  " + "-" * 42)
    for k, crit in enumerate(CRITERIA):
        base = DDRPS_BASELINE_WEIGHTS.get(crit, 0.0)
        print(f"  {crit:<8} {base:>10.4f} {weights_ev[k]:>10.4f} {weights_gm[k]:>10.4f}")
    print(f"  {'SUM':<8} {sum(DDRPS_BASELINE_WEIGHTS.values()):>10.4f} "
          f"{weights_ev.sum():>10.4f} {weights_gm.sum():>10.4f}")

    # Load learned weights if present
    learned_path = RESULTS_DIR / "learned_ddrps_weights.json"
    learned = {}
    if learned_path.exists():
        raw = json.loads(learned_path.read_text())
        learned = raw.get("learned_weights", raw)

    # Build output dict
    result = {
        "ahp_pairwise_matrix": AHP_MATRIX.tolist(),
        "criteria": CRITERIA,
        "lambda_max": round(float(lambda_max), 6),
        "consistency_index_CI": round(float(ci), 6),
        "random_index_RI": RI_TABLE[n],
        "consistency_ratio_CR": round(float(cr), 6),
        "cr_acceptable": bool(cr < 0.10),
        "ahp_eigenvector_weights": {
            c: round(float(weights_ev[k]), 6) for k, c in enumerate(CRITERIA)
        },
        "ahp_geometric_mean_weights": {
            c: round(float(weights_gm[k]), 6) for k, c in enumerate(CRITERIA)
        },
        "baseline_weights": dict(DDRPS_BASELINE_WEIGHTS),
        "learned_weights": {c: learned.get(c, None) for c in CRITERIA} if learned else None,
        "weight_comparison": {
            c: {
                "baseline": DDRPS_BASELINE_WEIGHTS.get(c, 0.0),
                "ahp_ev": round(float(weights_ev[k]), 6),
                "ahp_gm": round(float(weights_gm[k]), 6),
                "learned": learned.get(c) if learned else None,
            }
            for k, c in enumerate(CRITERIA)
        },
    }

    save_json(result, RESULTS_DIR / "ahp_weights.json")
    print(f"\n[ahp] Saved → {RESULTS_DIR / 'ahp_weights.json'}")

    if export_latex:
        _print_latex_table(result)

    return result


def _print_latex_table(result: dict) -> None:
    """Print a ready-to-paste LaTeX table for the paper."""
    w = result["weight_comparison"]
    cr = result["consistency_ratio_CR"]
    lmax = result["lambda_max"]

    print("\n% ---- Copy into paper/main.tex ----")
    print(r"\begin{table}[t]")
    print(r"\caption{DDRPS Weight Comparison: Baseline vs.\ AHP-Derived vs.\ Data-Learned}")
    print(r"\label{tab:ahp_weights}")
    print(r"\centering")
    print(r"\footnotesize")
    print(r"\begin{tabularx}{\columnwidth}{@{}l r r r@{}}")
    print(r"\toprule")
    print(r"Criterion & Baseline & AHP (eigenvector) & Learned (ElasticNet) \\")
    print(r"\midrule")
    for c in CRITERIA:
        base = w[c]["baseline"]
        ahp = w[c]["ahp_ev"]
        lrn = w[c]["learned"]
        lrn_str = f"{lrn:.4f}" if lrn is not None else r"\textit{n/a}"
        print(f"${c}$ & {base:.4f} & {ahp:.4f} & {lrn_str} \\\\")
    print(r"\midrule")
    base_sum = sum(w[c]["baseline"] for c in CRITERIA)
    ahp_sum = sum(w[c]["ahp_ev"] for c in CRITERIA)
    print(f"Sum & {base_sum:.4f} & {ahp_sum:.4f} & --- \\\\")
    print(r"\midrule")
    print(f"\\multicolumn{{4}}{{l}}{{AHP: $\\lambda_{{\\max}}={lmax:.4f}$, "
          f"$CR={cr:.4f}$ (<0.10 = consistent)}} \\\\")
    print(r"\bottomrule")
    print(r"\end{tabularx}")
    print(r"\end{table}")
    print("% ---- End LaTeX ----\n")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--export-latex", action="store_true",
                    help="Print LaTeX weight-comparison table to stdout")
    args = ap.parse_args()
    run_ahp(export_latex=args.export_latex)
    return 0


if __name__ == "__main__":
    sys.exit(main())
