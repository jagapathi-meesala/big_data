import os

BASE_DIR = "/home/jagapathi/Downloads/big/backend/src_py/routers"

dashboard_router_py = """
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from ..core.database import get_db
from ..core.models import Incident, Resource, User, ResourceType, ResourceStatus, IncidentStatus, SeverityLevel

router = APIRouter()

@router.get("/")
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    activeIncidents = await db.scalar(select(func.count(Incident.id)).where(Incident.status.notin_([IncidentStatus.RESOLVED, IncidentStatus.CLOSED])))
    volunteersCount = await db.scalar(select(func.count(User.id)).where(User.role == 'VOLUNTEER'))
    hospitalBeds = await db.scalar(select(func.sum(Resource.quantity)).where(Resource.type == ResourceType.HOSPITAL_BED, Resource.status == ResourceStatus.AVAILABLE))
    sheltersCount = await db.scalar(select(func.count(Resource.id)).where(Resource.type == ResourceType.SHELTER_CAPACITY, Resource.status == ResourceStatus.AVAILABLE))
    ambulancesCount = await db.scalar(select(func.count(Resource.id)).where(Resource.type == ResourceType.AMBULANCE, Resource.status == ResourceStatus.AVAILABLE))
    sosRequests = await db.scalar(select(func.count(Incident.id)).where(Incident.severity == SeverityLevel.CRITICAL, Incident.status == IncidentStatus.REPORTED))
    totalIncidents = await db.scalar(select(func.count(Incident.id)))
    resolvedIncidents = await db.scalar(select(func.count(Incident.id)).where(Incident.status == IncidentStatus.RESOLVED))
    
    result = await db.execute(select(Incident.severity, func.count(Incident.id).label('count')).group_by(Incident.severity))
    severityDistribution = [{"severity": row[0], "count": row[1]} for row in result.all()]
    
    return {
        "activeIncidents": activeIncidents or 0,
        "volunteers": volunteersCount or 0,
        "availableBeds": hospitalBeds or 0,
        "shelters": sheltersCount or 0,
        "ambulances": ambulancesCount or 0,
        "emergencyRequests": sosRequests or 0,
        "totalIncidents": totalIncidents or 0,
        "resolvedIncidents": resolvedIncidents or 0,
        "severityDistribution": severityDistribution
    }
"""
with open(os.path.join(BASE_DIR, "dashboard_router.py"), "w") as f:
    f.write(dashboard_router_py)

iot_router_py = """
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from ..core.database import get_db
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

async def check_table(db: AsyncSession):
    await db.execute(text('''
        CREATE TABLE IF NOT EXISTS iot_devices (
            id SERIAL PRIMARY KEY,
            device_id VARCHAR(100) UNIQUE NOT NULL,
            device_type VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'ACTIVE',
            last_value FLOAT,
            latitude FLOAT,
            longitude FLOAT,
            "createdAt" TIMESTAMP NOT NULL,
            "updatedAt" TIMESTAMP NOT NULL
        );
    '''))
    await db.commit()

@router.post("/register")
async def register_device(deviceId: str = Body(...), deviceType: str = Body(...), lat: float = Body(...), lon: float = Body(...), db: AsyncSession = Depends(get_db)):
    await check_table(db)
    await db.execute(text('''
        INSERT INTO iot_devices (device_id, device_type, status, latitude, longitude, "createdAt", "updatedAt")
        VALUES (:deviceId, :deviceType, 'ACTIVE', :lat, :lon, NOW(), NOW())
        ON CONFLICT (device_id) DO UPDATE
        SET latitude = :lat, longitude = :lon, "updatedAt" = NOW();
    '''), {"deviceId": deviceId, "deviceType": deviceType, "lat": lat, "lon": lon})
    await db.commit()
    return {"message": "IoT Device registered successfully."}

@router.post("/telemetry")
async def receive_telemetry(deviceId: str = Body(...), value: float = Body(...), db: AsyncSession = Depends(get_db)):
    await check_table(db)
    await db.execute(text('''
        UPDATE iot_devices
        SET last_value = :value, "updatedAt" = NOW()
        WHERE device_id = :deviceId;
    '''), {"deviceId": deviceId, "value": value})
    await db.commit()
    if value > 15.0:
        logger.warning(f"[WARNING] IoT Sensor {deviceId} reported critical alert value: {value}")
    return {"message": "Telemetry processed successfully."}

@router.get("/health")
async def get_health_summary(db: AsyncSession = Depends(get_db)):
    await check_table(db)
    result = await db.execute(text("SELECT * FROM iot_devices;"))
    devices = [dict(row._mapping) for row in result.all()]
    return {"devices": devices}
"""
with open(os.path.join(BASE_DIR, "iot_router.py"), "w") as f:
    f.write(iot_router_py)

notification_router_py = """
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from ..core.database import get_db

router = APIRouter()

async def check_table(db: AsyncSession):
    await db.execute(text('''
        CREATE TABLE IF NOT EXISTS system_notifications (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            type VARCHAR(50) DEFAULT 'INFO',
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
        );
    '''))
    await db.commit()

@router.get("/")
async def get_notifications(db: AsyncSession = Depends(get_db)):
    await check_table(db)
    result = await db.execute(text('''
        SELECT * FROM system_notifications
        ORDER BY "createdAt" DESC
        LIMIT 20;
    '''))
    notifications = [dict(row._mapping) for row in result.all()]
    return {"notifications": notifications}

@router.post("/")
async def create_notification(title: str = Body(...), message: str = Body(...), type: str = Body('INFO'), db: AsyncSession = Depends(get_db)):
    await check_table(db)
    await db.execute(text('''
        INSERT INTO system_notifications (title, message, type, "createdAt", "updatedAt")
        VALUES (:title, :message, :type, NOW(), NOW());
    '''), {"title": title, "message": message, "type": type})
    await db.commit()
    return {"message": "Notification created."}
"""
with open(os.path.join(BASE_DIR, "notification_router.py"), "w") as f:
    f.write(notification_router_py)

weather_router_py = """
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
"""
with open(os.path.join(BASE_DIR, "weather_router.py"), "w") as f:
    f.write(weather_router_py)
