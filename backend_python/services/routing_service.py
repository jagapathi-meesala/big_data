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

def generate_curved_geometry(p1, p2, curve_factor=0.06, num_points=25):
    lat1, lon1 = p1[0], p1[1]
    lat2, lon2 = p2[0], p2[1]
    
    mid_lat = (lat1 + lat2) / 2.0
    mid_lon = (lon1 + lon2) / 2.0
    
    d_lat = lat2 - lat1
    d_lon = lon2 - lon1
    
    norm_lat = -d_lon * curve_factor
    norm_lon = d_lat * curve_factor
    
    control_lat = mid_lat + norm_lat
    control_lon = mid_lon + norm_lon
    
    points = []
    for i in range(num_points + 1):
        t = i / float(num_points)
        lat = (1 - t)**2 * lat1 + 2 * (1 - t) * t * control_lat + t**2 * lat2
        lon = (1 - t)**2 * lon1 + 2 * (1 - t) * t * control_lon + t**2 * lat2
        points.append([round(lat, 5), round(lon, 5)])
    return points

def compute_escape_routes(origin_lat, origin_lon, dest_lat, dest_lon, target_name="Target Hub"):
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
                leaflet_coords = [[c[1], c[0]] for c in coords]
                
                badge = "Primary Low Risk" if idx == 0 else "High-Speed Highway" if idx == 1 else "Alternate Relief Corridor"
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
                    "polyline": leaflet_coords,
                    "steps": [
                        f"Depart origin towards {target_name}",
                        f"Proceed on Highway Corridor {idx+1}",
                        f"Arrive safely at {target_name} Relief Hub"
                    ]
                })
    except Exception as e:
        print(f"OSRM query fallback triggered: {e}")
        
    p1 = [origin_lat, origin_lon]
    p2 = [dest_lat, dest_lon]
    base_dist = round(haversine_km(origin_lat, origin_lon, dest_lat, dest_lon), 1)

    # Ensure ALWAYS 3 Corridors are returned
    if len(routes) < 3:
        configs = [
            {"badge": "Primary Low Risk", "color": "#10b981", "curve": 0.0, "risk": 18, "speed_mult": 1.0},
            {"badge": "High-Speed Highway", "color": "#3b82f6", "curve": 0.07, "risk": 26, "speed_mult": 1.15},
            {"badge": "Alternate Relief Corridor", "color": "#f59e0b", "curve": -0.07, "risk": 34, "speed_mult": 0.9}
        ]

        existing_count = len(routes)
        for idx in range(existing_count, 3):
            cfg = configs[idx]
            geom = generate_curved_geometry(p1, p2, curve_factor=cfg["curve"])
            c_dist = round(base_dist * (1.0 + abs(cfg["curve"]) * 0.8), 1)
            c_dur = round((c_dist / (60.0 * cfg["speed_mult"])) * 60)

            routes.append({
                "id": f"route-{idx+1}",
                "name": f"Corridor {idx+1} ({cfg['badge']})",
                "badge": cfg["badge"],
                "color": cfg["color"],
                "distanceKm": c_dist,
                "durationMins": c_dur,
                "roadRiskScore": cfg["risk"],
                "geometry": geom,
                "polyline": geom,
                "steps": [
                    f"Depart origin city towards {target_name}",
                    f"Follow regional emergency escape highway (Corridor {idx+1})",
                    f"Arrive at {target_name} Emergency Hub"
                ]
            })

    return {
        "origin": {"lat": origin_lat, "lon": origin_lon},
        "destination": {"name": target_name, "lat": dest_lat, "lon": dest_lon},
        "routes": routes
    }
