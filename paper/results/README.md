# Research Results Directory

This directory is reserved for paper artifacts copied or generated from a
specific, reproducible RADAR run. No checked-in result bundle for the newer
IMD-grid/conformal/event-replay workflow was present at the time of review.

Before treating a file as paper evidence, record its generating command,
configuration, code revision, input checksums, software versions, hardware, and
run logs. Do not overwrite the only copy of a prior result. The legacy pilot
artifacts are stored separately in `bigdata/legacy/results/` and have the
limitations described in `PAPER_REVIEW.md`.

## Planned outputs

| Artifact | Intended content | Verification required |
|---|---|---|
| `model_metrics.csv` | Model/split metrics and sample counts | Confirm labels, temporal splits, and metrics independently |
| `conformal_settings.json` | Calibration split, quantile, coverage diagnostics | Validate finite-sample order statistic and temporal assumptions |
| `ddrps_ranking.csv` / `ranking_metrics.json` | District component scores and ranking summaries | Audit mapping, normalization, tie policy, and consistency between files |
| `allocation_results.csv` / `validation_summary.json` | Training policy and held-out event replay | Prove no test-event leakage; document demand units and uncertainty |
| `scalability_results.csv` | Runtime and throughput on declared inputs/hardware | Run separate scale benchmark and document cluster topology |
| `REPORT.md` / figures | Generated narrative/plots | Ensure all values derive from the archived run above |

## Reproducibility

The pipeline entry point may skip or fail optional source acquisition and does
not guarantee that every artifact is generated. Run each stage, inspect exit
codes/logs, verify expected outputs and source provenance, then archive the
complete run bundle. See `../PAPER_REVIEW.md` for pre-submission blockers.
