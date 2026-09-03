
from fastapi import APIRouter
import random

router = APIRouter()

CITIES_COORDS = [
  { "name": 'Hyderabad', "lat": 17.3850, "lon": 78.4867 },
  { "name": 'Warangal', "lat": 17.9689, "lon": 79.5941 },
  { "name": 'Khammam', "lat": 17.2473, "lon": 80.1514 },
  { "name": 'Karimnagar', "lat": 18.4386, "lon": 79.1288 },
  { "name": 'Nizamabad', "lat": 18.6725, "lon": 78.0941 },
  { "name": 'Vijayawada', "lat": 16.5062, "lon": 80.6480 },
  { "name": 'Visakhapatnam', "lat": 17.6868, "lon": 83.2185 },
  { "name": 'Guntur', "lat": 16.3067, "lon": 80.4365 },
  { "name": 'Tirupati', "lat": 13.6284, "lon": 79.4192 },
  { "name": 'Nellore', "lat": 14.4426, "lon": 79.9865 }
]

@router.get("/")
async def get_live_weather():
    weatherData = []
    for city in CITIES_COORDS:
        weatherData.append({
            "city": city["name"],
            "latitude": city["lat"],
            "longitude": city["lon"],
            "temp": 28.0 + random.uniform(-2, 2),
            "humidity": 70 + random.randint(-5, 5),
            "rainfall": round(random.uniform(0, 5), 2),
            "windSpeed": 4.5 + random.uniform(-1, 1),
            "pressure": 1012.0,
            "visibility": 10000,
            "alerts": 'No active warning'
        })
    return {"weather": weatherData}
