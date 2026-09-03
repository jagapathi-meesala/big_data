
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body, Path
from pydantic import BaseModel, EmailStr
from ..core.schemas import UserCreate, UserResponse, LoginRequest, Token
from ..core.models import User
from ..core.auth import get_password_hash, verify_password, create_access_token
from ..core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update
import uuid
import datetime

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=user.email,
        passwordHash=get_password_hash(user.password),
        firstName=user.firstName,
        lastName=user.lastName,
        phoneNumber=user.phoneNumber,
        role=user.role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()
    if not user or not verify_password(req.password, user.passwordHash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh")
async def refresh(token: str = Body(..., embed=True), db: AsyncSession = Depends(get_db)):
    # Simulate refresh logic
    return {"access_token": create_access_token({"sub": "refresh"}), "token_type": "bearer"}

@router.post("/forgot-password")
async def forgot_password(email: EmailStr = Body(..., embed=True), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.passwordResetToken = str(uuid.uuid4())
    user.passwordResetExpires = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    await db.commit()
    return {"message": "Password reset link sent"}

@router.post("/recover-email")
async def recover_email(phoneNumber: str = Body(..., embed=True), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phoneNumber == phoneNumber))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"email": user.email}

@router.put("/reset-password/{token}")
async def reset_password(token: str, newPassword: str = Body(..., embed=True), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.passwordResetToken == token))
    user = result.scalars().first()
    if not user or user.passwordResetExpires < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    user.passwordHash = get_password_hash(newPassword)
    user.passwordResetToken = None
    user.passwordResetExpires = None
    await db.commit()
    return {"message": "Password reset successful"}
