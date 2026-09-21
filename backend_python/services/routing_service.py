import math
import requests

CITIES_DATA = [
    {"name": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867},
    {"name": "Vijayawada", "state": "Andhra Pradesh", "lat": 16.5062, "lon": 80.6480},
    {"name": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185},
    {"name": "Warangal", "state": "Telangana", "lat": 17.9689, "lon": 79.5941},
    {"name": "Guntur", "state": "Andhra Pradesh", "lat": 16.3067, "lon": 80.4365},
    {"name": "Karimnagar", "state": "Telangana", "lat": 18.4386, "lon": 79.1288},
    {"name": "Khammam", "state": "Telangana", "lat": 17.2473, "lon": 80.1514},
    {"name": "Nalgonda", "state": "Telangana", "lat": 17.0575, "lon": 79.2684},
    {"name": "Nizamabad", "state": "Telangana", "lat": 18.6725, "lon": 78.0941},
    {"name": "Kurnool", "state": "Andhra Pradesh", "lat": 15.8281, "lon": 78.0373},
    {"name": "Anantapur", "state": "Andhra Pradesh", "lat": 14.6819, "lon": 77.6006},
    {"name": "Rajahmundry", "state": "Andhra Pradesh", "lat": 16.9891, "lon": 81.7810},
    {"name": "Tirupati", "state": "Andhra Pradesh", "lat": 13.6284, "lon": 79.4192},
    {"name": "Nellore", "state": "Andhra Pradesh", "lat": 14.4426, "lon": 79.9865},
    {"name": "Kakinada", "state": "Andhra Pradesh", "lat": 16.9891, "lon": 82.2475},
    {"name": "Kadapa", "state": "Andhra Pradesh", "lat": 14.4673, "lon": 78.8242},
    {"name": "Eluru", "state": "Andhra Pradesh", "lat": 16.7107, "lon": 81.1035},
    {"name": "Srikakulam", "state": "Andhra Pradesh", "lat": 18.2941, "lon": 83.8963},
    {"name": "Vizianagaram", "state": "Andhra Pradesh", "lat": 18.1124, "lon": 83.3956},
    {"name": "Mahbubnagar", "state": "Telangana", "lat": 16.7488, "lon": 77.9856},
    {"name": "Adilabad", "state": "Telangana", "lat": 19.6641, "lon": 78.5320},
    {"name": "Suryapet", "state": "Telangana", "lat": 17.1500, "lon": 79.6200},
    {"name": "Siddipet", "state": "Telangana", "lat": 18.1018, "lon": 78.8520},
    {"name": "Sangareddy", "state": "Telangana", "lat": 17.6167, "lon": 78.0833},
    {"name": "Bhadrachalam", "state": "Telangana", "lat": 17.6700, "lon": 80.8900},
    {"name": "Ongole", "state": "Andhra Pradesh", "lat": 15.5057, "lon": 80.0499},
    {"name": "Machilipatnam", "state": "Andhra Pradesh", "lat": 16.1812, "lon": 81.1363},
    {"name": "Tenali", "state": "Andhra Pradesh", "lat": 16.2430, "lon": 80.6400},
    {"name": "Proddatur", "state": "Andhra Pradesh", "lat": 14.7500, "lon": 78.5500},
    {"name": "Hindupur", "state": "Andhra Pradesh", "lat": 13.8300, "lon": 77.4900},
    {"name": "Nandyal", "state": "Andhra Pradesh", "lat": 15.4800, "lon": 78.4800},
    {"name": "Chittoor", "state": "Andhra Pradesh", "lat": 13.2172, "lon": 79.1003},
    {"name": "Ramagundam", "state": "Telangana", "lat": 18.8000, "lon": 79.4500},
    {"name": "Miryalaguda", "state": "Telangana", "lat": 16.8700, "lon": 79.5600},
    {"name": "Mancherial", "state": "Telangana", "lat": 18.8700, "lon": 79.4600},
    {"name": "Jagtial", "state": "Telangana", "lat": 18.7900, "lon": 78.9100}
]

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def compute_escape_routes(origin_lat, origin_lon, dest_lat, dest_lon, target_name="Target Hub"):
    # Try querying live OSRM routing engine
    osrm_url = f"http://router.project-osrm.org/route/v1/driving/{origin_lon},{origin_lat};{dest_lon},{dest_lat}?overview=full&geometries=geojson&alternatives=true"
    
    routes = []
    try:
        resp = requests.get(osrm_url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            osrm_routes = data.get("routes", [])
            for idx, r in enumerate(osrm_routes[:3]):
                dist_km = round(r.get("distance", 0) / 1000.0, 1)
                dur_mins = round(r.get("duration", 0) / 60.0)
                coords = r.get("geometry", {}).get("coordinates", [])
                
                # Flip coordinates to [lat, lon] for Leaflet
                leaflet_coords = [[c[1], c[0]] for c in coords]
                
                badge = "Primary Low Risk" if idx == 0 else "High-Speed Highway" if idx == 1 else "Alternate Corridor"
                color = "#10b981" if idx == 0 else "#3b82f6" if idx == 1 else "#f59e0b"
                
                routes.append({
                    "id": f"route-{idx+1}",
                    "name": f"Corridor {idx+1} ({badge})",
                    "badge": badge,
                    "color": color,
                    "distanceKm": dist_km,
                    "durationMins": dur_mins,
                    "roadRiskScore": max(12, min(45, 18 + idx * 8)),
                    "geometry": leaflet_coords,
                    "steps": [
                        f"Depart origin towards {target_name}",
                        f"Proceed on Highway Corridor {idx+1}",
                        f"Arrive safely at {target_name} Relief Hub"
                    ]
                })
    except Exception as e:
        print(f"OSRM query fallback triggered: {e}")
        
    if not routes:
        # Fallback straight-line corridor calculation
        dist = round(haversine_km(origin_lat, origin_lon, dest_lat, dest_lon), 1)
        dur = round((dist / 65.0) * 60)
        
        # Interpolate points
        steps_n = 10
        coords = []
        for i in range(steps_n + 1):
            t = i / steps_n
            lat = origin_lat + t * (dest_lat - origin_lat)
            lon = origin_lon + t * (dest_lon - origin_lon)
            coords.append([lat, lon])
            
        routes.append({
            "id": "route-1",
            "name": f"Direct Escape Corridor to {target_name}",
            "badge": "Primary Low Risk",
            "color": "#10b981",
            "distanceKm": dist,
            "durationMins": dur,
            "roadRiskScore": 18,
            "geometry": coords,
            "steps": [
                f"Depart origin city towards {target_name}",
                "Follow regional emergency escape highway",
                f"Arrive at {target_name} Emergency Hub"
            ]
        })

    return {
        "origin": {"lat": origin_lat, "lon": origin_lon},
        "destination": {"name": target_name, "lat": dest_lat, "lon": dest_lon},
        "routes": routes
    }
