
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
