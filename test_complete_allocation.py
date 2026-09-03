import urllib.request
import json

def run_test():
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
        print("Logged in successfully.")
    except Exception as e:
        print("Login failed:", e)
        return
        
    # 2. Get Active Allocations
    active_url = "http://localhost:5000/api/v1/allocations/active"
    req_active = urllib.request.Request(active_url, headers={"Authorization": f"Bearer {token}"})
    try:
        res = urllib.request.urlopen(req_active)
        allocations = json.loads(res.read().decode())
        if not allocations:
            print("No active allocations found to complete.")
            return
        alloc = allocations[0]
        alloc_id = alloc.get("id")
        print(f"Found active allocation ID: {alloc_id}")
    except Exception as e:
        print("Failed to get active allocations:", e)
        return

    # 3. Put to Complete
    complete_url = f"http://localhost:5000/api/v1/allocations/{alloc_id}"
    complete_data = json.dumps({
        "status": "COMPLETED"
    }).encode()
    req_complete = urllib.request.Request(
        complete_url, 
        data=complete_data, 
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        method="PUT"
    )
    try:
        res = urllib.request.urlopen(req_complete)
        body = json.loads(res.read().decode())
        print("Allocation completed successfully!")
        print("Response:", json.dumps(body, indent=2))
    except Exception as e:
        if hasattr(e, 'read'):
            print("Completion failed (body):", e.read().decode())
        else:
            print("Completion failed:", e)

if __name__ == "__main__":
    run_test()
