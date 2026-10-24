import psycopg2
import pandas as pd
from app.config import DATABASE_URL

def load_incidents_from_db():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        query = "SELECT id, title, description, severity, status, disaster_type, geom, created_at FROM incidents;"
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df
    except Exception as e:
        print(f"Error reading Postgres incidents: {e}")
        # Fallback Mock Dataframe to compile training pipelines when DB is bootstrap-only
        return pd.DataFrame({
            "id": ["1", "2"],
            "severity": ["HIGH", "MEDIUM"],
            "disaster_type": ["FLOOD", "FIRE"],
            "latitude": [37.7749, 37.7899],
            "longitude": [-122.4194, -122.4094]
        })

def load_resources_from_db():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        query = "SELECT id, type, quantity, status, geom FROM resources;"
        df = pd.read_sql_query(query, conn)
        conn.close()
        return df
    except Exception as e:
        print(f"Error reading Postgres resources: {e}")
        return pd.DataFrame()

def load_weather_data(lat: float, lon: float):
    # Mock OpenWeatherMap feed
    return {
        "temp": 72.5,
        "humidity": 65.0,
        "wind_speed": 12.4,
        "rainfall": 25.0
    }
