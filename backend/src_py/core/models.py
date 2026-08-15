
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
