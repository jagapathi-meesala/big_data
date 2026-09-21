import uuid
from flask import Blueprint, request, jsonify
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
            'name': r.name,
            'type': r.type,
            'quantity': r.quantity,
            'occupancy': r.occupancy,
            'district': r.district,
            'createdAt': r.created_at.isoformat() if r.created_at else None
        })
    return jsonify(out)

@resource_bp.route('', methods=['POST'])
def create_resource():
    data = request.json or {}
    name = data.get('name')
    res_type = data.get('type', 'SUPPLY')
    quantity = float(data.get('quantity', 100))
    district = data.get('district', 'Hyderabad')

    db = get_db()
    r = Resource(
        id=str(uuid.uuid4()),
        name=name,
        type=res_type,
        quantity=quantity,
        occupancy=0.0,
        district=district
    )
    db.add(r)
    db.commit()

    return jsonify({
        'id': str(r.id),
        'name': r.name,
        'type': r.type,
        'quantity': r.quantity,
        'district': r.district
    }), 201
