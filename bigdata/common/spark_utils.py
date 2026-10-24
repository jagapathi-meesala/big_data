"""Shared Spark helpers.

All RADAR Spark jobs get their session from here so local runs (no Docker,
local parquet) and cluster runs (HDFS + standlone master) behave identically.
"""
import os


def get_spark(app_name: str = "radar", local_only: bool | None = None):
    from pyspark.sql import SparkSession

    if local_only is None:
        local_only = os.environ.get("RADAR_STORAGE", "local") != "hdfs"

    builder = (
        SparkSession.builder.appName(app_name)
        .config("spark.sql.shuffle.partitions", "8")
        .config("spark.sql.session.timeZone", "UTC")
        .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
    )
    if local_only:
        builder = builder.master("local[*]")
    # Best-effort: avoid pyarrow issues on old images
    builder = builder.config("spark.sql.execution.arrow.pyspark.enabled", "true")

    spark = builder.getOrCreate()
    spark.sparkContext.setLogLevel("WARN")
    return spark


def stop_spark(spark) -> None:
    try:
        spark.stop()
    except Exception:
        pass
