import os
import glob
import pandas as pd
import psycopg2
from app.config import DATABASE_URL

DATASETS_DIR = "/home/jagapathi/Downloads/big/datasets"

def scan_csv_datasets():
    """
    Scans the datasets directory recursively and loads CSV files.
    """
    csv_files = glob.glob(os.path.join(DATASETS_DIR, "**/*.csv"), recursive=True)
    datasets = {}
    
    for file_path in csv_files:
        name = os.path.basename(file_path)
        # Skip temporary download files
        if ".crdownload" in name or "master_dataset.csv" in name:
            continue
        try:
            df = pd.read_csv(file_path)
            # Basic validation & cleaning
            df.drop_duplicates(inplace=True)
            # Remove entirely empty rows
            df.dropna(how='all', inplace=True)
            datasets[name] = df
            print(f"Loaded and cleaned dataset: {name} (Rows: {df.shape[0]}, Cols: {df.shape[1]})")
        except Exception as e:
            print(f"Error loading CSV {name}: {e}")
            
    return datasets

def load_incidents_from_db():
    """
    Loads incidents directly from PostgreSQL, with a fallback if connection fails.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL)
        query = "SELECT id, title, description, severity, status, disaster_type, geom, created_at FROM incidents;"
        df = pd.read_sql_query(query, conn)
        conn.close()
        # Extract coordinates from GeoJSON/Geometry column if possible
        return df
    except Exception as e:
        print(f"PostgreSQL connection failed, using fallback mock: {e}")
        return pd.DataFrame({
            "severity": ["HIGH", "MEDIUM", "LOW", "CRITICAL", "HIGH"],
            "disaster_type": ["FLOOD", "FIRE", "EARTHQUAKE", "LANDSLIDE", "FLOOD"],
            "population_density": [500, 200, 150, 800, 600],
            "rainfall": [80, 10, 0, 120, 95],
            "wind_speed": [15, 25, 5, 10, 12],
            "temperature": [78, 95, 68, 70, 82],
            "humidity": [85, 40, 50, 90, 88],
            "prev_history": [1, 0, 2, 0, 1]
        })
