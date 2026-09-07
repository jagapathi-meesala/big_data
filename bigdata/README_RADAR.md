# RADAR — Risk-Aware District Allocation & Response

The research pipeline inside this repository (paper core). Replaces the old
two-subdivision monthly pipeline (preserved under `legacy/`).

**Paper working title:** *From Meteorological Risk to Response Priority:
Uncertainty-Aware District-Level Disaster Resource Pre-Positioning Validated
on Historical Flood Events (Andhra Pradesh & Telangana, on Hadoop/Spark).*

## Pipeline map

```
data_acquisition/            one-time downloads (run on any online machine)
  download_imd_grid.py       IMD 0.25° daily rainfall 1901-2024 -> parquet
  download_oni.py            NOAA ONI (ENSO) monthly index
  download_flood_events.py   ground-truth flood events (IFI / EM-DAT / GDACS)
  download_gadm.py           optional district polygons
  district_grid_map.py       legacy-district centroids + grid-cell weights
                             (fixes the old subdivision broadcast & Rangareddy bug)

etl/                         PySpark (or pandas reference) ETL
  build_district_day_panel.py  district-day rainfall, fixed-baseline DOY-window
                             climatology (no leakage), anomaly, lags/rolling/
                             monsoon features, ENSO, flood-lead labels
  static_deficits.py         Census-2011 Dd/Hd/Md/Vd (de-bugged, no hardcoded beds)

models/
  train_risk_model.py        Spark MLlib LogReg / RF / GBT, temporal splits,
                             dual targets: extreme-rain-day & flood-next-14d
  calibrate_conformal.py     isotonic calibration + split-conformal upper
                             bounds (90% coverage) -> decision-grade risk

ddrps/
  score_ddrps.py             DDRPS 2.0 = w·(Qd, Dd, Hd, Md, Vd) under three
                             weight schemes + risk-vs-priority ranking stats

allocation/
  optimize_prepositioning.py budget-constrained stock allocation strategies
                             (uniform / risk / DDRPS / conformal / LP oracle)
  evaluate_on_events.py      replay held-out historical events: unmet demand,
                             precision@5, recall@5

streaming/
  producer.py                Open-Meteo + GDACS poller -> socket :9995
  stream_job.py              Spark Structured Streaming: live DDRPS alerts
                             -> parquet + PostGIS live_alerts table

benchmarks/scale_benchmark.py  scale-up (1x..50x) + scale-out (workers) timing
serving/write_to_postgres.py   publish results tables for the dashboard
research/figures.py            paper figures
research/generate_report.py    REPORT.md auto-generated from results
tests/test_units.py            leakage / conformal / allocation unit tests
```

## Running

Heavy steps run in the `spark-master` container (HDFS); acquisition and
analysis steps run on the host with plain `python`. One entry point:

```bash
docker compose up -d          # infra: postgres/postgis, redis, hadoop, spark x3
./run_pipeline.sh download    # raw data (~300-500 MB, one-time; needs network)
./run_pipeline.sh all         # etl -> train -> calibrate -> ddrps -> allocate -> serve -> figures
./run_pipeline.sh bench       # scalability benchmark
```

Local quickstart without Docker (small runs, tests):

```bash
pip install pandas numpy scikit-learn pyarrow requests pulp matplotlib
python bigdata/data_acquisition/download_imd_grid.py --start 2015 --end 2024
python bigdata/data_acquisition/district_grid_map.py
python bigdata/etl/static_deficits.py
python bigdata/etl/build_district_day_panel.py --engine pandas
python -m unittest discover -s bigdata/tests -v
```

## Ground truth (flood events)

The outcome-validation experiment needs district-level flood events:

1. **IFI** (India Flood Inventory, Saharia et al.) — download from
   Zenodo/HydroShare (search "India Flood Inventory"), unzip into
   `datasets/raw/ifi/`, then `python bigdata/data_acquisition/download_flood_events.py --source ifi`.
2. **EM-DAT** — free account at emdat.be, export India floods to
   `datasets/raw/emdat_india.csv`, then `--source emdat --append`.
3. **GDACS** — automatic historical fallback (`--source gdacs`), sparse for India.

Without events, the extreme-rain model + DDRPS still run; the allocation
replay and outcome validation need at least one source.

## What was fixed relative to the old pipeline

| Old (legacy/)                              | RADAR |
|--------------------------------------------|-------|
| 2 subdivisions broadcast to 23 districts; all Qd identical | IMD 0.25° gridded daily -> per-district series (area/centroid weighting) |
| Rangareddy spelling bug (inherited Coastal AP rain) | explicit alias table, no exact-match joins |
| Z-scores over the FULL 1901-2015 record (test leakage) | fixed 1901-1990 baseline climatology, ±7-day DOY window |
| monthly target, `fillna(0)` target bug | district-day labels; flood events from ground truth |
| hardcoded hospital beds / shelter constant | beds read from india_states.csv, deficits from Census-2011 |
| "SHAP" weight tables, synthetic features | no synthetic data anywhere; calibration + conformal bounds |
| PySpark only for a synthetic benchmark | Spark MLlib training + ETL + streaming + real scale benchmarks |
