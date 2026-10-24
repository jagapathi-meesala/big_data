"""Live telemetry producer — Open-Meteo current weather + GDACS alerts.

Polls the 23 legacy district centroids and pushes JSON lines to the Spark
Structured Streaming socket source (localhost:9995) and to a local JSONL
landing file (backup replay source).

Line schemas:
  {"type": "weather", "district", "ts", "lat", "lon", "rain_mm", "temp_c",
   "humidity", "wind_kmh", "pressure_hpa"}
  {"type": "gdacs", "district", "ts", "event_type", "alert_level", "name"}

Usage: python producer.py [--once]
"""
import argparse
import json
import socket
import sys
import time
from datetime import datetime, timezone

import _bootstrap  # noqa: F401

from common.http import safe_fetch
from common.io import read_csv

from config import (
    DISTRICT_CENTROIDS_CSV,
    GDACS_POLL_SECONDS,
    OPENMETEO_POLL_SECONDS,
    STREAM_ALERTS_DIR,
    STREAM_SOCKET_PORT,
)

OPENMETEO_URL = (
    "https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
    "&current=temperature_2m,relative_humidity_2m,precipitation,"
    "weather_code,wind_speed_10m,surface_pressure&timezone=UTC"
)
GDACS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP"

REGION_BBOX = (74.0, 12.5, 85.0, 20.5)   # lon_min, lat_min, lon_max, lat_max


def load_centroids() -> "dict[str, tuple[float, float]]":
    df = read_csv(DISTRICT_CENTROIDS_CSV)
    return {
        str(r["district"]): (float(r["lat"]), float(r["lon"]))
        for _, r in df.iterrows()
    }


def poll_weather(centroids) -> list[dict]:
    out = []
    for district, (lat, lon) in centroids.items():
        try:
            resp = safe_fetch(OPENMETEO_URL.format(lat=lat, lon=lon), timeout=30)
            resp.raise_for_status()
            cur = resp.json().get("current", {})
            resp.close()
            out.append(
                {
                    "type": "weather",
                    "district": district,
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "lat": lat,
                    "lon": lon,
                    "rain_mm": float(cur.get("precipitation") or 0.0),
                    "temp_c": float(cur.get("temperature_2m") or 0.0),
                    "humidity": float(cur.get("relative_humidity_2m") or 0.0),
                    "wind_kmh": float(cur.get("wind_speed_10m") or 0.0),
                    "pressure_hpa": float(cur.get("surface_pressure") or 0.0),
                }
            )
        except Exception as exc:
            print(f"[producer] weather {district}: {exc}")
    return out


def poll_gdacs(centroids) -> list[dict]:
    lon0, lat0, lon1, lat1 = REGION_BBOX
    out = []
    try:
        resp = safe_fetch(GDACS_URL, timeout=60)
        resp.raise_for_status()
        events = resp.json()
        if isinstance(events, dict):
            events = events.get("events", [])
        resp.close()
    except Exception as exc:
        print(f"[producer] gdacs: {exc}")
        return out
    for ev in events:
        try:
            lat = float(ev.get("latitude"))
            lon = float(ev.get("longitude"))
        except (TypeError, ValueError):
            continue
        if not (lat0 <= lat <= lat1 and lon0 <= lon <= lon1):
            continue
        nearest = min(
            centroids.items(),
            key=lambda kv: (kv[1][0] - lat) ** 2 + (kv[1][1] - lon) ** 2,
        )
        out.append(
            {
                "type": "gdacs",
                "district": nearest[0],
                "ts": str(ev.get("isodate", "")),
                "event_type": str(ev.get("eventtype", "")),
                "alert_level": str(ev.get("alertlevel", "")),
                "name": str(ev.get("eventname", ""))[:120],
            }
        )
    return out


def connect_socket(port: int) -> socket.socket:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(("localhost", port))
    return s


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--once", action="store_true", help="poll once and exit")
    args = ap.parse_args()

    centroids = load_centroids()
    print(f"[producer] {len(centroids)} districts; socket localhost:{STREAM_SOCKET_PORT}")
    STREAM_ALERTS_DIR.mkdir(parents=True, exist_ok=True)
    landing = STREAM_ALERTS_DIR / "producer_landing.jsonl"

    sock = None
    last_gdacs = 0.0
    try:
        while True:
            lines = poll_weather(centroids)
            if time.time() - last_gdacs > GDACS_POLL_SECONDS:
                lines += poll_gdacs(centroids)
                last_gdacs = time.time()
            if lines:
                payload = "\n".join(json.dumps(l) for l in lines) + "\n"
                with open(landing, "a", encoding="utf-8") as f:
                    f.write(payload)
                if sock is None:
                    try:
                        sock = connect_socket(STREAM_SOCKET_PORT)
                    except OSError as exc:
                        print(f"[producer] socket unavailable ({exc}); "
                              "landing file keeps buffering")
                if sock is not None:
                    try:
                        sock.sendall(payload.encode("utf-8"))
                    except OSError:
                        print("[producer] socket lost; will reconnect")
                        try:
                            sock.close()
                        except OSError:
                            pass
                        sock = None
                print(f"[producer] emitted {len(lines)} events")
            if args.once:
                break
            time.sleep(OPENMETEO_POLL_SECONDS)
    except KeyboardInterrupt:
        print("[producer] stopped")
    finally:
        if sock is not None:
            sock.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
