import urllib.request
import json

def check():
    # 1. Login
    login_url = "http://localhost:5000/api/v1/auth/login"
    login_data = json.dumps({
        "email": "jagapathi@aid-dras.gov",
        "password": "password"
    }).encode()
    
    req = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json"})
    try:
        res = urllib.request.urlopen(req)
        body = json.loads(res.read().decode())
        token = body.get("token")
    except Exception as e:
        print("Login failed:", e)
        return
        
    # 2. Get all HOSPITAL_BED resources
    res_url = "http://localhost:5000/api/v1/resources?type=HOSPITAL_BED&limit=200"
    req_res = urllib.request.Request(res_url, headers={"Authorization": f"Bearer {token}"})
    try:
        res = urllib.request.urlopen(req_res)
        body = json.loads(res.read().decode())
        resources = body.get("resources", [])
        print("Total Hospital Bed Resources in Database:", len(resources))
        for idx, hosp in enumerate(resources, 1):
            coords = hosp.get("geom", {}).get("coordinates", [])
            print(f"{idx}. {hosp.get('name')} | District: {hosp.get('district')} | Coords: {coords} | Status: {hosp.get('status')}")
    except Exception as e:
        print("Failed to get resources:", e)

if __name__ == "__main__":
    check()
