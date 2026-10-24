"""Generate all paper figures from the results directory.

Each figure degrades gracefully: if its inputs are missing the figure is
skipped with a note, so partial pipeline runs still produce the figures that
are available.

Usage: python figures.py
"""
import sys
from pathlib import Path

import _bootstrap  # noqa: F401
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from common.io import load_json, read_csv

from config import (
    DISTRICT_CENTROIDS_CSV,
    DISTRICT_MAP_CSV,
    FLOOD_EVENTS_CSV,
    FIGURES_DIR,
    MODEL_METRICS_CSV,
    RANKING_METRICS_JSON,
    RESULTS_DIR,
    SCALABILITY_CSV,
)

plt.rcParams.update({"figure.dpi": 150, "font.size": 9})


def _save(fig, name: str) -> None:
    out = FIGURES_DIR / name
    fig.savefig(out, bbox_inches="tight")
    plt.close(fig)
    print(f"[fig] {out.name}")


def fig_study_region() -> None:
    try:
        cent = read_csv(DISTRICT_CENTROIDS_CSV)
        grid = read_csv(DISTRICT_MAP_CSV)
    except Exception:
        print("[fig] skip region map (missing map inputs)")
        return
    fig, ax = plt.subplots(figsize=(5.2, 5.2))
    ax.scatter(grid["lon"], grid["lat"], s=3, c="#cfd8e3", label="IMD 0.25° cells")
    ax.scatter(cent["lon"], cent["lat"], s=28, c="#b3261e", zorder=3,
               label="legacy district centroids")
    for _, r in cent.iterrows():
        ax.annotate(r["district"], (r["lon"], r["lat"]), fontsize=5,
                    xytext=(2, 2), textcoords="offset points")
    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")
    ax.set_title("Study region: 23 legacy districts (AP & Telangana)")
    ax.legend(loc="lower left", fontsize=7)
    _save(fig, "fig1_study_region.png")


def fig_model_metrics() -> None:
    if not MODEL_METRICS_CSV.exists():
        print("[fig] skip metrics (no model_metrics.csv)")
        return
    df = read_csv(MODEL_METRICS_CSV)
    df = df[df["split"] == "test"]
    targets = df["target"].unique()
    fig, axes = plt.subplots(1, len(targets), figsize=(4.2 * len(targets), 3.2),
                             squeeze=False)
    for ax, target in zip(axes[0], targets):
        sub = df[df["target"] == target]
        x = np.arange(len(sub))
        ax.bar(x - 0.18, sub["roc_auc"], width=0.36, label="ROC-AUC")
        ax.bar(x + 0.18, sub["pr_auc"], width=0.36, label="PR-AUC")
        ax.axhline(0.5, ls="--", lw=0.7, c="grey")
        ax.set_xticks(x, sub["model"])
        ax.set_title(f"{target} (test)")
        ax.set_ylim(0, 1)
        ax.legend(fontsize=7)
    _save(fig, "fig2_model_metrics.png")


def fig_ranking_scatter() -> None:
    src = RESULTS_DIR / "ddrps_ranking.csv"
    if not src.exists():
        print("[fig] skip ranking scatter (no ddrps_ranking.csv)")
        return
    df = read_csv(src)
    df = df[df["scheme"] == "baseline"]
    fig, ax = plt.subplots(figsize=(4.6, 4.6))
    ax.scatter(df["risk_rank"], df["priority_rank"], s=26, c="#1a4f8b")
    for _, r in df.iterrows():
        ax.annotate(r["district"], (r["risk_rank"], r["priority_rank"]),
                    fontsize=5.5, xytext=(3, 3), textcoords="offset points")
    lim = (0, len(df) + 1)
    ax.plot(lim, lim, ls="--", lw=0.8, c="grey")
    ax.set_xlabel("Hazard-risk rank (Qd)")
    ax.set_ylabel("Response-priority rank (DDRPS)")
    ax.set_title("Risk vs response priority — baseline weights")
    _save(fig, "fig3_ranking_scatter.png")


def fig_allocation() -> None:
    src = RESULTS_DIR / "allocation_evaluation.csv"
    if not src.exists():
        print("[fig] skip allocation (no allocation_evaluation.csv)")
        return
    df = read_csv(src)
    fig, ax = plt.subplots(figsize=(5.4, 3.4))
    ax.barh(df["strategy"], df["unmet_per_event"], color="#b3261e")
    ax.invert_yaxis()
    ax.set_xlabel("Mean unmet demand units per holdout event")
    ax.set_title("Pre-positioning strategies on historical events")
    for i, v in enumerate(df["unmet_per_event"]):
        ax.text(v, i, f" {v:.2f}", va="center", fontsize=7)
    _save(fig, "fig4_allocation.png")


def fig_scalability() -> None:
    if not SCALABILITY_CSV.exists():
        print("[fig] skip scalability (no scalability_results.csv)")
        return
    df = read_csv(SCALABILITY_CSV)
    fig, axes = plt.subplots(1, 2, figsize=(8.2, 3.2))
    for workers, sub in df.groupby("workers"):
        sub = sub.sort_values("input_records")
        axes[0].plot(sub["input_records"], sub["runtime_sec"], marker="o",
                     label=f"{workers} worker(s)")
        axes[1].plot(sub["input_records"], sub["throughput_rec_s"], marker="o",
                     label=f"{workers} worker(s)")
    axes[0].set_xlabel("input records")
    axes[0].set_ylabel("runtime (s)")
    axes[0].set_xscale("log")
    axes[0].set_title("Scale-up runtime")
    axes[1].set_xlabel("input records")
    axes[1].set_ylabel("throughput (rec/s)")
    axes[1].set_xscale("log")
    axes[1].set_yscale("log")
    axes[1].set_title("Scale-up throughput")
    for ax in axes:
        ax.legend(fontsize=7)
    _save(fig, "fig5_scalability.png")


def fig_events_timeline() -> None:
    if not FLOOD_EVENTS_CSV.exists():
        print("[fig] skip events timeline (no flood_events.csv)")
        return
    ev = read_csv(FLOOD_EVENTS_CSV)
    ev["year"] = pd.to_datetime(ev["date_start"], errors="coerce").dt.year
    pivot = ev.pivot_table(index="district", columns="year", values="date_start",
                           aggfunc="count").fillna(0)
    fig, ax = plt.subplots(figsize=(7.5, 5.5))
    im = ax.imshow(pivot.to_numpy(), aspect="auto", cmap="Blues")
    ax.set_yticks(range(len(pivot.index)), pivot.index, fontsize=5.5)
    ax.set_xticks(range(len(pivot.columns)), pivot.columns, fontsize=5.5,
                  rotation=90)
    ax.set_title("Historical flood events per district-year (ground truth)")
    fig.colorbar(im, ax=ax, shrink=0.7)
    _save(fig, "fig6_events_timeline.png")


def main() -> int:
    FIGURES_DIR.mkdir(parents=True, exist_ok=True)
    fig_study_region()
    fig_model_metrics()
    fig_ranking_scatter()
    fig_allocation()
    fig_scalability()
    fig_events_timeline()
    print(f"[fig] figures -> {FIGURES_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
