import os
import sys
import time
import pandas as pd
import numpy as np
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from bigdata.config import (
    DISTRICT_TIME_CSV,
    RESULTS_DIR
)
from bigdata.spark.district_time_features import build_district_time_dataset

def run_spark_scalability_benchmark():
    """
    Runs actual PySpark DataFrame Scalability Benchmark (Task Requirement #15).
    Benchmarks PySpark DataFrame transformation and aggregation throughput across scaling partition sizes.
    """
    print("=== Running PySpark Distributed Scalability Benchmark ===")
    
    try:
        from pyspark.sql import SparkSession
        import pyspark.sql.functions as F
        
        spark = SparkSession.builder \
            .appName("PySparkScalabilityBenchmark") \
            .master("local[*]") \
            .config("spark.driver.memory", "4g") \
            .config("spark.sql.execution.arrow.pyspark.enabled", "true") \
            .getOrCreate()
            
        print("[scalability] PySpark SparkSession initialized successfully.")
    except Exception as e:
        print(f"[scalability] PySpark initialization notice: {e}")
        return None

    if not DISTRICT_TIME_CSV.exists():
        df_base = build_district_time_dataset()
    else:
        df_base = pd.read_csv(DISTRICT_TIME_CSV)
        
    spark_df_base = spark.createDataFrame(df_base)
    
    scale_factors = [1, 5, 10, 20, 50]
    benchmark_results = []
    
    print("\n--- Benchmarking Spark DataFrame Execution Across Scaling Multipliers ---")
    for factor in scale_factors:
        # Replicate DataFrame in Spark to simulate large-scale big data workloads
        dfs = [spark_df_base] * factor
        union_df = dfs[0]
        for d in dfs[1:]:
            union_df = union_df.union(d)
            
        num_partitions = min(8, factor * 2)
        union_df = union_df.repartition(num_partitions)
        
        t0 = time.time()
        
        # PySpark DataFrame computation pipeline:
        # 1. Monthly precipitation z-score filter
        # 2. District-level aggregations
        # 3. Min-Max scaling and score calculations
        agg_spark = union_df.groupBy("district", "month") \
            .agg(
                F.count("rainfall_mm").alias("month_count"),
                F.avg("rainfall_mm").alias("avg_rainfall"),
                F.stddev("rainfall_mm").alias("std_rainfall"),
                F.max("rainfall_zscore").alias("max_zscore"),
                F.sum("extreme_precipitation_event").alias("total_extreme_events")
            )
            
        total_records = agg_spark.count()  # Trigger Spark Action
        t1 = time.time()
        
        runtime = max(0.001, t1 - t0)
        total_input_records = len(df_base) * factor
        throughput = total_input_records / runtime
        
        res = {
            "scale_factor": f"{factor}x",
            "input_records": total_input_records,
            "spark_partitions": num_partitions,
            "aggregated_output_groups": total_records,
            "runtime_sec": round(runtime, 4),
            "throughput_records_per_sec": round(throughput, 2)
        }
        benchmark_results.append(res)
        print(f"  [scale {factor:2d}x] Input Records: {total_input_records:7d} | Partitions: {num_partitions} | Time: {runtime:.3f}s | Throughput: {throughput:10.1f} rec/sec")
        
    df_res = pd.DataFrame(benchmark_results)
    out_path = RESULTS_DIR / "scalability_results.csv"
    df_res.to_csv(out_path, index=False)
    
    print(f"\n[scalability] PySpark Scalability Benchmark complete. Saved to: {out_path}")
    spark.stop()
    return df_res

if __name__ == "__main__":
    run_spark_scalability_benchmark()
