"""Build the RADAR district-day panel — the master spatio-temporal dataset.

Pipeline (engine-agnostic; run with --engine spark on the cluster, --engine
pandas for small local runs/tests):

 1. Load per-year IMD long-format parquet (date, lat, lon, rain_mm).
 2. Join the district<->grid weight table (district_grid_map.csv) and
    aggregate cell rainfall to DISTRICT-DAY weighted means.
 3. Fixed-baseline climatology: for each district and day-of-year, mean/std
    of rainfall over CLIMATOLOGY_BASELINE years within a +-7-day DOY window.
    The baseline is entirely pre-test — no leakage into later evaluation.
 4. Anomaly z-score, extreme-rain-day label (>= district p99 of baseline),
    temporal features (lags, rolling sums, monsoon cumulative, seasonality),
    ENSO covariate (ONI), and flood-event lead labels (next K days).
 5. Write the panel as parquet (+ a recent-years CSV snapshot).

Usage:
    python build_district_day_panel.py --engine pandas
    spark-submit build_district_day_panel.py --engine spark
"""
import argparse
import sys
from datetime import date
from pathlib import Path

import _bootstrap  # noqa: F401
import numpy as np
import pandas as pd

from common.aliases import canonical_district
from common.io import read_csv

from config import (
    CLIMATOLOGY_BASELINE,
    DISTRICT_MAP_CSV,
    FLOOD_EVENTS_CSV,
    FLOOD_LEAD_DAYS,
    EXTREME_QUANTILE,
    IMD_PARQUET_DIR,
    ONI_CSV,
    PANEL_DIR,
    RESULTS_DIR,
    SPLIT_TRAIN_END,
    imd_parquet_uri,
    panel_uri,
)

DOY_WINDOW = 7   # +- days-of-year for the baseline climatology window


# ------------------------------------------------------------------ pandas --
def load_grid_map() -> pd.DataFrame:
    grid = read_csv(DISTRICT_MAP_CSV)
    grid["district"] = grid["district"].map(canonical_district)
    return grid.dropna(subset=["district"])


def load_rainfall_years(engine: str = "pandas", years=None) -> pd.DataFrame:
    """Concatenate per-year IMD parquet into one frame (pandas engine)."""
    files = sorted(IMD_PARQUET_DIR.glob("rain_*.parquet"))
    if not files:
        raise FileNotFoundError(
            f"no rain_*.parquet under {IMD_PARQUET_DIR} — run "
            "data_acquisition/download_imd_grid.py first"
        )
    frames = []
    for f in files:
        y = int(f.stem.split("_")[-1])
        if years and not (years[0] <= y <= years[1]):
            continue
        frames.append(pd.read_parquet(f))
    return pd.concat(frames, ignore_index=True)


def aggregate_district_day(rain: pd.DataFrame, grid: pd.DataFrame) -> pd.DataFrame:
    j = rain.merge(grid[["lat", "lon", "district", "weight"]],
                   on=["lat", "lon"], how="inner")
    j["wx"] = j["rain_mm"] * j["weight"]
    agg = (
        j.groupby(["district", "date"], as_index=False)
        .agg(rain_mm=("wx", "sum"), wsum=("weight", "sum"))
    )
    agg["rain_mm"] = agg["rain_mm"] / agg["wsum"]
    return agg.drop(columns="wsum")


def expand_doy_window(df: pd.DataFrame, window: int = DOY_WINDOW) -> pd.DataFrame:
    """Duplicate each row across the +-window day-of-year keys (for the
    baseline climatology groupby)."""
    doy = df["doy"].to_numpy()
    pieces = []
    for off in range(-window, window + 1):
        shifted = pd.DataFrame({"district": df["district"], "key": doy + off,
                                "rain_mm": df["rain_mm"].to_numpy()})
        shifted["key"] = shifted["key"] % 366
        pieces.append(shifted)
    return pd.concat(pieces, ignore_index=True)


def baseline_climatology(district_day: pd.DataFrame) -> pd.DataFrame:
    """Per district x DOY mean/std over the fixed baseline years."""
    lo, hi = CLIMATOLOGY_BASELINE
    base = district_day[
        (district_day["date"].dt.year >= lo) & (district_day["date"].dt.year <= hi)
    ].copy()
    base["doy"] = base["date"].dt.dayofyear % 366
    exp = expand_doy_window(base)
    clim = exp.groupby(["district", "key"], as_index=False)["rain_mm"].agg(
        clim_mean="mean", clim_std="std"
    )
    clim["clim_std"] = clim["clim_std"].fillna(0.0).clip(lower=0.1)
    clim = clim.rename(columns={"key": "doy"})
    # district-specific extreme threshold: p99 of the baseline distribution
    thr = (
        base.groupby("district")["rain_mm"].quantile(EXTREME_QUANTILE)
        .rename("extreme_threshold").reset_index()
    )
    return clim.merge(thr, on="district", how="left")


def attach_flood_labels(panel: pd.DataFrame) -> pd.DataFrame:
    """flood_event_next{k} = 1 if a flood event starts within the next K days."""
    if not FLOOD_EVENTS_CSV.exists():
        print("[etl] no flood_events.csv — flood labels will be all-NaN "
              "(extreme-rain model still trains). Run "
              "data_acquisition/download_flood_events.py to add ground truth.")
        panel[f"flood_event_next{FLOOD_LEAD_DAYS}"] = np.nan
        return panel
    ev = read_csv(FLOOD_EVENTS_CSV)
    ev["district"] = ev["district"].map(canonical_district)
    ev = ev.dropna(subset=["district", "date_start"])
    ev["date_start"] = pd.to_datetime(ev["date_start"], errors="coerce")
    ev = ev.dropna(subset=["date_start"])

    # event day-set: flood on [start, end] and lead-window days before start
    marks = []
    for _, r in ev.iterrows():
        end = r["date_end"] if pd.notna(r["date_end"]) else r["date_start"]
        start_mark = r["date_start"] - pd.Timedelta(days=FLOOD_LEAD_DAYS - 1)
        idx = pd.date_range(start_mark, end, freq="D")
        marks.append(pd.DataFrame({"district": r["district"], "date": idx}))
    marks = pd.concat(marks, ignore_index=True).drop_duplicates()
    marks["flood_flag"] = 1

    panel = panel.merge(marks, on=["district", "date"], how="left")
    panel[f"flood_event_next{FLOOD_LEAD_DAYS}"] = panel["flood_flag"].fillna(0)
    return panel.drop(columns="flood_flag")


def attach_oni(panel: pd.DataFrame) -> pd.DataFrame:
    if not ONI_CSV.exists():
        print("[etl] no ONI file — enso_oni set to 0 (run download_oni.py)")
        panel["enso_oni"] = 0.0
        return panel
    oni = read_csv(ONI_CSV)
    oni["date"] = pd.to_datetime(oni["date"])
    oni = oni.rename(columns={"date": "month"})
    panel = panel.copy()
    panel["month"] = panel["date"].dt.to_period("M").dt.to_timestamp()
    panel = panel.merge(oni, on="month", how="left")
    panel["enso_oni"] = panel["oni"].fillna(0.0)
    return panel.drop(columns=["month", "oni"])


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Temporal features — pandas reference implementation (pandas engine)."""
    df = df.sort_values(["district", "date"]).copy()
    g = df.groupby("district", group_keys=False)
    df["rain_lag1"] = g["rain_mm"].shift(1)
    df["rain_lag7"] = g["rain_mm"].shift(7)
    df["rain_roll7_sum"] = g["rain_mm"].transform(lambda s: s.rolling(7).sum())
    df["rain_roll30_sum"] = g["rain_mm"].transform(lambda s: s.rolling(30).sum())

    monsoon = df["date"].dt.month.isin([6, 7, 8, 9, 10])
    df["is_monsoon"] = monsoon.astype(int)
    cum = (
        df[monsoon]
        .groupby(["district", df["date"].dt.year], group_keys=False)["rain_mm"]
        .cumsum()
    )
    df["monsoon_cumulative"] = cum.reindex(df.index).fillna(0.0)

    doy = df["date"].dt.dayofyear
    df["month_sin"] = np.sin(2 * np.pi * df["date"].dt.month / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["date"].dt.month / 12)
    df["doy_sin"] = np.sin(2 * np.pi * doy / 366)
    df["doy_cos"] = np.cos(2 * np.pi * doy / 366)
    return df


def add_labels_and_clim(panel: pd.DataFrame) -> pd.DataFrame:
    panel = panel.copy()
    panel["doy"] = panel["date"].dt.dayofyear
    clim = baseline_climatology(panel)
    panel["doy_key"] = panel["doy"] % 366
    panel = panel.merge(
        clim.rename(columns={"doy": "doy_key"}),
        on=["district", "doy_key"], how="left",
    ).drop(columns="doy_key")
    panel["rain_anom"] = (panel["rain_mm"] - panel["clim_mean"]) / panel["clim_std"]
    panel["extreme_rain_day"] = (
        (panel["rain_mm"] >= panel["extreme_threshold"]).astype(int)
    )
    panel = engineer_features(panel)
    panel = attach_oni(panel)
    panel = attach_flood_labels(panel)
    return panel


def run_pandas() -> pd.DataFrame:
    grid = load_grid_map()
    rain = load_rainfall_years()
    print(f"[etl] rain rows {len(rain):,}; grid cells {grid['lat'].nunique()}x"
          f"{grid['lon'].nunique()}")
    district_day = aggregate_district_day(rain, grid)
    print(f"[etl] district-day rows {len(district_day):,}")
    panel = add_labels_and_clim(district_day)
    return panel


# ------------------------------------------------------------------ spark ---
def run_spark():
    from pyspark.sql import SparkSession, Window, functions as F

    spark = SparkSession.builder.appName("radar-etl").getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    here = Path(__file__).resolve().parent
    grid = spark.createDataFrame(load_grid_map())

    rain = spark.read.parquet(imd_parquet_uri())
    j = rain.join(grid, on=["lat", "lon"], how="inner")
    district_day = (
        j.withColumn("wx", F.col("rain_mm") * F.col("weight"))
        .groupBy("district", "date")
        .agg(F.sum("wx").alias("wx"), F.sum("weight").alias("wsum"))
        .withColumn("rain_mm", F.col("wx") / F.col("wsum"))
        .select("district", "date", "rain_mm")
    )
    panel = district_day.withColumn("doy", F.dayofyear("date"))

    # fixed-baseline DOY-window climatology
    lo, hi = CLIMATOLOGY_BASELINE
    base = panel.filter(F.year("date").between(lo, hi))
    offsets = spark.createDataFrame(
        [(o,) for o in range(-DOY_WINDOW, DOY_WINDOW + 1)], ["off"]
    )
    exploded = base.crossJoin(offsets).withColumn(
        "key", ((F.col("doy") + F.col("off")) % 366).cast("int")
    )
    clim = (
        exploded.groupBy("district", "key")
        .agg(F.mean("rain_mm").alias("clim_mean"), F.stddev("rain_mm").alias("clim_std"))
        .withColumn("clim_std", F.greatest(F.coalesce("clim_std", F.lit(0.1)), F.lit(0.1)))
    )
    thr = (
        base.groupBy("district")
        .agg(F.percentile_approx("rain_mm", EXTREME_QUANTILE).alias("extreme_threshold"))
    )
    panel = panel.withColumn("key", (F.col("doy") % 366).cast("int"))
    panel = panel.join(clim, on=["district", "key"], how="left")
    panel = panel.join(thr, on="district", how="left")
    panel = panel.withColumn(
        "rain_anom", (F.col("rain_mm") - F.col("clim_mean")) / F.col("clim_std")
    )
    panel = panel.withColumn(
        "extreme_rain_day", (F.col("rain_mm") >= F.col("extreme_threshold")).cast("int")
    )

    # temporal features via window functions
    w = Window.partitionBy("district").orderBy("date")
    panel = panel.withColumn("rain_lag1", F.lag("rain_mm", 1).over(w))
    panel = panel.withColumn("rain_lag7", F.lag("rain_mm", 7).over(w))
    panel = panel.withColumn("rain_roll7_sum", F.sum("rain_mm").over(w.rowsBetween(-6, 0)))
    panel = panel.withColumn("rain_roll30_sum", F.sum("rain_mm").over(w.rowsBetween(-29, 0)))
    panel = panel.withColumn("month", F.month("date"))
    panel = panel.withColumn(
        "is_monsoon", F.col("month").isin(6, 7, 8, 9, 10).cast("int")
    )
    wmon = Window.partitionBy("district", F.year("date")).orderBy("date")
    monsoon_cum = (
        panel.filter(F.col("is_monsoon") == 1)
        .withColumn("monsoon_cumulative", F.sum("rain_mm").over(wmon))
        .select("district", "date", "monsoon_cumulative")
    )
    panel = panel.join(monsoon_cum, on=["district", "date"], how="left")
    panel = panel.withColumn(
        "monsoon_cumulative", F.coalesce("monsoon_cumulative", F.lit(0.0))
    )
    panel = panel.withColumn("month_sin", F.sin(2 * np.pi * F.col("month") / 12))
    panel = panel.withColumn("month_cos", F.cos(2 * np.pi * F.col("month") / 12))
    panel = panel.withColumn("doy_sin", F.sin(2 * np.pi * F.col("doy") / 366))
    panel = panel.withColumn("doy_cos", F.cos(2 * np.pi * F.col("doy") / 366))

    # ONI join (small, broadcast)
    if ONI_CSV.exists():
        oni = spark.createDataFrame(read_csv(ONI_CSV))
        oni = oni.withColumn("month", F.to_date(F.col("date"))) \
                 .select(F.col("month"), F.col("oni").alias("enso_oni"))
        panel = panel.withColumn("month", F.trunc("date", "month"))
        panel = panel.join(F.broadcast(oni), on="month", how="left")
        panel = panel.withColumn("enso_oni", F.coalesce("enso_oni", F.lit(0.0)))
        panel = panel.drop("month")
    else:
        panel = panel.withColumn("enso_oni", F.lit(0.0))

    # flood labels: broadcast-join event-lead day marks
    if FLOOD_EVENTS_CSV.exists():
        ev = read_csv(FLOOD_EVENTS_CSV)
        ev["district"] = ev["district"].map(canonical_district)
        ev = ev.dropna(subset=["district", "date_start"])
        ev["date_start"] = pd.to_datetime(ev["date_start"], errors="coerce")
        ev["date_end"] = pd.to_datetime(ev["date_end"], errors="coerce")
        ev["date_end"] = ev["date_end"].fillna(ev["date_start"])
        marks = []
        for _, r in ev.iterrows():
            start_mark = r["date_start"] - pd.Timedelta(days=FLOOD_LEAD_DAYS - 1)
            for d in pd.date_range(start_mark, r["date_end"], freq="D"):
                marks.append((r["district"], d.to_pydatetime().date()))
        marks_df = spark.createDataFrame(
            pd.DataFrame(marks, columns=["district", "date"]).drop_duplicates()
        ).withColumn("flood_flag", F.lit(1))
        panel = panel.join(F.broadcast(marks_df), on=["district", "date"], how="left")
        panel = panel.withColumn(
            f"flood_event_next{FLOOD_LEAD_DAYS}", F.coalesce("flood_flag", F.lit(0))
        ).drop("flood_flag")
    else:
        panel = panel.withColumn(f"flood_event_next{FLOOD_LEAD_DAYS}", F.lit(None).cast("int"))

    panel = panel.drop("key", "month")
    panel.write.mode("overwrite").parquet(panel_uri())

    recent = panel.filter(F.year("date") >= SPLIT_TRAIN_END - 15)
    recent.toPandas().to_csv(
        RESULTS_DIR / "district_day_panel_snapshot.csv", index=False
    )
    print(f"[etl] spark engine done -> {PANEL_DIR}")
    spark.stop()
    return panel


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--engine", choices=["pandas", "spark"], default="pandas")
    args = ap.parse_args()

    if args.engine == "spark":
        run_spark()
        return 0

    panel = run_pandas()
    out_dir = Path(PANEL_DIR)
    out_dir.mkdir(parents=True, exist_ok=True)
    panel.to_parquet(out_dir / "part-0000.parquet", index=False)
    panel[panel["date"].dt.year >= SPLIT_TRAIN_END - 15].to_csv(
        RESULTS_DIR / "district_day_panel_snapshot.csv", index=False
    )
    print(f"[etl] pandas engine done: {len(panel):,} rows -> {out_dir}")
    rates = panel[["extreme_rain_day"]].mean()
    flood_col = f"flood_event_next{FLOOD_LEAD_DAYS}"
    if flood_col in panel.columns:
        rates[flood_col] = panel[flood_col].mean()
    print(f"[etl] label rates: {rates.to_dict()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
