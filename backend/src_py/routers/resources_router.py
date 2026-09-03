
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from ..core.database import get_db
from ..core.models import Resource, User, ResourceStatus

router = APIRouter()

@router.post("/")
async def create_resource(type: str = Body(...), quantity: int = Body(...), latitude: float = Body(...), longitude: float = Body(...), db: AsyncSession = Depends(get_db)):
    admin_user = await db.execute(select(User).limit(1))
    owner = admin_user.scalars().first()
    geom = f"SRID=4326;POINT({longitude} {latitude})"
    res = Resource(type=type, quantity=quantity, geom=geom, ownerId=owner.id if owner else None)
    db.add(res)
    await db.commit()
    await db.refresh(res)
    return {"message": "Resource registered successfully.", "resource": res}

@router.get("/")
async def get_resources(page: int = 1, limit: int = 10, db: AsyncSession = Depends(get_db)):
    offset = (page - 1) * limit
    result = await db.execute(select(Resource).limit(limit).offset(offset))
    resources = result.scalars().all()
    count_res = await db.execute(select(func.count(Resource.id)))
    count = count_res.scalar()
    return {"totalItems": count, "totalPages": (count // limit) + 1, "currentPage": page, "resources": resources}

@router.put("/{id}")
async def update_resource(id: str, quantity: int = Body(None), status: str = Body(None), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resource).where(Resource.id == id))
    res = result.scalars().first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found.")
    if quantity is not None: res.quantity = quantity
    if status: res.status = status
    await db.commit()
    return {"message": "Resource updated successfully.", "resource": res}

@router.delete("/{id}")
async def delete_resource(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resource).where(Resource.id == id))
    res = result.scalars().first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found.")
    await db.delete(res)
    await db.commit()
    return {"message": "Resource deleted successfully."}

@router.patch("/{id}/location")
async def update_resource_location(id: str, latitude: float = Body(...), longitude: float = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resource).where(Resource.id == id))
    res = result.scalars().first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found.")
    res.geom = f"SRID=4326;POINT({longitude} {latitude})"
    await db.commit()
    return {"message": "Resource location updated successfully.", "resource": res}
