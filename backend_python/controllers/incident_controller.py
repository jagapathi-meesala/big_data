import uuid
import datetime
from flask import Blueprint, request, jsonify
from db import get_db
from models import Incident, SystemNotification
from ml_pipeline import ml_pipeline
from services.spatial_solver import spatial_solver

incident_bp = Blueprint('incident', __name__)

# City coordinate lookup for accurate map placement
CITY_COORDS = {
    "Hyderabad": (17.3850, 78.4867), "Vijayawada": (16.5062, 80.6480),
    "Visakhapatnam": (17.6868, 83.2185), "Warangal": (17.9689, 79.5941),
    "Guntur": (16.3067, 80.4365), "Karimnagar": (18.4386, 79.1288),
    "Khammam": (17.2473, 80.1514), "Nalgonda": (17.0575, 79.2684),
    "Nizamabad": (18.6725, 78.0941), "Kurnool": (15.8281, 78.0373),
    "Anantapur": (14.6819, 77.6006), "Rajahmundry": (16.9891, 81.7810),
    "Tirupati": (13.6284, 79.4192), "Nellore": (14.4426, 79.9865),
    "Kakinada": (16.9891, 82.2475), "Kadapa": (14.4673, 78.8242),
    "Eluru": (16.7107, 81.1035), "Srikakulam": (18.2941, 83.8963),
    "Vizianagaram": (18.1124, 83.3956), "Mahbubnagar": (16.7488, 77.9856),
    "Adilabad": (19.6641, 78.5320), "Suryapet": (17.1500, 79.6200),
    "Siddipet": (18.1018, 78.8520), "Sangareddy": (17.6167, 78.0833),
    "Bhadrachalam": (17.6700, 80.8900), "Ongole": (15.5057, 80.0499),
    "Machilipatnam": (16.1812, 81.1363), "Tenali": (16.2430, 80.6400),
    "Proddatur": (14.7500, 78.5500), "Hindupur": (13.8300, 77.4900),
    "Nandyal": (15.4800, 78.4800), "Chittoor": (13.2172, 79.1003),
    "Ramagundam": (18.8000, 79.4500), "Miryalaguda": (16.8700, 79.5600),
    "Mancherial": (18.8700, 79.4600), "Jagtial": (18.7900, 78.9100),
    "Rangareddy": (17.3500, 78.4300),
}

def _get_coords(district):
    """Get lat/lon coordinates for a given district name."""
    if not district:
        return (17.3850, 78.4867)
    # Direct match
    if district in CITY_COORDS:
        return CITY_COORDS[district]
    # Partial match
    district_lower = district.lower()
    for name, coords in CITY_COORDS.items():
        if name.lower() in district_lower or district_lower in name.lower():
            return coords
    return (17.3850, 78.4867)  # Default Hyderabad


@incident_bp.route('', methods=['GET'])
def get_incidents():
    db = get_db()
    severity = request.args.get('severity')
    district = request.args.get('district')
    limit = int(request.args.get('limit', 100))
    
    query = db.query(Incident)
    if severity:
        query = query.filter(Incident.severity == severity)
    if district:
        query = query.filter(Incident.district == district)

    incidents = query.order_by(Incident.created_at.desc()).limit(limit).all()
    res = []
    for inc in incidents:
        lat, lon = _get_coords(inc.district)
        res.append({
            'id': str(inc.id),
            'title': inc.title,
            'description': inc.description,
            'severity': inc.severity,
            'status': inc.status,
            'disasterType': inc.disaster_type,
            'district': inc.district,
            'state': inc.state,
            'estimatedDamage': inc.estimated_damage,
            'createdAt': inc.created_at.isoformat() if inc.created_at else None,
            'geom': {
                'coordinates': [lon, lat]
            }
        })
    return jsonify({'incidents': res, 'total': len(res)})

@incident_bp.route('/<incident_id>/status', methods=['PATCH', 'PUT'])
def update_incident_status(incident_id):
    data = request.json or {}
    new_status = data.get('status', 'VERIFIED')
    db = get_db()
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        return jsonify({'message': 'Incident not found'}), 404
    inc.status = new_status
    db.commit()

    # Also create a notification for the status change
    notif = SystemNotification(
        id=str(uuid.uuid4()),
        title=f"Distress Signal Verified: {inc.title}",
        message=f"Status updated to {new_status} for incident in {inc.district}.",
        type='SUCCESS'
    )
    db.add(notif)
    db.commit()

    return jsonify({
        'id': str(inc.id),
        'status': inc.status,
        'message': f'Incident status updated to {new_status}'
    })

@incident_bp.route('', methods=['POST'])
def create_incident():
    data = request.json or {}
    title = data.get('title')
    description = data.get('description', '')
    disaster_type = data.get('disasterType', 'OTHER')
    severity = data.get('severity', 'MEDIUM')
    district = data.get('district', 'Hyderabad')
    state = data.get('state', 'India')
    lat = float(data.get('lat', 17.3850))
    lon = float(data.get('lon', 78.4867))

    # Evaluate prediction via Python ML Pipeline
    ml_prediction = ml_pipeline.predict_disaster_risk(lat, lon, disaster_type)

    db = get_db()
    inc = Incident(
        id=str(uuid.uuid4()),
        title=title,
        description=description,
        severity=severity,
        status='REPORTED',
        disaster_type=disaster_type,
        district=district,
        state=state,
        estimated_damage=ml_prediction['predicted_damage_rupees']
    )
    db.add(inc)

    notif = SystemNotification(
        id=str(uuid.uuid4()),
        title=f"New Incident Reported: {title}",
        message=f"Incident registered in {district} ({disaster_type}). Severity: {severity}.",
        type='WARNING'
    )
    db.add(notif)
    db.commit()

    return jsonify({
        'id': str(inc.id),
        'title': inc.title,
        'severity': inc.severity,
        'status': inc.status,
        'mlPrediction': ml_prediction
    }), 201

@incident_bp.route('/simulate-alert', methods=['POST'])
def simulate_fake_alert():
    data = request.json or {}
    disaster_type = data.get('disasterType', 'FLOOD')
    location_name = data.get('locationName', 'Hyderabad (Telangana)')
    severity = data.get('severity', 'CRITICAL')

    db = get_db()
    district_name = location_name.split('(')[0].strip()
    inc = Incident(
        id=str(uuid.uuid4()),
        title=f"FAKE SIMULATED ALERT: {disaster_type.title()} in {location_name}",
        description=f"Simulated {disaster_type.lower()} disaster alert triggered for training in {location_name}.",
        severity=severity,
        status='REPORTED',
        disaster_type=disaster_type,
        district=district_name,
        state='India',
        estimated_damage=500000.0
    )
    db.add(inc)

    notif = SystemNotification(
        id=str(uuid.uuid4()),
        title=f"Fake Alert: {disaster_type} Triggered",
        message=f"Simulated test disaster generated for {location_name} with {severity} severity.",
        type='WARNING'
    )
    db.add(notif)
    db.commit()

    return jsonify({
        'success': True,
        'message': f'Fake disaster alert successfully simulated in {location_name}!',
        'incident': {
            'id': str(inc.id),
            'title': inc.title,
            'severity': inc.severity,
            'locationName': location_name
        }
    })

