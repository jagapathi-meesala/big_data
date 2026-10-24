import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, Incident, Resource, SystemNotification

try:
    engine = create_engine('postgresql+psycopg2://postgres:password@localhost:5432/aid_dras')
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    print("users:", session.query(User).count())
    print("incidents:", session.query(Incident).count())
    print("resources:", session.query(Resource).count())
    print("system_notifications:", session.query(SystemNotification).count())
except Exception as e:
    print(e)
