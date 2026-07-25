import urllib.request
import json

def run_test():
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
        print("Logged in successfully.")
    except Exception as e:
        print("Login failed:", e)
        return
        
    inc_url = "http://localhost:5000/api/v1/incidents?limit=1"
    req_inc = urllib.request.Request(inc_url, headers={"Authorization": f"Bearer {token}"})
    try:
        res = urllib.request.urlopen(req_inc)
        body = json.loads(res.read().decode())
        incidents = body.get("incidents", [])
        if not incidents:
            print("No incidents found to optimize.")
            return
        incident_id = incidents[0].get("id")
        title = incidents[0].get("title")
        print(f"Testing optimizer with incident: '{title}' (ID: {incident_id})")
    except Exception as e:
        print("Failed to get incidents:", e)
        return

    opt_url = "http://localhost:5000/api/v1/allocations/optimize"
    opt_data = json.dumps({
        "incidentId": incident_id
    }).encode()
    req_opt = urllib.request.Request(
        opt_url, 
        data=opt_data, 
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    try:
        res = urllib.request.urlopen(req_opt)
        body = json.loads(res.read().decode())
        print("Optimization completed successfully!")
        print("Response:", json.dumps(body, indent=2))
    except Exception as e:
        if hasattr(e, 'read'):
            print("Optimization failed (body):", e.read().decode())
        else:
            print("Optimization failed:", e)

if __name__ == "__main__":
    run_test()
