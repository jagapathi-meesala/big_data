# bigdata/legacy — archived pre-RADAR artifacts

Everything here belonged to the old **monthly two-subdivision pipeline** and
the pre-research operational build. Kept for the paper's "before/after"
narrative and for forensic reference. **Nothing in this folder is executed by
the RADAR pipeline** (`run_pipeline.sh` never touches it).

| Item | What it was |
|---|---|
| `spark_monthly/` | The old stages 0–10 monthly pipeline (`run_full_pipeline.py`, Z≥1.5 target, subdivision broadcast, full-period climatology, weight_learning ElasticNet) + legacy synthetic-data Spark jobs |
| `models_monthly/` | Old joblib artifacts (`spark_rf_risk_model.joblib` — actually sklearn, `xgb_ddrps_weight_model.joblib` — orphaned approach) |
| `ops_scripts/` | Old ops glue: simulated HDFS upload, scheduler, monitor (fabricated stats), IoT gateway |
| `configs/` (kept in place) | Hadoop XML configs — **still used by docker-compose** (`hadoop.env`, core/hdfs/yarn/mapred site templates) |
| `docs/` | The old proposal/audit/progress markdowns, moved from the repo root. Their dataset inventory (`DATASET_INVENTORY.md`) remains accurate; the progress doc contains dead links to the original dev machine |

Known bugs preserved here for the record: Rangareddy subdivision mismatch,
`fillna(0)` target no-op, full-record climatology leakage, hardcoded
state bed numbers, learned weights silently overriding documented baseline
weights.
