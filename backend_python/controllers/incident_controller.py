import uuid
import datetime
from flask import Blueprint, request, jsonify
from db import get_db
from models import Incident, SystemNotification
from ml_pipeline import ml_pipeline
from services.spatial_solver import spatial_solver

incident_bp = Blueprint('incident', __name__)

@incident_bp.route('', methods=['GET'])
def get_incidents():
    db = get_db()
    severity = request.args.get('severity')
    district = request.args.get('district')
    
    query = db.query(Incident)
    if severity:
        query = query.filter(Incident.severity == severity)
    if district:
        query = query.filter(Incident.district == district)

    incidents = query.order_by(Incident.created_at.desc()).all()
    res = []
    for inc in incidents:
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
                'coordinates': [78.4867, 17.3850]
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
    inc = Incident(
        id=str(uuid.uuid4()),
        title=f"FAKE SIMULATED ALERT: {disaster_type.title()} in {location_name}",
        description=f"Simulated {disaster_type.lower()} disaster alert triggered for training in {location_name}.",
        severity=severity,
        status='REPORTED',
        disaster_type=disaster_type,
        district=location_name.split('(')[0].strip(),
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
