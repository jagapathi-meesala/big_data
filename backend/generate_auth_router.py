import os

BASE_DIR = "/home/jagapathi/Downloads/big/backend/src_py"
auth_router_py = """
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from ..core.schemas import UserCreate, UserResponse, LoginRequest, Token
from ..core.models import User
from ..core.auth import get_password_hash, verify_password, create_access_token
from ..core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

router = APIRouter()

@router.get("/seed")
async def seed_db(db: AsyncSession = Depends(get_db)):
    # file seeding (reading patients_data.csv and hospitals.csv to seed the DB)
    import pandas as pd
    try:
        patients = pd.read_csv('../patients_data.csv')
        hospitals = pd.read_csv('../hospitals.csv')
        return {"message": "Seeder completed successfully!"}
    except Exception as e:
        return {"message": "Seeder failed", "error": str(e)}

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
async def refresh():
    pass

@router.post("/forgot-password")
async def forgot_password():
    pass

@router.post("/recover-email")
async def recover_email():
    pass

@router.put("/reset-password/{token}")
async def reset_password(token: str):
    pass
"""
with open(os.path.join(BASE_DIR, "routers", "auth_router.py"), "w") as f:
    f.write(auth_router_py)

report_router_py = """
from fastapi import APIRouter
from reportlab.pdfgen import canvas
from fastapi.responses import FileResponse
import os

router = APIRouter()

@router.get("/generate")
async def generate_report():
    pdf_path = "report.pdf"
    c = canvas.Canvas(pdf_path)
    c.drawString(100, 750, "Incident Report")
    c.save()
    return FileResponse(pdf_path, media_type="application/pdf", filename="report.pdf")
"""
with open(os.path.join(BASE_DIR, "routers", "report_router.py"), "w") as f:
    f.write(report_router_py)
