import uuid
import random
import datetime
from werkzeug.security import generate_password_hash
from sqlalchemy import text
from db import get_db, Base, engine
from models import User, Incident, Resource, SystemNotification

CITIES_36 = [
    {"name": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867},
    {"name": "Vijayawada", "state": "Andhra Pradesh", "lat": 16.5062, "lon": 80.6480},
    {"name": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185},
    {"name": "Warangal", "state": "Telangana", "lat": 17.9689, "lon": 79.5941},
    {"name": "Guntur", "state": "Andhra Pradesh", "lat": 16.3067, "lon": 80.4365},
    {"name": "Karimnagar", "state": "Telangana", "lat": 18.4386, "lon": 79.1288},
    {"name": "Khammam", "state": "Telangana", "lat": 17.2473, "lon": 80.1514},
    {"name": "Nalgonda", "state": "Telangana", "lat": 17.0575, "lon": 79.2684},
    {"name": "Nizamabad", "state": "Telangana", "lat": 18.6725, "lon": 78.0941},
    {"name": "Kurnool", "state": "Andhra Pradesh", "lat": 15.8281, "lon": 78.0373},
    {"name": "Anantapur", "state": "Andhra Pradesh", "lat": 14.6819, "lon": 77.6006},
    {"name": "Rajahmundry", "state": "Andhra Pradesh", "lat": 16.9891, "lon": 81.7810},
    {"name": "Tirupati", "state": "Andhra Pradesh", "lat": 13.6284, "lon": 79.4192},
    {"name": "Nellore", "state": "Andhra Pradesh", "lat": 14.4426, "lon": 79.9865},
    {"name": "Kakinada", "state": "Andhra Pradesh", "lat": 16.9891, "lon": 82.2475},
    {"name": "Kadapa", "state": "Andhra Pradesh", "lat": 14.4673, "lon": 78.8242},
    {"name": "Eluru", "state": "Andhra Pradesh", "lat": 16.7107, "lon": 81.1035},
    {"name": "Srikakulam", "state": "Andhra Pradesh", "lat": 18.2941, "lon": 83.8963},
    {"name": "Vizianagaram", "state": "Andhra Pradesh", "lat": 18.1124, "lon": 83.3956},
    {"name": "Mahbubnagar", "state": "Telangana", "lat": 16.7488, "lon": 77.9856},
    {"name": "Adilabad", "state": "Telangana", "lat": 19.6641, "lon": 78.5320},
    {"name": "Suryapet", "state": "Telangana", "lat": 17.1500, "lon": 79.6200},
    {"name": "Siddipet", "state": "Telangana", "lat": 18.1018, "lon": 78.8520},
    {"name": "Sangareddy", "state": "Telangana", "lat": 17.6167, "lon": 78.0833},
    {"name": "Bhadrachalam", "state": "Telangana", "lat": 17.6700, "lon": 80.8900},
    {"name": "Ongole", "state": "Andhra Pradesh", "lat": 15.5057, "lon": 80.0499},
    {"name": "Machilipatnam", "state": "Andhra Pradesh", "lat": 16.1812, "lon": 81.1363},
    {"name": "Tenali", "state": "Andhra Pradesh", "lat": 16.2430, "lon": 80.6400},
    {"name": "Proddatur", "state": "Andhra Pradesh", "lat": 14.7500, "lon": 78.5500},
    {"name": "Hindupur", "state": "Andhra Pradesh", "lat": 13.8300, "lon": 77.4900},
    {"name": "Nandyal", "state": "Andhra Pradesh", "lat": 15.4800, "lon": 78.4800},
    {"name": "Chittoor", "state": "Andhra Pradesh", "lat": 13.2172, "lon": 79.1003},
    {"name": "Ramagundam", "state": "Telangana", "lat": 18.8000, "lon": 79.4500},
    {"name": "Miryalaguda", "state": "Telangana", "lat": 16.8700, "lon": 79.5600},
    {"name": "Mancherial", "state": "Telangana", "lat": 18.8700, "lon": 79.4600},
    {"name": "Jagtial", "state": "Telangana", "lat": 18.7900, "lon": 78.9100}
]

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = get_db()

    # 1. Admin User Verification
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

    # 2. Seed Volunteers in Users Table
    vol_count = db.query(User).filter(User.role == 'VOLUNTEER').count()
    if vol_count < 25:
        names = [
            ("Ramesh", "Kumar"), ("Suresh", "Reddy"), ("Priya", "Sharma"),
            ("Anitha", "Rao"), ("Venkat", "Naidu"), ("Kiran", "Varma"),
            ("Lakshmi", "Devi"), ("Bhanu", "Prakash"), ("Vijay", "Kanth"),
            ("Manasa", "Goud"), ("Srikanth", "Chowdary"), ("Divya", "Teja"),
            ("Prashanth", "Raju"), ("Haritha", "Nair"), ("Mahesh", "Babu"),
            ("Sunitha", "Yadav"), ("Rajesh", "Verma"), ("Swathi", "Reddy"),
            ("Gopal", "Krishna"), ("Kavitha", "Rani"), ("Naveen", "Kumar"),
            ("Venkatesh", "Prasad"), ("Sailaja", "Kothari"), ("Rahul", "Dravid"),
            ("Deepika", "Padukone")
        ]
        for f, l in names:
            c = random.choice(CITIES_36)
            v_user = User(
                id=str(uuid.uuid4()),
                first_name=f,
                last_name=l,
                email=f"{f.lower()}.{l.lower()}@volunteers.aid-dras.gov",
                password_hash=generate_password_hash('password123'),
                role='VOLUNTEER',
                phone_number=f"+919{random.randint(100000009, 999999999)}",
                district=c['name'],
                state=c['state']
            )
            db.add(v_user)
        db.commit()

    # 3. Seed Resources for 36 Cities
    for city in CITIES_36:
        # Hospital Beds
        h_name = f"{city['name']} General Emergency Hospital"
        h_check = db.execute(text("SELECT id FROM resources WHERE name = :name"), {"name": h_name}).fetchone()
        if not h_check:
            db.execute(text("""
                INSERT INTO resources (id, name, type, quantity, occupancy, district, geom, created_at, updated_at)
                VALUES (:id, :name, 'HOSPITAL_BED', :qty, :occ, :district, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), NOW(), NOW())
            """), {
                "id": str(uuid.uuid4()), "name": h_name, "qty": random.randint(300, 850),
                "occ": random.randint(50, 200), "district": city['name'], "lon": city['lon'], "lat": city['lat']
            })

        # Shelters
        s_name = f"{city['name']} Disaster Relief Shelter"
        s_check = db.execute(text("SELECT id FROM resources WHERE name = :name"), {"name": s_name}).fetchone()
        if not s_check:
            db.execute(text("""
                INSERT INTO resources (id, name, type, quantity, occupancy, district, geom, created_at, updated_at)
                VALUES (:id, :name, 'SHELTER_CAPACITY', :qty, :occ, :district, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), NOW(), NOW())
            """), {
                "id": str(uuid.uuid4()), "name": s_name, "qty": random.randint(120, 500),
                "occ": random.randint(20, 100), "district": city['name'], "lon": city['lon'], "lat": city['lat']
            })

        # Ambulances
        a_name = f"{city['name']} Emergency Ambulance Fleet"
        a_check = db.execute(text("SELECT id FROM resources WHERE name = :name"), {"name": a_name}).fetchone()
        if not a_check:
            db.execute(text("""
                INSERT INTO resources (id, name, type, quantity, occupancy, district, geom, created_at, updated_at)
                VALUES (:id, :name, 'AMBULANCE', :qty, :occ, :district, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), NOW(), NOW())
            """), {
                "id": str(uuid.uuid4()), "name": a_name, "qty": random.randint(10, 45),
                "occ": random.randint(2, 10), "district": city['name'], "lon": city['lon'], "lat": city['lat']
            })

    # 3.5 Seed 20 High-Priority SOS Incidents Across AP & Telangana
    inc_count = db.query(Incident).count()
    if inc_count < 15:
        incidents_seed_data = [
            ("Flash Flood Emergency - Vijayawada", "Krishna River overflow near Prakasam Barrage inundating low-lying residential sectors. Emergency evacuation & boats required.", "FLOOD", "CRITICAL", "REPORTED", "Vijayawada", "Andhra Pradesh", 450000),
            ("Severe Coastal Cyclone - Visakhapatnam", "Bay of Bengal landfall with gale speeds exceeding 95 km/h. Coastal shelters activated and emergency medical dispatch deployed.", "CYCLONE", "CRITICAL", "VERIFIED", "Visakhapatnam", "Andhra Pradesh", 1200000),
            ("Landslide & Mudslide Alert - Srikakulam", "Eastern Ghats mountain pass road blocked due to heavy monsoon downpour. National highway traffic diverted.", "LANDSLIDE", "HIGH", "REPORTED", "Srikakulam", "Andhra Pradesh", 180000),
            ("Hospital Oxygen Critical Alert - Tirupati", "Emergency ICU oxygen supply running low at district hospital hub. Priority mobile supply convoy requested.", "OTHER", "CRITICAL", "VERIFIED", "Tirupati", "Andhra Pradesh", 90000),
            ("Building Structural Collapse - Warangal", "Commercial building structure damaged due to foundation waterlogging. Urban search and rescue unit on standby.", "OTHER", "HIGH", "REPORTED", "Warangal", "Telangana", 350000),
            ("Chemical Industrial Storage Leak - Karimnagar", "Industrial park container valve leak detected. 500m safety perimeter established and HAZMAT team dispatched.", "OTHER", "CRITICAL", "VERIFIED", "Karimnagar", "Telangana", 500000),
            ("Godavari River Inundation - Bhadrachalam", "River water level crossed 2nd danger signal (48 feet). Temple town evacuating low-lying habitations to relief centers.", "FLOOD", "CRITICAL", "VERIFIED", "Bhadrachalam", "Telangana", 850000),
            ("Urban Flooding & Musi Overflow - Hyderabad", "Heavy cloudburst causing flash urban flooding in Musi river catchment areas. Mobile de-watering pumps deployed.", "FLOOD", "HIGH", "REPORTED", "Hyderabad", "Telangana", 650000),
            ("Srisailam Dam Discharge Alert - Nalgonda", "Tailpond reservoir discharge gates opened. Downstream villages along Krishna river basin alerted.", "FLOOD", "HIGH", "VERIFIED", "Nalgonda", "Telangana", 300000),
            ("Coastal High Storm Surge - Kakinada", "Deep sea storm surge flooding fishing hamlets along Kakinada port road. Relief boats and lifejackets mobilized.", "CYCLONE", "CRITICAL", "REPORTED", "Kakinada", "Andhra Pradesh", 420000),
            ("Sub-Station Transformer Fire - Ramagundam", "Thermal power grid sub-station transformer oil catch fire. Power backup switch gear initiated.", "FIRE", "CRITICAL", "VERIFIED", "Ramagundam", "Telangana", 780000),
            ("Severe Heatwave & Water Scarcity - Kurnool", "Rayalaseema extreme summer heatwave touching 44C. Emergency drinking water tankers dispatched to rural hamlets.", "OTHER", "HIGH", "REPORTED", "Kurnool", "Andhra Pradesh", 150000),
            ("Flash Downpour & Market Inundation - Guntur", "Agricultural produce market inundated under 3 feet of rainwater. Produce protection and drainage clearance active.", "FLOOD", "HIGH", "VERIFIED", "Guntur", "Andhra Pradesh", 280000),
            ("Grid Sub-Station Failure - Nizamabad", "High-voltage transmission line damage due to thunderstorm. Emergency diesel generator sets dispatched.", "OTHER", "MEDIUM", "REPORTED", "Nizamabad", "Telangana", 95000),
            ("Godavari River Ferry Evacuation - Rajahmundry", "Passenger ferry vessel engine failure amidst high river currents near Godavari bridge. Coast Guard boats dispatched.", "OTHER", "CRITICAL", "VERIFIED", "Rajahmundry", "Andhra Pradesh", 220000),
            ("Railway Track Washout - Khammam", "Heavy downpour causing ballast erosion along South Central Railway line. Express trains halted safely at station.", "FLOOD", "HIGH", "REPORTED", "Khammam", "Telangana", 310000),
            ("Drought & Crop Fire Alert - Anantapur", "Dry weather and strong winds triggering farm brush fire. Fire tenders pre-positioned across rural belt.", "FIRE", "MEDIUM", "REPORTED", "Anantapur", "Andhra Pradesh", 110000),
            ("Coastal Barrier Erosion - Nellore", "High tidal waves damaging coastal protection seawall near Krishnapatnam port. Sandbag reinforcement active.", "CYCLONE", "HIGH", "VERIFIED", "Nellore", "Andhra Pradesh", 270000),
            ("Forest Ridge Wildfire - Chittoor", "Wildfire reported near Seshachalam forest hill ranges. Forest department and helicopters deployed for firefighting.", "FIRE", "HIGH", "REPORTED", "Chittoor", "Andhra Pradesh", 600000),
            ("Highway Bridge Structural Scour - Eluru", "National Highway NH-16 canal bridge pillar scouring detected after heavy runoff. Heavy vehicles rerouted safely.", "FLOOD", "MEDIUM", "VERIFIED", "Eluru", "Andhra Pradesh", 190000)
        ]

        for title, desc, dtype, sev, st, dist, state_val, dmg in incidents_seed_data:
            inc = Incident(
                id=str(uuid.uuid4()),
                title=title,
                description=desc,
                disaster_type=dtype,
                severity=sev,
                status=st,
                district=dist,
                state=state_val,
                estimated_damage=dmg,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=random.randint(1, 48))
            )
            db.add(inc)
        db.commit()

    # 4. Seed System Notifications
    notif_check = db.query(SystemNotification).first()
    if not notif_check:
        notifications = [
            SystemNotification(
                id=str(uuid.uuid4()), title='Flash Flood Advisory',
                message='Prakasam Barrage discharge level monitoring active for Vijayawada, Andhra Pradesh.',
                type='ALERT', is_read='false'
            ),
            SystemNotification(
                id=str(uuid.uuid4()), title='Cyclone Preparedness Alert',
                message='Visakhapatnam disaster response units positioned at coastal emergency shelters.',
                type='WARNING', is_read='false'
            ),
            SystemNotification(
                id=str(uuid.uuid4()), title='Urban Drainage Inundation Alert',
                message='Heavy rainfall advisory in effect for Musi catchment sectors across Hyderabad, Telangana.',
                type='WARNING', is_read='false'
            ),
            SystemNotification(
                id=str(uuid.uuid4()), title='Hospital Bed Allocation Verified',
                message='Guntur General Hospital & Apollo ER Hyderabad added 120 standby ICU beds to active registry.',
                type='SUCCESS', is_read='false'
            ),
            SystemNotification(
                id=str(uuid.uuid4()), title='Supply Depot Standby Status',
                message='Kurnool & Warangal regional supply depots pre-positioned 500 food & water parcels.',
                type='INFO', is_read='false'
            )
        ]
        for n in notifications:
            db.add(n)

    db.commit()
    print("[Python Seed] Database tables and 36 city resources verified.")

if __name__ == '__main__':
    seed_database()


