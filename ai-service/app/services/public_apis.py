import requests
import typing

OPENMETEO_URL = "https://api.open-meteo.com/v1/forecast"
OSRM_URL = "http://router.project-osrm.org/route/v1/driving"
WORLDBANK_URL = "https://api.worldbank.org/v2/country/IND/indicator/SP.POP.TOTL"

def fetch_live_rainfall(lat: float, lon: float) -> dict:
    """
    Fetch live rainfall and weather from Open-Meteo Public API
    """
    try:
        resp = requests.get(OPENMETEO_URL, params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m,weather_code"
        }, timeout=4)
        if resp.status_code == 200:
            current = resp.json().get("current", {})
            return {
                "temperature": current.get("temperature_2m", 28.0),
                "humidity": current.get("relative_humidity_2m", 65.0),
                "rainfall": current.get("precipitation", 0.0),
                "wind_speed": current.get("wind_speed_10m", 10.0),
                "weather_code": current.get("weather_code", 0)
            }
    except Exception as e:
        print(f"[Public-APIs Py] Open-Meteo query notice: {e}")

    return {
        "temperature": 28.0,
        "humidity": 65.0,
        "rainfall": 0.0,
        "wind_speed": 10.0,
        "weather_code": 0
    }

def fetch_road_distance_osrm(origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> dict:
    """
    Fetch live road routing distance & duration from OSRM Public API
    """
    try:
        url = f"{OSRM_URL}/{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
        resp = requests.get(url, params={"overview": "false"}, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "Ok" and data.get("routes"):
                route = data["routes"][0]
                dist_km = round(route["distance"] / 1000.0, 2)
                dur_mins = round(route["duration"] / 60.0, 2)
                avg_speed = round(dist_km / (dur_mins / 60.0), 1) if dur_mins > 0 else 40.0
                return {
                    "distance_km": dist_km,
                    "duration_mins": dur_mins,
                    "avg_speed_kmh": avg_speed,
                    "road_accessibility_score": min(1.0, max(0.1, round(avg_speed / 80.0, 3)))
                }
    except Exception as e:
        print(f"[Public-APIs Py] OSRM query notice: {e}")

    return {
        "distance_km": 50.0,
        "duration_mins": 60.0,
        "avg_speed_kmh": 50.0,
        "road_accessibility_score": 0.50
    }

def fetch_worldbank_population() -> dict:
    """
    Fetch national population from World Bank Open Data API
    """
    try:
        resp = requests.get(WORLDBANK_URL, params={"format": "json"}, timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 1 and len(data[1]) > 0:
                record = data[1][0]
                return {
                    "country": record.get("country", {}).get("value", "India"),
                    "population": record.get("value", 1428627663),
                    "year": record.get("date", "2025")
                }
    except Exception as e:
        print(f"[Public-APIs Py] World Bank query notice: {e}")

    return {
        "country": "India",
        "population": 1428627663,
        "year": "2025"
    }
