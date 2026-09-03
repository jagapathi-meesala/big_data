
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
