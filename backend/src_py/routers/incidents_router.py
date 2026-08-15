
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from ..core.database import get_db
from ..core.models import Incident, IncidentStatus, SeverityLevel, DisasterType
import datetime

router = APIRouter()

@router.post("/")
async def create_incident(title: str = Body(...), latitude: float = Body(...), longitude: float = Body(...), description: str = Body(None), severity: str = Body('MEDIUM'), disasterType: str = Body('OTHER'), db: AsyncSession = Depends(get_db)):
    geom = f"SRID=4326;POINT({longitude} {latitude})"
    new_incident = Incident(
        title=title, description=description, severity=severity, disasterType=disasterType, geom=geom
    )
    db.add(new_incident)
    await db.commit()
    await db.refresh(new_incident)
    return {"message": "Incident reported successfully.", "incident": new_incident}

@router.get("/")
async def get_incidents(page: int = 1, limit: int = 10, db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * limit
    result = await db.execute(select(Incident).limit(limit).offset(offset))
    incidents = result.scalars().all()
    count_res = await db.execute(select(func.count(Incident.id)))
    count = count_res.scalar()
    return {"totalItems": count, "totalPages": (count // limit) + 1, "currentPage": page, "incidents": incidents}

@router.put("/{id}")
async def update_incident(id: str, title: str = Body(None), status: str = Body(None), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident).where(Incident.id == id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    if title: incident.title = title
    if status: incident.status = status
    await db.commit()
    return {"message": "Incident updated successfully.", "incident": incident}

@router.delete("/{id}")
async def delete_incident(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident).where(Incident.id == id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    await db.delete(incident)
    await db.commit()
    return {"message": "Incident deleted successfully."}

@router.patch("/{id}/status")
async def update_incident_status(id: str, status: str = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Incident).where(Incident.id == id))
    incident = result.scalars().first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    incident.status = status
    await db.commit()
    return {"message": "Incident status updated successfully.", "incident": incident}
