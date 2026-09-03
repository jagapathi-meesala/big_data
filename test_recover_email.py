import urllib.request
import json

def run_test():
    url = "http://localhost:5000/api/v1/auth/recover-email"
    # Query with Jagapathi's seeded phone number: '+919876543210'
    payload = json.dumps({
        "phoneNumber": "+919876543210"
    }).encode()
    
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        res = urllib.request.urlopen(req)
        body = json.loads(res.read().decode())
        print("Recovery search successful:")
        print(json.dumps(body, indent=2))
    except Exception as e:
        if hasattr(e, 'read'):
            print("Recovery failed (body):", e.read().decode())
        else:
            print("Recovery failed:", e)

if __name__ == "__main__":
    run_test()
