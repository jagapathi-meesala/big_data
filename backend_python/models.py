import datetime
from sqlalchemy import Column, String, Float, DateTime, Text, ForeignKey
from db import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(String(50), default='VICTIM')
    phone = Column(String(50), nullable=True)
    district = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

class Incident(Base):
    __tablename__ = 'incidents'

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(50), default='MEDIUM')
    status = Column(String(50), default='REPORTED')
    disaster_type = Column(String(50), default='OTHER')
    district = Column(String(100), nullable=True)
    state = Column(String(100), default='India')
    estimated_damage = Column(Float, default=0.0)
    reporter_id = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

class Resource(Base):
    __tablename__ = 'resources'

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False)
    quantity = Column(Float, default=0)
    occupancy = Column(Float, default=0)
    district = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

class SystemNotification(Base):
    __tablename__ = 'system_notifications'

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default='INFO')
    is_read = Column(String(10), default='false')
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
