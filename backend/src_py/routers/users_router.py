
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..core.database import get_db
from ..core.models import User

router = APIRouter()

@router.get("/")
async def get_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).limit(50))
    return {"users": result.scalars().all()}

@router.patch("/{id}/status")
async def update_user_status(id: str, status: str = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.status = status
    await db.commit()
    return {"message": "User status updated successfully.", "user": user}

@router.patch("/{id}/role")
async def assign_role(id: str, role: str = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    await db.commit()
    return {"message": "User role updated successfully.", "user": user}

@router.delete("/{id}")
async def delete_user(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return {"message": "User deleted successfully."}
