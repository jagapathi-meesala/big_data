import time
import random
import requests

API_URL = "http://localhost:5000/api/v1/iot"

devices = [
    {"deviceId": "RIVER_01", "deviceType": "RIVER_LEVEL", "lat": 16.49, "lon": 80.50},
    {"deviceId": "RAIN_04", "deviceType": "RAIN_GAUGE", "lat": 17.10, "lon": 79.15},
    {"deviceId": "AMB_09", "deviceType": "GPS_AMBULANCE", "lat": 13.85, "lon": 81.30}
]

def register_simulators():
    for dev in devices:
        try:
            res = requests.post(f"{API_URL}/register", json=dev, timeout=3)
            print(f"Registering simulator: {dev['deviceId']} - Response: {res.status_code}")
        except Exception as e:
            print(f"Register fail for {dev['deviceId']}: {e}")

def run_simulation_loop():
    print("Starting IoT simulation feeds...")
    register_simulators()
    
    # Perform a short telemetry dispatch run (5 loop steps)
    for _ in range(5):
        for dev in devices:
            if dev["deviceType"] == "RIVER_LEVEL":
                val = round(random.uniform(5.0, 18.0), 2)
            elif dev["deviceType"] == "RAIN_GAUGE":
                val = round(random.uniform(0.0, 120.0), 2)
            else:
                val = round(random.uniform(30.0, 90.0), 2)
                
            payload = {
                "deviceId": dev["deviceId"],
                "value": val
            }
            try:
                res = requests.post(f"{API_URL}/telemetry", json=payload, timeout=3)
                print(f"Ingested telemetry: {dev['deviceId']} -> Value: {val} - Status: {res.status_code}")
            except Exception as e:
                print(f"Telemetry ingest failed: {e}")
                
        time.sleep(1)

if __name__ == "__main__":
    run_simulation_loop()
