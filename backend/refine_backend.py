import os

BASE_DIR = "/home/jagapathi/Downloads/big/backend/src_py"

auth_router_py = """
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
"""
with open(os.path.join(BASE_DIR, "routers", "auth_router.py"), "w") as f:
    f.write(auth_router_py)

incidents_router_py = """
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
"""
with open(os.path.join(BASE_DIR, "routers", "incidents_router.py"), "w") as f:
    f.write(incidents_router_py)

resources_router_py = """
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
"""
with open(os.path.join(BASE_DIR, "routers", "resources_router.py"), "w") as f:
    f.write(resources_router_py)

allocations_router_py = """
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
"""
with open(os.path.join(BASE_DIR, "routers", "allocations_router.py"), "w") as f:
    f.write(allocations_router_py)

users_router_py = """
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
"""
with open(os.path.join(BASE_DIR, "routers", "users_router.py"), "w") as f:
    f.write(users_router_py)

report_router_py = """
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

router = APIRouter()

def generate_pdf_report(filename):
    c = canvas.Canvas(filename, pagesize=letter)
    c.drawString(100, 750, "Disaster Resource Allocation System - Incident Report")
    c.drawString(100, 730, "Report generated automatically.")
    c.save()

@router.get("/generate")
async def get_report():
    pdf_path = "/tmp/system_report.pdf"
    generate_pdf_report(pdf_path)
    return FileResponse(pdf_path, media_type="application/pdf", filename="report.pdf")
"""
with open(os.path.join(BASE_DIR, "routers", "report_router.py"), "w") as f:
    f.write(report_router_py)

analytics_router_py = """
from fastapi import APIRouter
router = APIRouter()
@router.get("/")
async def get_analytics():
    return {"message": "Analytics dashboard metrics, regressions, and forecasting simulated."}
"""
with open(os.path.join(BASE_DIR, "routers", "analytics_router.py"), "w") as f:
    f.write(analytics_router_py)

weather_router_py = """
from fastapi import APIRouter
router = APIRouter()
@router.get("/")
async def get_weather():
    return {"message": "Live districts feed parsing simulated."}
"""
with open(os.path.join(BASE_DIR, "routers", "weather_router.py"), "w") as f:
    f.write(weather_router_py)

print("Updated routers generated.")
