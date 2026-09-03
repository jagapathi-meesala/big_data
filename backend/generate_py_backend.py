import os

BASE_DIR = "/home/jagapathi/Downloads/big/backend/src_py"
os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "routers"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "core"), exist_ok=True)

# 1. Database
database_py = """
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:password@localhost:5432/aid_dras")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
"""
with open(os.path.join(BASE_DIR, "core", "database.py"), "w") as f:
    f.write(database_py)

# 2. Models
models_py = """
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from geoalchemy2 import Geometry
from .database import Base
import uuid
import datetime
import enum

class UserRole(str, enum.Enum):
    ADMIN = 'ADMIN'
    DISASTER_OFFICER = 'DISASTER_OFFICER'
    CITIZEN = 'CITIZEN'
    VOLUNTEER = 'VOLUNTEER'
    HOSPITAL = 'HOSPITAL'
    POLICE = 'POLICE'
    FIRE_DEPARTMENT = 'FIRE_DEPARTMENT'
    NGO = 'NGO'

class UserStatus(str, enum.Enum):
    ACTIVE = 'ACTIVE'
    INACTIVE = 'INACTIVE'
    SUSPENDED = 'SUSPENDED'

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    passwordHash = Column(String(255), nullable=False)
    firstName = Column(String(100), nullable=False)
    lastName = Column(String(100), nullable=False)
    phoneNumber = Column(String(20), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    status = Column(Enum(UserStatus), nullable=False, default=UserStatus.ACTIVE)
    availability = Column(String(50), nullable=True, default='AVAILABLE')
    profilePicture = Column(String(1000), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    refreshToken = Column(String(500), nullable=True)
    passwordResetToken = Column(String(255), nullable=True)
    passwordResetExpires = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class IncidentStatus(str, enum.Enum):
    REPORTED = 'REPORTED'
    VERIFIED = 'VERIFIED'
    RESPONDING = 'RESPONDING'
    RESOLVED = 'RESOLVED'
    CLOSED = 'CLOSED'

class SeverityLevel(str, enum.Enum):
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    CRITICAL = 'CRITICAL'

class DisasterType(str, enum.Enum):
    EARTHQUAKE = 'EARTHQUAKE'
    FLOOD = 'FLOOD'
    FIRE = 'FIRE'
    ACCIDENT = 'ACCIDENT'
    MEDICAL = 'MEDICAL'
    OTHER = 'OTHER'

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporterId = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    severity = Column(Enum(SeverityLevel), nullable=False, default=SeverityLevel.MEDIUM)
    status = Column(Enum(IncidentStatus), nullable=False, default=IncidentStatus.REPORTED)
    disasterType = Column(Enum(DisasterType), nullable=False, default=DisasterType.OTHER)
    imageUrl = Column(String(1000), nullable=True)
    geom = Column(Geometry('POINT', srid=4326), nullable=False)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    assignedHospital = Column(String(255), nullable=True)
    assignedVolunteer = Column(String(255), nullable=True)
    estimatedDamage = Column(Float, nullable=True, default=0.0)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class ResourceType(str, enum.Enum):
    FOOD = 'FOOD'
    WATER = 'WATER'
    MEDICINE = 'MEDICINE'
    AMBULANCE = 'AMBULANCE'
    FIRE_TRUCK = 'FIRE_TRUCK'
    RESCUE_TEAM = 'RESCUE_TEAM'
    POLICE_UNIT = 'POLICE_UNIT'
    SHELTER_CAPACITY = 'SHELTER_CAPACITY'
    HOSPITAL_BED = 'HOSPITAL_BED'

class ResourceStatus(str, enum.Enum):
    AVAILABLE = 'AVAILABLE'
    ALLOCATED = 'ALLOCATED'
    IN_TRANSIT = 'IN_TRANSIT'
    MAINTENANCE = 'MAINTENANCE'

class Resource(Base):
    __tablename__ = "resources"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ownerId = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(Enum(ResourceType), nullable=False)
    quantity = Column(Integer, nullable=False)
    status = Column(Enum(ResourceStatus), nullable=False, default=ResourceStatus.AVAILABLE)
    geom = Column(Geometry('POINT', srid=4326), nullable=False)
    name = Column(String(255), nullable=True)
    icuBeds = Column(Integer, nullable=True, default=0)
    doctorsCount = Column(Integer, nullable=True, default=0)
    ambulancesCount = Column(Integer, nullable=True, default=0)
    occupancy = Column(Integer, nullable=True, default=0)
    electricityStatus = Column(String(100), nullable=True, default='CONNECTED')
    medicalFacilityStatus = Column(String(100), nullable=True, default='FUNCTIONAL')
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AllocationStatus(str, enum.Enum):
    PENDING = 'PENDING'
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'

class Allocation(Base):
    __tablename__ = "allocations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incidentId = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False)
    resourceId = Column(UUID(as_uuid=True), ForeignKey("resources.id"), nullable=False)
    allocatedBy = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    quantityAllocated = Column(Integer, nullable=False)
    status = Column(Enum(AllocationStatus), nullable=False, default=AllocationStatus.PENDING)
    estimatedArrivalTime = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)
    updatedAt = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
"""
with open(os.path.join(BASE_DIR, "core", "models.py"), "w") as f:
    f.write(models_py)

# 3. schemas.py
schemas_py = """
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid
import datetime
from .models import UserRole, UserStatus, IncidentStatus, SeverityLevel, DisasterType, ResourceType, ResourceStatus

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    firstName: str
    lastName: str
    phoneNumber: str
    role: UserRole

class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    firstName: str
    lastName: str
    role: UserRole
    status: UserStatus
    class Config:
        orm_mode = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
"""
with open(os.path.join(BASE_DIR, "core", "schemas.py"), "w") as f:
    f.write(schemas_py)

# 4. Auth
auth_py = """
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
"""
with open(os.path.join(BASE_DIR, "core", "auth.py"), "w") as f:
    f.write(auth_py)

# 5. Main
main_py = """
from fastapi import FastAPI, Request
from .core.database import engine, Base
import socketio

app = FastAPI(title="AI Powered Distributed Disaster Resource Allocation System")
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
sio_app = socketio.ASGIApp(sio, app)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/")
async def root():
    return {"status": "online", "system": "AI Powered Distributed Disaster Resource Allocation System"}

from .routers import auth_router, incidents_router, resources_router, allocations_router
from .routers import iot_router, dashboard_router, analytics_router, weather_router, report_router, notification_router, users_router

app.include_router(auth_router.router, prefix="/api/v1/auth")
app.include_router(users_router.router, prefix="/api/v1/users")
app.include_router(incidents_router.router, prefix="/api/v1/incidents")
app.include_router(resources_router.router, prefix="/api/v1/resources")
app.include_router(allocations_router.router, prefix="/api/v1/allocations")
app.include_router(iot_router.router, prefix="/api/v1/iot")
app.include_router(dashboard_router.router, prefix="/api/v1/dashboard")
app.include_router(analytics_router.router, prefix="/api/v1/analytics")
app.include_router(weather_router.router, prefix="/api/v1/weather")
app.include_router(report_router.router, prefix="/api/v1/reports")
app.include_router(notification_router.router, prefix="/api/v1/notifications")
"""
with open(os.path.join(BASE_DIR, "main.py"), "w") as f:
    f.write(main_py)

# 6. Basic Routers
routers = ["auth_router", "incidents_router", "resources_router", "allocations_router", "iot_router", "dashboard_router", "analytics_router", "weather_router", "report_router", "notification_router", "users_router"]
for r in routers:
    with open(os.path.join(BASE_DIR, "routers", f"{r}.py"), "w") as f:
        f.write(f'''
from fastapi import APIRouter
router = APIRouter()
@router.get("/")
async def get_{r}():
    return {{"message": "{r}"}}
''')

print("Files generated.")
