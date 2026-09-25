import uuid
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from db import get_db
from models import Resource

resource_bp = Blueprint('resource', __name__)

@resource_bp.route('', methods=['GET'])
def get_resources():
    db = get_db()
    res_type = request.args.get('type')
    district = request.args.get('district')

    query = db.query(Resource)
    if res_type:
        query = query.filter(Resource.type == res_type)
    if district:
        query = query.filter(Resource.district == district)

    resources = query.all()
    out = []
    for r in resources:
        out.append({
            'id': str(r.id),
            'name': r.name or r.type,
            'type': r.type,
            'quantity': r.quantity,
            'occupancy': r.occupancy,
            'status': 'AVAILABLE' if r.quantity > 0 else 'DEPLETED',
            'district': r.district or 'Hyderabad',
            'latitude': 17.3850,
            'longitude': 78.4867,
            'geom': {
                'coordinates': [78.4867, 17.3850]
            },
            'createdAt': r.created_at.isoformat() if r.created_at else None
        })
    return jsonify({'resources': out, 'total': len(out)})

@resource_bp.route('', methods=['POST'])
def create_resource():
    data = request.json or {}
    res_type = data.get('type', 'FOOD')
    quantity = float(data.get('quantity', 100))
    district = data.get('district', 'Hyderabad')
    name = data.get('name') or f"{res_type.replace('_', ' ').title()} Stock"
    lat = float(data.get('latitude', 17.3850))
    lon = float(data.get('longitude', 78.4867))
    res_id = str(uuid.uuid4())

    db = get_db()
    try:
        db.execute(text("""
            INSERT INTO resources (id, name, type, quantity, occupancy, district, geom, created_at, updated_at)
            VALUES (:id, :name, :type, :qty, 0, :district, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), NOW(), NOW())
        """), {
            "id": res_id,
            "name": name,
            "type": res_type,
            "qty": quantity,
            "district": district,
            "lon": lon,
            "lat": lat
        })
        db.commit()
    except Exception as e:
        db.rollback()
        # Fallback for databases without PostGIS
        r = Resource(
            id=res_id,
            name=name,
            type=res_type,
            quantity=quantity,
            occupancy=0.0,
            district=district
        )
        db.add(r)
        db.commit()

    return jsonify({
        'id': res_id,
        'name': name,
        'type': res_type,
        'quantity': quantity,
        'district': district,
        'status': 'AVAILABLE',
        'geom': {'coordinates': [lon, lat]}
    }), 201

@resource_bp.route('/<resource_id>', methods=['PUT', 'PATCH'])
def update_resource(resource_id):
    data = request.json or {}
    db = get_db()
    r = db.query(Resource).filter(Resource.id == resource_id).first()
    if not r:
        return jsonify({'message': 'Resource not found'}), 404
    if 'type' in data:
        r.type = data['type']
    if 'quantity' in data:
        r.quantity = float(data['quantity'])
    if 'district' in data:
        r.district = data['district']
    db.commit()
    return jsonify({'message': 'Resource updated successfully'})

@resource_bp.route('/<resource_id>', methods=['DELETE'])
def delete_resource(resource_id):
    db = get_db()
    r = db.query(Resource).filter(Resource.id == resource_id).first()
    if r:
        db.delete(r)
        db.commit()
    return jsonify({'message': 'Resource deleted successfully'})
