import os
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import date, timedelta

ROOT_DIR = Path(__file__).resolve().parents[2]
DATASETS_DIR = ROOT_DIR / "datasets"
RAW_DIR = DATASETS_DIR / "raw"
IMD_PARQUET_DIR = RAW_DIR / "imd_parquet"

os.makedirs(IMD_PARQUET_DIR, exist_ok=True)

print("Generating mock district_grid_map.csv...")
districts = ["Hyderabad", "Visakhapatnam", "Vijayawada", "Warangal", "Guntur"]
grid_data = []
for d in districts:
    for i in range(5):
        grid_data.append({
            "district": d,
            "lat": 17.0 + np.random.uniform(0, 1),
            "lon": 78.0 + np.random.uniform(0, 1),
            "weight": np.random.uniform(0.5, 1.5)
        })
pd.DataFrame(grid_data).to_csv(RAW_DIR / "district_grid_map.csv", index=False)

print("Generating mock flood_events.csv...")
flood_data = []
for d in districts:
    flood_data.append({
        "district": d,
        "date_start": "2022-08-01",
        "date_end": "2022-08-05"
    })
pd.DataFrame(flood_data).to_csv(RAW_DIR / "flood_events.csv", index=False)

print("Generating mock oni_monthly.csv...")
dates = pd.date_range(start="2000-01-01", end="2025-01-01", freq="ME")
oni_data = pd.DataFrame({
    "date": dates,
    "oni": np.random.uniform(-2, 2, size=len(dates))
})
oni_data.to_csv(RAW_DIR / "oni_monthly.csv", index=False)

print("Generating mock imd_parquet files...")
for year in [2010, 2022]:
    dates = pd.date_range(start=f"{year}-01-01", end=f"{year}-12-31", freq="D")
    rain_data = []
    for d in dates:
        for row in grid_data:
            rain_data.append({
                "date": d,
                "lat": row["lat"],
                "lon": row["lon"],
                "rain_mm": np.random.uniform(0, 100) if d.month in [7,8] else np.random.uniform(0, 10)
            })
    df = pd.DataFrame(rain_data)
    df.to_parquet(IMD_PARQUET_DIR / f"rain_{year}.parquet", index=False)

print("Mock datasets generated successfully.")
