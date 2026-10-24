"""Distributed scalability benchmarks (scale-up + scale-out).

Scale-up: replicate the district-day panel 1x..50x (union + repartition) and
time a realistic groupBy aggregation per district-day-window.

Scale-out: the same job run with different worker counts (set
--workers-label when launching with more compose workers); results rows are
tagged so the paper can plot runtime vs workers at fixed input size.

Output: results/scalability_results.csv

Usage:
    spark-submit scale_benchmark.py --factors 1 5 10 20 50
    spark-submit scale_benchmark.py --factors 1 --workers-label 3
"""
import argparse
import sys
import time

import _bootstrap  # noqa: F401
import pandas as pd

from common.spark_utils import get_spark, stop_spark

from config import SCALABILITY_CSV, panel_uri


def bench_once(df, partitions: int) -> tuple[float, int]:
    rep = df.repartition(partitions)
    agg = (
        rep.groupBy("district", F.window("date", "30 days"))
        .agg(F.avg("rain_mm").alias("rain"), F.max("rain_anom").alias("anom"))
    )
    t0 = time.perf_counter()
    n = agg.count()   # materialize
    return time.perf_counter() - t0, n


def main() -> int:
    from pyspark.sql import functions as F

    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--factors", type=int, nargs="+", default=[1, 5, 10, 20, 50])
    ap.add_argument("--workers-label", type=int, default=1,
                    help="number of Spark workers this run executes on")
    args = ap.parse_args()

    spark = get_spark("radar-benchmark")
    spark.sparkContext.setLogLevel("WARN")
    base = spark.read.parquet(panel_uri())
    base_rows = base.count()

    rows = []
    for factor in args.factors:
        df = base
        for _ in range(factor - 1):
            df = df.unionByName(base)
        total = base_rows * factor
        parts = min(max(2, factor * 2), 64)
        runtime, n = bench_once(df, parts)
        rows.append(
            {
                "scale": f"{factor}x",
                "workers": args.workers_label,
                "input_records": total,
                "partitions": parts,
                "runtime_sec": round(runtime, 3),
                "throughput_rec_s": round(total / runtime, 1),
            }
        )
        print(f"[bench] {factor}x: {runtime:.2f}s ({total:,} rows)")
        if runtime > 300:
            print("[bench] stopping early — runtimes are long enough for the curve")
            break

    out = pd.DataFrame(rows)
    if SCALABILITY_CSV.exists():
        old = pd.read_csv(SCALABILITY_CSV)
        old = old[old["workers"] != args.workers_label]
        out = pd.concat([old, out], ignore_index=True)
    out.to_csv(SCALABILITY_CSV, index=False)
    print(f"[bench] saved -> {SCALABILITY_CSV}")
    stop_spark(spark)
    return 0


if __name__ == "__main__":
    sys.exit(main())
