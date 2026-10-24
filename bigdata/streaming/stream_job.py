"""Spark Structured Streaming: live district risk alerts.

Consumes the producer's JSON lines from the socket source, enriches each
weather reading with the static deficit layer and the latest conformal UPPER
risk bound, computes a live DDRPS alert score, and writes:

  * streaming parquet -> bigdata/research/results/stream_alerts/
  * upserts into Postgres `live_alerts` (served to the dashboard via
    /api/v1/research/live-alerts)

live Qd modulation: qd_live = clip(Qd_upper + 0.05 * ln(1 + rain_mm), 0, 1)
(a principled, documented blend: the pre-season risk bound lifted by the
current precipitation signal; the coefficient is fixed a priori).

Usage:
    spark-submit stream_job.py            # waits forever; Ctrl-C to stop
"""
import sys
from pathlib import Path

import _bootstrap  # noqa: F401
import pandas as pd

from common.io import read_csv
from common.spark_utils import get_spark, stop_spark

from config import (
    DDRPS_BASELINE_WEIGHTS,
    DISTRICT_CENTROIDS_CSV,
    PG,
    RESULTS_DIR,
    STATIC_DEFS_CSV,
    STREAM_ALERTS_DIR,
    STREAM_SOCKET_PORT,
)

WEATHER_SCHEMA = """
    type STRING, district STRING, ts STRING, lat DOUBLE, lon DOUBLE,
    rain_mm DOUBLE, temp_c DOUBLE, humidity DOUBLE, wind_kmh DOUBLE,
    pressure_hpa DOUBLE
"""


def static_layer(spark):
    from pyspark.sql import functions as F

    static = read_csv(STATIC_DEFS_CSV)[
        ["district", "population", "Dd", "Hd", "Md", "Vd"]
    ]
    ddrps = read_csv(RESULTS_DIR / "ddrps_ranking.csv")
    ddrps = ddrps[ddrps["scheme"] == "baseline"][["district", "Qd_upper"]]
    if "Qd_upper" not in ddrps.columns or ddrps.empty:
        # fall back to a neutral static risk if the panel is absent
        ddrps = pd.DataFrame({"district": static["district"], "Qd_upper": 0.3})
    cent = read_csv(DISTRICT_CENTROIDS_CSV)[["district", "lat", "lon"]]
    merged = (
        static.merge(ddrps, on="district", how="left")
        .merge(cent, on="district", how="left")
    )
    merged["Qd_upper"] = merged["Qd_upper"].fillna(0.3)
    df = spark.createDataFrame(merged)
    w = DDRPS_BASELINE_WEIGHTS
    df = df.withColumn(
        "ddrps_base",
        F.lit(w["Qd"]) * F.col("Qd_upper")
        + F.lit(w["Dd"]) * F.col("Dd")
        + F.lit(w["Hd"]) * F.col("Hd")
        + F.lit(w["Md"]) * F.col("Md")
        + F.lit(w["Vd"]) * F.col("Vd"),
    )
    return df


def write_postgres(batch_df, batch_id: int) -> None:
    try:
        import psycopg2
    except ImportError:
        return
    rows = batch_df.collect()
    if not rows:
        return
    try:
        conn = psycopg2.connect(
            host=PG["host"], port=PG["port"], user=PG["user"],
            password=PG["password"], dbname=PG["dbname"],
        )
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS live_alerts (
                    district   VARCHAR(100),
                    ts         TIMESTAMPTZ,
                    rain_mm    DOUBLE PRECISION,
                    temp_c     DOUBLE PRECISION,
                    wind_kmh   DOUBLE PRECISION,
                    qd_live    DOUBLE PRECISION,
                    ddrps_live DOUBLE PRECISION,
                    category   VARCHAR(40),
                    geom       geometry(Point, 4326)
                )
                """
            )
            for r in rows:
                cur.execute(
                    """
                    INSERT INTO live_alerts
                        (district, ts, rain_mm, temp_c, wind_kmh,
                         qd_live, ddrps_live, category, geom)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s,
                            ST_SetSRID(ST_MakePoint(%s, %s), 4326))
                    """,
                    (
                        r["district"], r["ts"], r["rain_mm"], r["temp_c"],
                        r["wind_kmh"], r["qd_live"], r["ddrps_live"],
                        r["category"], r["lon"], r["lat"],
                    ),
                )
        conn.commit()
        conn.close()
    except Exception as exc:
        print(f"[stream] postgres upsert skipped: {exc}")


def main() -> int:
    from pyspark.sql import functions as F
    from pyspark.sql.types import StructType
    import json as _json

    schema = StructType.fromDDL(WEATHER_SCHEMA)
    spark = get_spark("radar-stream")
    spark.sparkContext.setLogLevel("WARN")

    static = F.broadcast(static_layer(spark))
    raw = (
        spark.readStream.format("socket")
        .option("host", "localhost")
        .option("port", STREAM_SOCKET_PORT)
        .load()
    )
    parsed = F.from_json(F.col("value").cast("string"), schema).alias("data")
    weather = (
        raw.select(parsed)
        .filter(F.col("data.type") == "weather")
        .select("data.*")
    )

    w = DDRPS_BASELINE_WEIGHTS
    enriched = (
        weather.join(static, on="district", how="inner")
        .withColumn("qd_live", F.least(
            F.lit(1.0),
            F.greatest(F.lit(0.0),
                       F.col("Qd_upper") + F.lit(0.05) * F.log1p(F.col("rain_mm"))),
        ))
        .withColumn(
            "ddrps_live",
            F.lit(w["Qd"]) * F.col("qd_live")
            + F.lit(w["Dd"]) * F.col("Dd")
            + F.lit(w["Hd"]) * F.col("Hd")
            + F.lit(w["Md"]) * F.col("Md")
            + F.lit(w["Vd"]) * F.col("Vd"),
        )
        .withColumn(
            "category",
            F.when(F.col("ddrps_live") >= 0.70, "PRIORITY_1_CRITICAL")
            .when(F.col("ddrps_live") >= 0.50, "PRIORITY_2_HIGH")
            .when(F.col("ddrps_live") >= 0.30, "PRIORITY_3_MEDIUM")
            .otherwise("PRIORITY_4_LOW"),
        )
        .withColumn("ts", F.to_timestamp("ts"))
    )

    query_parquet = (
        enriched.writeStream.outputMode("append")
        .option("checkpointLocation", str(STREAM_ALERTS_DIR / "_checkpoint"))
        .option("path", str(STREAM_ALERTS_DIR))
        .format("parquet")
        .start()
    )
    query_pg = (
        enriched.writeStream.outputMode("append")
        .foreachBatch(write_postgres)
        .option("checkpointLocation", str(STREAM_ALERTS_DIR / "_checkpoint_pg"))
        .start()
    )
    print("[stream] running — Ctrl-C to stop")
    try:
        spark.streams.awaitAnyTermination()
    except KeyboardInterrupt:
        pass
    finally:
        query_parquet.stop()
        query_pg.stop()
        stop_spark(spark)
    return 0


if __name__ == "__main__":
    sys.exit(main())
