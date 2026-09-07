"""
RADAR pipeline configuration (constants only — no env-derived filesystem paths).

RADAR = Risk-Aware District Allocation & Response (research pipeline for
"From Meteorological Risk to Response Priority").

Replaces the old monthly two-subdivision configuration. The legacy monthly
pipeline is preserved under bigdata/legacy/. All filesystem writes go through
bigdata/common/io.py, which allowlists paths under the project root.
"""
import os
from pathlib import Path

# ---------------------------------------------------------------- paths ----
BIGDATA_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BIGDATA_DIR.parent
DATASETS_DIR = PROJECT_ROOT / "datasets"
RAW_DIR = DATASETS_DIR / "raw"              # downloaded once, git-ignored
RESULTS_DIR = BIGDATA_DIR / "research" / "results"
FIGURES_DIR = BIGDATA_DIR / "research" / "figures"
MODELS_DIR = BIGDATA_DIR / "research" / "models"
LEGACY_DIR = BIGDATA_DIR / "legacy"

# Legacy dataset files (still used for the static vulnerability layer)
CENSUS_2011_CSV = DATASETS_DIR / "india-districts-census-2011.csv"
HOSPITALS_CSV = DATASETS_DIR / "hospitals.csv"
FINAL_DISTRICTS_CSV = DATASETS_DIR / "final_districts.csv"
INDIA_STATES_CSV = DATASETS_DIR / "india_states.csv"
LEGACY_RAINFALL_CSV = DATASETS_DIR / "Monthly Rainfall - flood Data 1901-2015.csv"

# Downloaded / derived raw data
IMD_GRID_DIR = RAW_DIR / "imd_gridded"          # yearwise .grd
IMD_PARQUET_DIR = RAW_DIR / "imd_parquet"       # (date, lat, lon, rain) per year
FLOOD_EVENTS_CSV = RAW_DIR / "flood_events.csv" # normalized event table
ONI_CSV = RAW_DIR / "oni_monthly.csv"           # ENSO index
GADM_DIR = RAW_DIR / "gadm"                     # optional polygons
DISTRICT_MAP_CSV = RAW_DIR / "district_grid_map.csv"   # cell -> district weights
DISTRICT_CENTROIDS_CSV = RAW_DIR / "district_centroids.csv"

# Pipeline artifacts
PANEL_DIR = RESULTS_DIR / "district_day_panel"
STATIC_DEFS_CSV = RESULTS_DIR / "district_static_deficits.csv"
RISK_PANEL_DIR = RESULTS_DIR / "risk_panel"
CALIBRATED_PANEL_DIR = RESULTS_DIR / "risk_panel_calibrated"
CONFORMAL_JSON = RESULTS_DIR / "conformal_settings.json"
MODEL_METRICS_CSV = RESULTS_DIR / "model_metrics.csv"
DDRPS_RANKING_CSV = RESULTS_DIR / "ddrps_ranking.csv"
RANKING_METRICS_JSON = RESULTS_DIR / "ranking_metrics.json"
ALLOCATION_RESULTS_CSV = RESULTS_DIR / "allocation_results.csv"
ALLOCATION_STRATEGIES_JSON = RESULTS_DIR / "allocation_strategies.json"
VALIDATION_SUMMARY_JSON = RESULTS_DIR / "validation_summary.json"
SCALABILITY_CSV = RESULTS_DIR / "scalability_results.csv"
STREAM_ALERTS_DIR = RESULTS_DIR / "stream_alerts"

# ---------------------------------------------------------------- params ---
RANDOM_SEED = 42

# The 23 legacy (undivided, Census-2011) districts. Canonical spellings used
# everywhere in RADAR outputs; common variants are mapped by common.aliases.
LEGACY_DISTRICTS = [
    # coastal Andhra (legacy)
    "Srikakulam", "Vizianagaram", "Visakhapatnam", "East Godavari",
    "West Godavari", "Krishna", "Guntur", "Prakasam", "Nellore",
    # Rayalaseema (legacy)
    "Chittoor", "Y.S.R.", "Anantapur", "Kurnool",
    # Telangana (legacy)
    "Adilabad", "Nizamabad", "Karimnagar", "Medak", "Hyderabad",
    "Rangareddy", "Mahbubnagar", "Nalgonda", "Warangal", "Khammam",
]

IMD_REGION = {            # bounding box for the AP+TS study region (degrees)
    "lon_min": 74.0, "lon_max": 85.0,
    "lat_min": 12.5, "lat_max": 20.5,
}

# Fixed climatological baseline used to define the extreme-rain-day threshold.
# A fixed pre-test baseline guarantees no leakage into later evaluation years.
CLIMATOLOGY_BASELINE = (1901, 1990)
EXTREME_QUANTILE = 0.99          # district-day rainfall >= p99 (baseline) = extreme

# Flood-event lead target: label flood_event_next{k}
FLOOD_LEAD_DAYS = 14

# Split boundaries (calendar years). IFI flood events start 1978, so the
# flood-incidence model trains on 1978-2005 / validates 2006-2010 / tests 2011+.
SPLIT_TRAIN_END = 2005
SPLIT_VAL_END = 2010

# DDRPS weights: fixed baseline (paper Table) and AHP-expert variant.
DDRPS_BASELINE_WEIGHTS = {"Qd": 0.30, "Dd": 0.25, "Hd": 0.20, "Md": 0.15, "Vd": 0.10}
DDRPS_AHP_WEIGHTS = {"Qd": 0.40, "Dd": 0.25, "Hd": 0.15, "Md": 0.10, "Vd": 0.10}

# Conformal prediction
CONFORMAL_ALPHA = 0.10           # target miscoverage 10% -> 90% upper bound

# Allocation (pre-positioning)
ALLOCATION_BUDGET_UNITS = 200    # total relief units pre-positionable
ALLOCATION_UNIT_POP_COVERED = 5000   # one unit covers ~5k affected people
TRANSFER_FRACTION = 0.5          # neighbouring-district stock usable at 50% efficiency
UNAFFECTED_DEMAND_RATE = 0.02    # fallback affected-share when an event has no count

# Streaming
STREAM_SOCKET_PORT = 9995
OPENMETEO_POLL_SECONDS = 900
GDACS_POLL_SECONDS = 3600

# Storage backend for Spark jobs: "hdfs" inside the compose stack, "local"
# otherwise. Both are plain string switches — no filesystem paths from env.
STORAGE = os.environ.get("RADAR_STORAGE", "local")     # local | hdfs
HDFS_NAMENODE = os.environ.get("HDFS_NAMENODE", "hdfs://namenode:9000")
if not HDFS_NAMENODE.startswith("hdfs://"):
    HDFS_NAMENODE = "hdfs://namenode:9000"


def hdfs_uri(rel: str) -> str:
    """HDFS URI under the RADAR prefix (rel must be a plain relative name)."""
    clean = str(rel).strip("/")
    if ".." in clean.split("/"):
        raise ValueError("illegal relative path")
    return HDFS_NAMENODE.rstrip("/") + "/radar/" + clean


def imd_parquet_uri() -> str:
    """Rainfall parquet location for Spark readers (hdfs or local glob)."""
    if STORAGE == "hdfs":
        return hdfs_uri("raw/imd_parquet")
    return str(IMD_PARQUET_DIR / "rain_*.parquet")


def panel_uri() -> str:
    """District-day panel location for Spark readers/writers."""
    if STORAGE == "hdfs":
        return hdfs_uri("district_day_panel")
    return str(PANEL_DIR)


# Postgres serving layer (read by the Node backend research endpoints)
PG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": os.environ.get("DB_PORT", "5432"),
    "user": os.environ.get("DB_USER", "postgres"),
    "password": os.environ.get("DB_PASSWORD", "password"),
    "dbname": os.environ.get("DB_NAME", "aid_dras"),
}


def pg_uri() -> str:
    return (
        f"postgresql://{PG['user']}:{PG['password']}@{PG['host']}:{PG['port']}/{PG['dbname']}"
    )


if __name__ == "__main__":
    print(f"[config] RADAR root: {PROJECT_ROOT}")
    print(f"[config] storage: {STORAGE}")
    print(f"[config] {len(LEGACY_DISTRICTS)} legacy districts configured")
