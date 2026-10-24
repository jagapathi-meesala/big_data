import uuid
import requests
from models import Incident, SystemNotification

GDACS_FEED_URL = 'https://www.gdacs.org/xml/gdacs.geojson'
USGS_QUAKE_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=2.5&limit=25'
NASA_EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v2.1/events?limit=25'

def is_india_location(lat, lon, country_str=""):
    if country_str:
        c = country_str.lower()
        non_india = ['mexico', 'japan', 'china', 'brazil', 'colombia', 'costa rica', 'guyana', 'panama', 'suriname', 'venezuela', 'russia', 'kazakhstan', 'kyrgyzstan', 'mongolia', 'chile', 'peru', 'ecuador', 'philippines', 'indonesia']
        if any(nc in c for nc in non_india):
            return False
        if any(ic in c for ic in ['india', 'andhra', 'telangana', 'bay of bengal', 'indian ocean', 'arabian sea']):
            return True
    return 6.0 <= lat <= 37.5 and 68.0 <= lon <= 97.5

def sync_usgs_quakes(db):
    try:
        resp = requests.get(USGS_QUAKE_URL, timeout=5)
        if resp.status_code != 200:
            return 0
        features = resp.json().get('features', [])
        count = 0
        for feat in features:
            coords = feat.get('geometry', {}).get('coordinates', [])
            if len(coords) < 2:
                continue
            lon, lat = coords[0], coords[1]
            place = feat.get('properties', {}).get('place', 'Seismic Zone')
            
            if not is_india_location(lat, lon, place):
                continue
                
            mag = feat.get('properties', {}).get('mag', 3.0)
            title = f"Live Alert - Earthquake M{mag} ({place})"
            
            existing = db.query(Incident).filter(Incident.title == title).first()
            if not existing:
                sev = 'CRITICAL' if mag >= 6.0 else 'HIGH' if mag >= 4.5 else 'MEDIUM'
                inc = Incident(
                    id=str(uuid.uuid4()),
                    title=title,
                    description=f"USGS live earthquake magnitude {mag} at {place}.",
                    severity=sev,
                    status='REPORTED',
                    disaster_type='EARTHQUAKE',
                    district=place,
                    state='India',
                    estimated_damage=round(mag * 100000, 2)
                )
                db.add(inc)
                count += 1
        db.commit()
        return count
    except Exception as e:
        print(f"USGS sync error: {e}")
        return 0

def sync_eonet_events(db):
    try:
        resp = requests.get(NASA_EONET_URL, timeout=5)
        if resp.status_code != 200:
            return 0
        events = resp.json().get('events', [])
        count = 0
        for evt in events:
            geos = evt.get('geometries', [])
            if not geos or 'coordinates' not in geos[0]:
                continue
            coords = geos[0]['coordinates']
            lon = coords[0][0] if isinstance(coords[0], list) else coords[0]
            lat = coords[0][1] if isinstance(coords[0], list) else coords[1]
            event_name = evt.get('title', 'NASA Event')
            
            if not is_india_location(lat, lon, event_name):
                continue
                
            title = f"Live Alert - {event_name}"
            existing = db.query(Incident).filter(Incident.title == title).first()
            if not existing:
                inc = Incident(
                    id=str(uuid.uuid4()),
                    title=title,
                    description=f"NASA satellite feed detected {event_name}.",
                    severity='HIGH',
                    status='REPORTED',
                    disaster_type='OTHER',
                    district='Satellite Zone',
                    state='India Satellite Watch',
                    estimated_damage=250000.0
                )
                db.add(inc)
                count += 1
        db.commit()
        return count
    except Exception as e:
        print(f"NASA EONET sync error: {e}")
        return 0

def sync_gdacs_disasters(db):
    c1 = sync_usgs_quakes(db)
    c2 = sync_eonet_events(db)
    try:
        resp = requests.get(GDACS_FEED_URL, timeout=6)
        if resp.status_code != 200:
            return c1 + c2
        features = resp.json().get('features', [])
        count = 0
        for feat in features:
            coords = feat.get('geometry', {}).get('coordinates', [])
            if len(coords) < 2:
                continue
            lon, lat = coords[0], coords[1]
            props = feat.get('properties', {})
            event_name = props.get('eventname') or props.get('name') or 'Unnamed Incident'
            country = props.get('country', '')
            
            if not is_india_location(lat, lon, f"{country} {event_name}"):
                continue
                
            title = f"Live Alert - {event_name}"
            existing = db.query(Incident).filter(Incident.title == title).first()
            if not existing:
                inc = Incident(
                    id=str(uuid.uuid4()),
                    title=title,
                    description=props.get('description', f"Real-time GDACS alert for {event_name}."),
                    severity='HIGH',
                    status='REPORTED',
                    disaster_type='FLOOD',
                    district=country or 'India',
                    state='India',
                    estimated_damage=100000.0
                )
                db.add(inc)
                count += 1
        db.commit()
        return c1 + c2 + count
    except Exception as e:
        print(f"GDACS sync error: {e}")
        return c1 + c2
