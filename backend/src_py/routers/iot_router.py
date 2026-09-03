
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
