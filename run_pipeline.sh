#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# RADAR end-to-end pipeline runner.
#
# Heavy jobs run INSIDE the spark-master container (HDFS storage). Light /
# data-acquisition steps run on the host with plain python.
#
# Usage:
#   ./run_pipeline.sh download       # one-time raw data (IMD grid, ONI, events, map)
#   ./run_pipeline.sh etl            # district-day panel (spark)
#   ./run_pipeline.sh train          # hazard models (spark)
#   ./run_pipeline.sh calibrate      # isotonic + split-conformal
#   ./run_pipeline.sh ddrps          # DDRPS 2.0 + ranking experiments
#   ./run_pipeline.sh allocate       # pre-positioning optimizer + evaluation
#   ./run_pipeline.sh serve          # publish results to postgres
#   ./run_pipeline.sh bench          # scalability benchmark (spark)
#   ./run_pipeline.sh figures        # paper figures + REPORT.md
#   ./run_pipeline.sh all            # everything after download
#   ./run_pipeline.sh up             # docker compose up -d (infra only)
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")"

SPARK_MASTER_CT=aid_dras_spark_master
BIGDATA_CT_PATH=/opt/bigdata

step() { printf "\n\033[1;34m== %s ==\033[0m\n" "$1"; }

spark_submit() {  # spark_submit <script.py> [args...]
  docker exec "$SPARK_MASTER_CT" bash -lc \
    "python -m pip install -q pandas pyarrow psycopg2-binary 2>/dev/null || true"
  docker exec "$SPARK_MASTER_CT" \
    bash -lc "spark-submit --master spark://spark-master:7077 $BIGDATA_CT_PATH/$1 ${*:2}"
}

host_python() {  # host_python <script.py> [args...]
  python "${@}"
}

cmd_up() {
  step "starting infra (postgres/redis/namenode/datanode/spark)"
  docker compose up -d
  docker compose ps
}

cmd_download() {
  step "raw data downloads (host network; ~300-500 MB for IMD)"
  host_python bigdata/data_acquisition/download_imd_grid.py --start 1901 --end 2024 --baseline-check
  host_python bigdata/data_acquisition/download_oni.py || true
  host_python bigdata/data_acquisition/download_flood_events.py --source ifi || true
  host_python bigdata/data_acquisition/download_flood_events.py --source emdat --append || true
  host_python bigdata/data_acquisition/district_grid_map.py
  step "loading raw parquet + datasets into HDFS"
  docker exec "$SPARK_MASTER_CT" hdfs dfs -mkdir -p /radar/raw || true
  docker exec "$SPARK_MASTER_CT" bash -lc \
    "hdfs dfs -put -f $BIGDATA_CT_PATH/../datasets/raw/imd_parquet /radar/raw/ 2>/dev/null || true"
}

cmd_etl() {
  step "district-day panel (spark)"
  spark_submit etl/build_district_day_panel.py --engine spark
  spark_submit etl/static_deficits.py
}

cmd_train() {
  step "hazard models (spark MLlib)"
  spark_submit models/train_risk_model.py --target both
}

cmd_calibrate() {
  step "calibration + split-conformal bounds"
  host_python bigdata/models/calibrate_conformal.py --target both
}

cmd_ddrps() {
  step "DDRPS 2.0 + ranking experiments"
  host_python bigdata/ddrps/score_ddrps.py
}

cmd_allocate() {
  step "pre-positioning optimization + holdout evaluation"
  host_python bigdata/allocation/optimize_prepositioning.py
  host_python bigdata/allocation/evaluate_on_events.py
}

cmd_serve() {
  step "publishing results to postgres"
  host_python bigdata/serving/write_to_postgres.py
}

cmd_bench() {
  step "scalability benchmark (spark; bump workers in compose to plot scale-out)"
  spark_submit benchmarks/scale_benchmark.py --factors 1 5 10 20 50 --workers-label 1
}

cmd_figures() {
  step "figures + report"
  host_python bigdata/research/figures.py
  host_python bigdata/research/generate_report.py
}

case "${1:-all}" in
  up)        cmd_up ;;
  download)  cmd_download ;;
  etl)       cmd_etl ;;
  train)     cmd_train ;;
  calibrate) cmd_calibrate ;;
  ddrps)     cmd_ddrps ;;
  allocate)  cmd_allocate ;;
  serve)     cmd_serve ;;
  bench)     cmd_bench ;;
  figures)   cmd_figures ;;
  all)
    cmd_etl; cmd_train; cmd_calibrate; cmd_ddrps; cmd_allocate; cmd_serve; cmd_figures
    ;;
  *)
    echo "unknown step: $1 (see header for usage)"; exit 2
    ;;
esac

printf "\n\033[1;32mstep '%s' finished.\033[0m\n" "${1:-all}"
