
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..core.database import get_db
from ..core.models import Allocation, Incident, Resource, User

router = APIRouter()

@router.post("/")
async def create_allocation(incidentId: str = Body(...), resourceId: str = Body(...), quantityAllocated: int = Body(...), db: AsyncSession = Depends(get_db)):
    admin_user = await db.execute(select(User).limit(1))
    owner = admin_user.scalars().first()
    alloc = Allocation(incidentId=incidentId, resourceId=resourceId, quantityAllocated=quantityAllocated, allocatedBy=owner.id if owner else None)
    db.add(alloc)
    await db.commit()
    await db.refresh(alloc)
    return {"message": "Allocation created", "allocation": alloc}

@router.get("/")
async def get_allocations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Allocation).limit(50))
    return {"allocations": result.scalars().all()}
