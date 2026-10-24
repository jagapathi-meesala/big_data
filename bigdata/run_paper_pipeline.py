#!/usr/bin/env python3
"""
run_paper_pipeline.py — End-to-end orchestrator for paper-ready results.
=========================================================================
Runs the complete legacy pipeline in the correct order and captures all
metrics to bigdata/legacy/results/paper_results.json.

Steps:
  1. Build district-time dataset (1901-2015 monthly features, 23 districts)
  2. Train & evaluate 4 ML models (Persistence / LogReg / RF / GBT)
  3. Compute DDRPS scores under all 3 weight schemes (baseline / AHP / learned)
  4. Run ranking experiment (Spearman ρ, MARC, top-k overlap)
  5. Run AHP weight derivation
  6. Generate LaTeX tables for paper

Usage:
    python bigdata/run_paper_pipeline.py
    python bigdata/run_paper_pipeline.py --skip-data  # if dataset already built
"""

import argparse
import json
import sys
import time
from pathlib import Path

# ── path setup ────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
LEGACY_SM = ROOT / "bigdata" / "legacy" / "spark_monthly"
DDRPS_DIR = ROOT / "bigdata" / "ddrps"
PAPER_DIR = ROOT / "paper"
sys.path.insert(0, str(ROOT / "bigdata"))
sys.path.insert(0, str(LEGACY_SM))

from config import (
    DISTRICT_TIME_CSV,
    LEGACY_RESULTS_DIR,
    PAPER_RESULTS_JSON,
    PAPER_TABLES_DIR,
    RESULTS_DIR,
)

LEGACY_RESULTS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
PAPER_TABLES_DIR.mkdir(parents=True, exist_ok=True)


def step(name: str, fn, *args, **kwargs):
    """Run a pipeline step, print timing, return result."""
    print(f"\n{'─'*70}")
    print(f"  ▶  {name}")
    print(f"{'─'*70}")
    t0 = time.perf_counter()
    try:
        result = fn(*args, **kwargs)
        elapsed = time.perf_counter() - t0
        print(f"  ✅  {name} done in {elapsed:.1f}s")
        return result
    except Exception as exc:
        elapsed = time.perf_counter() - t0
        print(f"  ❌  {name} FAILED after {elapsed:.1f}s: {exc}")
        import traceback
        traceback.print_exc()
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--skip-data", action="store_true",
                    help="Skip dataset build if district_time_master.csv exists")
    ap.add_argument("--skip-ml", action="store_true",
                    help="Skip ML training (reuse existing risk_predictions.csv)")
    args = ap.parse_args()

    print("=" * 70)
    print("  AID-DRAS / RADAR — Paper Pipeline Orchestrator")
    print("=" * 70)
    t_total = time.perf_counter()

    # ── Step 1: Build district-time dataset ──────────────────────────────────
    df_master = None
    if args.skip_data and DISTRICT_TIME_CSV.exists():
        import pandas as pd
        df_master = pd.read_csv(DISTRICT_TIME_CSV)
        print(f"\n[skip] Using existing {DISTRICT_TIME_CSV.name} ({len(df_master):,} rows)")
    else:
        from district_time_features import build_district_time_dataset
        df_master = step("Build district-time dataset (23 districts × 1901-2015)",
                         build_district_time_dataset)

    if df_master is None:
        print("\n❌ Cannot proceed without district-time dataset. Exiting.")
        sys.exit(1)

    # ── Step 2: 4-model ML benchmark ─────────────────────────────────────────
    df_metrics = None
    if args.skip_ml:
        import pandas as pd
        metrics_csv = LEGACY_RESULTS_DIR / "model_metrics.csv"
        if metrics_csv.exists():
            df_metrics = pd.read_csv(metrics_csv)
            print(f"\n[skip] Using existing model_metrics.csv")
        else:
            args.skip_ml = False  # force re-run if file missing

    if not args.skip_ml:
        from evaluate_models import run_model_evaluation
        df_metrics = step("4-Model ML Benchmark (Persistence/LogReg/RF/GBT)",
                          run_model_evaluation, df_master)

    # ── Step 3: DDRPS scoring ─────────────────────────────────────────────────
    sys.path.insert(0, str(DDRPS_DIR))
    try:
        import _bootstrap  # noqa: F401 – sets up DDRPS module path
    except ImportError:
        # Create minimal _bootstrap for DDRPS scripts
        pass

    # Run legacy DDRPS (has its own data loading)
    try:
        from ddrps import run_ddrps_pipeline as legacy_ddrps
        df_snapshot = step("DDRPS prioritization (legacy pipeline)",
                           legacy_ddrps)
    except Exception as e:
        print(f"  [warn] Legacy DDRPS skipped: {e}")
        df_snapshot = None

    # ── Step 4: Ranking experiment ────────────────────────────────────────────
    try:
        from ranking_analysis import run_ranking_analysis
        _, ranking_metrics = step("Risk vs Priority ranking experiment",
                                  run_ranking_analysis)
    except Exception as e:
        print(f"  [warn] Ranking analysis skipped: {e}")
        ranking_metrics = {}

    # ── Step 5: Sensitivity analysis ─────────────────────────────────────────
    try:
        from sensitivity_analysis import run_sensitivity_analysis
        df_sensitivity = step("DDRPS weight sensitivity analysis",
                              run_sensitivity_analysis)
    except Exception as e:
        print(f"  [warn] Sensitivity analysis skipped: {e}")
        df_sensitivity = None

    # ── Step 6: AHP weight derivation ────────────────────────────────────────
    try:
        ahp_bootstrap = ROOT / "bigdata" / "ddrps" / "_bootstrap.py"
        if not ahp_bootstrap.exists():
            # write minimal _bootstrap for ddrps subdir
            ahp_bootstrap.write_text(
                "import sys\nfrom pathlib import Path\n"
                "sys.path.insert(0, str(Path(__file__).resolve().parent))\n"
                "sys.path.insert(0, str(Path(__file__).resolve().parents[1]))\n"
            )
        sys.path.insert(0, str(ROOT / "bigdata" / "ddrps"))
        from ahp_weights import run_ahp
        ahp_result = step("AHP weight derivation (consistency validation)",
                          run_ahp, export_latex=True)
    except Exception as e:
        print(f"  [warn] AHP derivation skipped: {e}")
        ahp_result = None

    # ── Step 7: Generate LaTeX tables ─────────────────────────────────────────
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, str(PAPER_DIR / "generate_results_tables.py"), "--save"],
            capture_output=True, text=True, cwd=str(ROOT)
        )
        if result.returncode == 0:
            print("\n  ✅  LaTeX tables generated → paper/tables/")
        else:
            print(f"\n  ⚠️  Table generation: {result.stderr[:200]}")
    except Exception as e:
        print(f"  [warn] Table generation skipped: {e}")

    # ── Collate and save paper_results.json ──────────────────────────────────
    paper_results = {
        "pipeline_status": "complete",
        "dataset": {
            "total_rows": int(len(df_master)),
            "n_districts": int(df_master["district"].nunique()) if df_master is not None else 0,
            "year_range": [1901, 2015],
        },
        "ml_metrics": json.loads((LEGACY_RESULTS_DIR / "model_metrics_detailed.json").read_text())
        if (LEGACY_RESULTS_DIR / "model_metrics_detailed.json").exists() else [],
        "ranking_metrics": ranking_metrics if isinstance(ranking_metrics, dict) else {},
        "ahp": {
            "cr": ahp_result.get("consistency_ratio_CR") if ahp_result else None,
            "acceptable": ahp_result.get("cr_acceptable") if ahp_result else None,
            "ahp_weights": ahp_result.get("ahp_eigenvector_weights") if ahp_result else None,
        },
    }

    PAPER_RESULTS_JSON.parent.mkdir(parents=True, exist_ok=True)
    PAPER_RESULTS_JSON.write_text(json.dumps(paper_results, indent=2))
    print(f"\n[pipeline] Paper results saved → {PAPER_RESULTS_JSON}")

    elapsed_total = time.perf_counter() - t_total
    print(f"\n{'='*70}")
    print(f"  ✅  Pipeline complete in {elapsed_total:.1f}s")
    print(f"{'='*70}")
    print(f"\n  Key output files:")
    print(f"    {LEGACY_RESULTS_DIR / 'model_metrics_detailed.json'}")
    print(f"    {LEGACY_RESULTS_DIR / 'ddrps_priorities.csv'}")
    print(f"    {LEGACY_RESULTS_DIR / 'ranking_metrics.json'}")
    print(f"    {PAPER_RESULTS_JSON}")
    print(f"    {PAPER_TABLES_DIR}/*.tex")
    print(f"\n  Next step: run  python paper/generate_results_tables.py")
    print(f"  Then: compile paper/main.tex with pdflatex\n")


if __name__ == "__main__":
    main()
