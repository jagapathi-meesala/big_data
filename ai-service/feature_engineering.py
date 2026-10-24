import os
import pandas as pd
import numpy as np
from pathlib import Path
from data_loader import scan_csv_datasets

TRAINING_DIR = Path(__file__).resolve().parents[1] / "datasets" / "training"
os.makedirs(TRAINING_DIR, exist_ok=True)

def build_master_dataset():
    datasets = scan_csv_datasets()
    
    disaster_df = datasets.get("disasterIND.csv")
    records = []
    
    # Process historical EM-DAT rows if available
    if disaster_df is not None:
        for _, row in disaster_df.iterrows():
            d_type = str(row.get("Disaster Type", "FLOOD")).upper()
            
            pop_density = np.random.uniform(100, 1500)
            rainfall = np.random.uniform(50, 300) if d_type == "FLOOD" else np.random.uniform(0, 50)
            wind_speed = np.random.uniform(30, 120) if d_type == "STORM" else np.random.uniform(5, 20)
            temp = np.random.uniform(60, 95)
            humidity = np.random.uniform(70, 99) if d_type == "FLOOD" else np.random.uniform(30, 70)
            
            # Map features to logical severity labels
            if d_type == "FLOOD":
                severity = "CRITICAL" if rainfall > 200 else ("HIGH" if rainfall > 120 else ("MEDIUM" if rainfall > 70 else "LOW"))
            elif d_type == "STORM":
                severity = "CRITICAL" if wind_speed > 100 else ("HIGH" if wind_speed > 75 else ("MEDIUM" if wind_speed > 45 else "LOW"))
            elif d_type == "FIRE":
                severity = "CRITICAL" if temp > 90 else ("HIGH" if temp > 78 else ("MEDIUM" if temp > 65 else "LOW"))
            else:
                severity = "CRITICAL" if pop_density > 1100 else ("HIGH" if pop_density > 750 else ("MEDIUM" if pop_density > 350 else "LOW"))
                
            records.append({
                "disaster_type": d_type,
                "population_density": pop_density,
                "rainfall": rainfall,
                "wind_speed": wind_speed,
                "temperature": temp,
                "humidity": humidity,
                "prev_history": np.random.choice([0, 1, 2, 3]),
                "severity": severity,
                "demand_food": int(pop_density * 0.15 + np.random.randint(10, 50)),
                "demand_water": int(pop_density * 0.25 + np.random.randint(10, 50)),
                "demand_medical": int(pop_density * 0.05 + np.random.randint(5, 20)),
                "distance_km": np.random.uniform(1, 45),
                "traffic_multiplier": np.random.choice([1.0, 1.2, 1.6, 2.3]),
                "road_condition": np.random.choice(["GOOD", "FLOODED", "BLOCKED"]),
                "rescue_time_mins": np.random.uniform(15, 180)
            })
            
    # Synthetic records fallback
    if not records:
        print("Historical dataset empty or corrupt, generating synthetic master data.")
        for _ in range(500):
            d_type = np.random.choice(["FLOOD", "FIRE", "EARTHQUAKE", "STORM"])
            pop_density = np.random.uniform(80, 2000)
            rainfall = np.random.uniform(60, 250) if d_type == "FLOOD" else np.random.uniform(0, 40)
            wind_speed = np.random.uniform(40, 150) if d_type == "STORM" else np.random.uniform(5, 20)
            temp = np.random.uniform(50, 110)
            humidity = np.random.uniform(80, 100) if d_type == "FLOOD" else np.random.uniform(20, 80)
            
            if d_type == "FLOOD":
                severity = "CRITICAL" if rainfall > 200 else ("HIGH" if rainfall > 120 else ("MEDIUM" if rainfall > 70 else "LOW"))
            elif d_type == "STORM":
                severity = "CRITICAL" if wind_speed > 100 else ("HIGH" if wind_speed > 75 else ("MEDIUM" if wind_speed > 45 else "LOW"))
            elif d_type == "FIRE":
                severity = "CRITICAL" if temp > 90 else ("HIGH" if temp > 78 else ("MEDIUM" if temp > 65 else "LOW"))
            else:
                severity = "CRITICAL" if pop_density > 1100 else ("HIGH" if pop_density > 750 else ("MEDIUM" if pop_density > 350 else "LOW"))
            
            records.append({
                "disaster_type": d_type,
                "population_density": pop_density,
                "rainfall": rainfall,
                "wind_speed": wind_speed,
                "temperature": temp,
                "humidity": humidity,
                "prev_history": np.random.choice([0, 1, 2]),
                "severity": severity,
                "demand_food": int(pop_density * 0.15 + np.random.randint(10, 50)),
                "demand_water": int(pop_density * 0.25 + np.random.randint(10, 50)),
                "demand_medical": int(pop_density * 0.05 + np.random.randint(5, 20)),
                "distance_km": np.random.uniform(1, 45),
                "traffic_multiplier": np.random.choice([1.0, 1.2, 1.6, 2.3]),
                "road_condition": np.random.choice(["GOOD", "FLOODED", "BLOCKED"]),
                "rescue_time_mins": np.random.uniform(15, 180)
            })
            
    master_df = pd.DataFrame(records)
    master_path = TRAINING_DIR / "master_dataset.csv"
    master_df.to_csv(master_path, index=False)
    print(f"Generated master training dataset at: {master_path} with {len(master_df)} rows.")
    return master_df
