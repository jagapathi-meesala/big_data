import urllib.request
import json

def seed():
    seed_url = "http://localhost:5000/api/v1/auth/seed"
    try:
        res = urllib.request.urlopen(seed_url)
        body = json.loads(res.read().decode())
        print("Seeder response:", json.dumps(body, indent=2))
    except Exception as e:
        if hasattr(e, 'read'):
            print("Seeder request failed (body):", e.read().decode())
        else:
            print("Seeder request failed:", e)

if __name__ == "__main__":
    seed()
