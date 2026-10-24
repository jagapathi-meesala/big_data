import uuid
import datetime
from sqlalchemy import Column, String, Float, DateTime, Text
from db import get_db, Base

class IncidentTemp(Base):
    __tablename__ = 'incidents'
    __table_args__ = {'extend_existing': True}

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
    geom = Column(String)  # PostGIS EWKT support test

db = get_db()
inc = IncidentTemp(
    id=str(uuid.uuid4()),
    title="TEST EWKT INSERT",
    description="Testing PostGIS string insertion",
    severity="LOW",
    status="REPORTED",
    disaster_type="OTHER",
    district="Hyderabad",
    state="India",
    estimated_damage=0.0,
    geom="SRID=4326;POINT(78.4867 17.385)"
)
db.add(inc)
try:
    db.commit()
    print("SUCCESS")
except Exception as e:
    print("FAILED:", str(e))
