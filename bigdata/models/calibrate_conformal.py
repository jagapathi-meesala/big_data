"""Calibration + split-conformal upper bounds for hazard probabilities.

Input : bigdata/research/results/predictions_<target>.parquet (from training)
Output: bigdata/research/results/risk_panel_calibrated/<target>_<model>.parquet
        bigdata/research/results/conformal_settings.json

Method (documented in the paper):
  * Isotonic regression on the validation split maps raw -> calibrated p.
  * Split conformal on the validation split: nonconformity score
    s_i = y_i - p_i; the finite-sample-corrected (1-alpha) quantile q gives
    the upper predictive bound p_upper = min(1, p_cal + q), i.e. P(y <=
    p_upper) >= 1 - alpha marginally.
  * Empirical coverage is verified on the test split.

This is the module that turns point forecasts into *decision-grade* risk with
distribution-free guarantees — the input to the risk-averse allocator.
"""
import argparse
import sys

import _bootstrap  # noqa: F401
import numpy as np
import pandas as pd

from common.io import save_json

from config import (
    CONFORMAL_ALPHA,
    RESULTS_DIR,
)

CALIBRATED_DIR = RESULTS_DIR / "risk_panel_calibrated"
CONFORMAL_JSON = RESULTS_DIR / "conformal_settings.json"


def isotonic_fit(p_raw: np.ndarray, y: np.ndarray):
    from sklearn.isotonic import IsotonicRegression

    ir = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
    ir.fit(p_raw, y)
    return ir


def conformal_quantile(p: np.ndarray, y: np.ndarray, alpha: float) -> float:
    """Finite-sample conformal quantile of the nonconformity scores y - p."""
    scores = y - p
    n = len(scores)
    if n == 0:
        return 1.0
    q_level = min(1.0, np.ceil((n + 1) * (1 - alpha)) / n)
    return float(np.quantile(scores, q_level))


def empirical_coverage(p_upper: np.ndarray, y: np.ndarray) -> float:
    return float(np.mean(y <= p_upper + 1e-12))


def calibrate_one(df: pd.DataFrame, model: str, alpha: float) -> pd.DataFrame:
    sub = df[df["model"] == model].copy()
    val = sub[sub["split"] == "val"]
    if val.empty:
        raise ValueError(f"no validation rows for model {model}")
    ir = isotonic_fit(val["p_raw"].to_numpy(), val["label"].to_numpy())

    sub["p_cal"] = ir.predict(sub["p_raw"].to_numpy())
    q_raw = conformal_quantile(val["p_raw"].to_numpy(), val["label"].to_numpy(), alpha)
    q_cal = conformal_quantile(val["p_cal"].to_numpy(), val["label"].to_numpy(), alpha)
    sub["p_upper"] = np.clip(sub["p_cal"] + q_cal, 0.0, 1.0)

    test = sub[sub["split"] == "test"]
    cov_val = empirical_coverage(
        np.clip(val["p_raw"].to_numpy() + q_raw, 0, 1), val["label"].to_numpy()
    )
    cov_test = (
        empirical_coverage(test["p_upper"].to_numpy(), test["label"].to_numpy())
        if not test.empty
        else float("nan")
    )
    print(
        f"[calib] {model}: q_cal={q_cal:.4f} val-coverage={cov_val:.3f} "
        f"test-coverage={cov_test:.3f} (target >= {1 - alpha})"
    )
    sub.attrs["q_cal"] = q_cal
    sub.attrs["coverage_test"] = cov_test
    return sub


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--target", choices=["extreme", "flood", "both"], default="both")
    ap.add_argument("--alpha", type=float, default=CONFORMAL_ALPHA)
    args = ap.parse_args()

    targets = ["extreme", "flood"] if args.target == "both" else [args.target]
    CALIBRATED_DIR.mkdir(parents=True, exist_ok=True)
    settings = {"alpha": args.alpha, "models": {}}

    for target in targets:
        src = RESULTS_DIR / f"predictions_{target}.parquet"
        if not src.exists():
            print(f"[calib] missing {src.name} — run train_risk_model.py first")
            continue
        df = pd.read_parquet(src)
        df = df.rename(columns={df.columns[2]: "label"})

        for model in df["model"].unique():
            try:
                out = calibrate_one(df, model, args.alpha)
            except ValueError as exc:
                print(f"[calib] skipped {target}/{model}: {exc}")
                continue
            out_path = CALIBRATED_DIR / f"{target}_{model}.parquet"
            out.to_parquet(out_path, index=False)
            settings["models"][f"{target}_{model}"] = {
                "q_cal": float(out.attrs.get("q_cal", float("nan"))),
                "coverage_test": float(out.attrs.get("coverage_test", float("nan"))),
                "rows": int(len(out)),
                "parquet": out_path.name,
            }

    if settings["models"]:
        save_json(settings, CONFORMAL_JSON)
        print(f"[calib] settings -> {CONFORMAL_JSON}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
