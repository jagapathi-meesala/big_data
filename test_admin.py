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
        
    # 2. Get Users to find citizen Kalyan Ram
    users_url = "http://localhost:5000/api/v1/users"
    req_users = urllib.request.Request(users_url, headers={"Authorization": f"Bearer {token}"})
    try:
        res = urllib.request.urlopen(req_users)
        body = json.loads(res.read().decode())
        users = body.get("users", [])
        citizen = [u for u in users if u.get("email") == "kalyan.cit@aid-dras.gov"]
        if not citizen:
            print("Citizen Kalyan Ram not found.")
            return
        user_id = citizen[0].get("id")
        print(f"Found citizen user ID: {user_id}")
    except Exception as e:
        print("Failed to get users:", e)
        return

    # 3. Patch Status to SUSPENDED
    status_url = f"http://localhost:5000/api/v1/users/{user_id}/status"
    status_data = json.dumps({"status": "SUSPENDED"}).encode()
    req_status = urllib.request.Request(
        status_url, 
        data=status_data, 
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        method="PATCH"
    )
    try:
        res = urllib.request.urlopen(req_status)
        body = json.loads(res.read().decode())
        print("Status update successful:")
        print(json.dumps(body, indent=2))
    except Exception as e:
        if hasattr(e, 'read'):
            print("Status update failed:", e.read().decode())
        else:
            print("Status update failed:", e)

    # 4. Patch Status back to ACTIVE
    status_data_active = json.dumps({"status": "ACTIVE"}).encode()
    req_status_active = urllib.request.Request(
        status_url, 
        data=status_data_active, 
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        method="PATCH"
    )
    try:
        res = urllib.request.urlopen(req_status_active)
        body = json.loads(res.read().decode())
        print("Status restored back to ACTIVE successfully.")
    except Exception as e:
        print("Failed to restore status:", e)

if __name__ == "__main__":
    run_test()
