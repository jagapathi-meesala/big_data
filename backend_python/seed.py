import uuid
from werkzeug.security import generate_password_hash
from sqlalchemy import text
from db import get_db, Base, engine
from models import User, Incident, Resource

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = get_db()

    admin = db.query(User).filter(User.email == 'jagapathi@aid-dras.gov').first()
    if not admin:
        admin = User(
            id=str(uuid.uuid4()),
            first_name='Jagapathi',
            last_name='(ADMIN)',
            email='jagapathi@aid-dras.gov',
            password_hash=generate_password_hash('password'),
            role='ADMIN',
            phone_number='+919876543210',
            district='Hyderabad',
            state='Telangana'
        )
        db.add(admin)
        db.commit()
        print("[Python Seed] Admin user verified.")

    cities = [
        {"name": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867},
        {"name": "Vijayawada", "state": "Andhra Pradesh", "lat": 16.5062, "lon": 80.6480},
        {"name": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185},
        {"name": "Warangal", "state": "Telangana", "lat": 17.9689, "lon": 79.5941},
        {"name": "Guntur", "state": "Andhra Pradesh", "lat": 16.3067, "lon": 80.4365}
    ]

    for city in cities:
        name = f"{city['name']} Regional Emergency Hub"
        res_check = db.execute(text("SELECT id FROM resources WHERE name = :name"), {"name": name}).fetchone()
        if not res_check:
            res_id = str(uuid.uuid4())
            db.execute(text("""
                INSERT INTO resources (id, name, type, quantity, occupancy, district, geom, created_at, updated_at)
                VALUES (:id, :name, 'HOSPITAL_BED', 1500, 450, :district, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), NOW(), NOW())
            """), {
                "id": res_id,
                "name": name,
                "district": city['name'],
                "lon": city['lon'],
                "lat": city['lat']
            })

    db.commit()
    print("[Python Seed] Database setup verified.")

if __name__ == '__main__':
    seed_database()
