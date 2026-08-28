import os
import json
from pathlib import Path

# Base Paths
BIGDATA_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BIGDATA_DIR.parent
DATASETS_DIR = PROJECT_ROOT / "datasets"
RESULTS_DIR = BIGDATA_DIR / "results"
MODELS_DIR = BIGDATA_DIR / "models"
HDFS_SIMULATION_DIR = BIGDATA_DIR / "hdfs"

# Ensure directories exist
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)
HDFS_SIMULATION_DIR.mkdir(parents=True, exist_ok=True)

# Dataset file paths
HISTORICAL_RAINFALL_CSV = DATASETS_DIR / "Monthly Rainfall - flood Data 1901-2015.csv"
CENSUS_2011_CSV = DATASETS_DIR / "india-districts-census-2011.csv"
HOSPITALS_CSV = DATASETS_DIR / "hospitals.csv"
FINAL_DISTRICTS_CSV = DATASETS_DIR / "final_districts.csv"
PATIENTS_CSV = DATASETS_DIR / "patients_data.csv"

# Spark Parquet / Feature output
DISTRICT_TIME_PARQUET = RESULTS_DIR / "district_time_features.parquet"
DISTRICT_TIME_CSV = RESULTS_DIR / "district_time_features.csv"

# Learned weights output (produced by weight_learning.py)
LEARNED_WEIGHTS_PATH = RESULTS_DIR / "learned_ddrps_weights.json"

# DDRPS Default Weight Matrix (Revised Terminology)
DDRPS_WEIGHTS = {
    "Qd": 0.30,  # Predicted Extreme Precipitation Risk Probability
    "Dd": 0.25,  # Population Exposure Deficit
    "Hd": 0.20,  # Healthcare Capacity Deficit
    "Md": 0.15,  # Mobility Access Deficit (Household transport access proxy)
    "Vd": 0.10,  # Housing Vulnerability (Dilapidated dwellings proxy)
    # Backward compatibility aliases
    "Rd": 0.15,  # Mobility Access Deficit (formerly Road Deficit proxy)
    "Sd": 0.10,  # Housing Vulnerability (formerly Shelter Deficit proxy)
}

# Z-score anomaly threshold for extreme precipitation event definition
Z_SCORE_THRESHOLD = 1.5


def load_learned_weights() -> dict:
    """
    Load data-driven DDRPS weights produced by weight_learning.py.
    Falls back to the hardcoded DDRPS_WEIGHTS if the file doesn't exist yet.
    """
    if LEARNED_WEIGHTS_PATH.exists():
        with open(LEARNED_WEIGHTS_PATH, "r") as f:
            data = json.load(f)
        weights = data.get("learned_weights", {})
        # Ensure backward-compat aliases
        weights.setdefault('Rd', weights.get('Md', 0.15))
        weights.setdefault('Sd', weights.get('Vd', 0.10))
        return weights
    return DDRPS_WEIGHTS


if __name__ == "__main__":
    print(f"[config] Loaded AID-DRAS paths. Workspace root: {PROJECT_ROOT}")
