import uuid
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from db import get_db
from models import Resource

resource_bp = Blueprint('resource', __name__)

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

def _get_resource_coords(district):
    if not district:
        return (17.3850, 78.4867)
    if district in CITY_COORDS:
        return CITY_COORDS[district]
    district_lower = district.lower()
    for name, coords in CITY_COORDS.items():
        if name.lower() in district_lower or district_lower in name.lower():
            return coords
    return (17.3850, 78.4867)

@resource_bp.route('', methods=['GET'])
def get_resources():
    db = get_db()
    res_type = request.args.get('type')
    district = request.args.get('district')

    query_str = """
        SELECT id, name, type, quantity, occupancy, district, created_at,
               CASE WHEN geom IS NOT NULL THEN ST_AsGeoJSON(geom) ELSE NULL END as geom_json
        FROM resources WHERE 1=1
    """
    params = {}
    if res_type:
        query_str += " AND type = :res_type"
        params['res_type'] = res_type
    if district:
        query_str += " AND district = :district"
        params['district'] = district

    query_str += " ORDER BY name ASC"

    try:
        rows = db.execute(text(query_str), params).fetchall()
        out = []
        import json
        for row in rows:
            dist_val = row.district or 'Hyderabad'
            lat, lon = _get_resource_coords(dist_val)
            if row.geom_json:
                try:
                    g = json.loads(row.geom_json)
                    if g.get('coordinates'):
                        lon, lat = g['coordinates'][0], g['coordinates'][1]
                except Exception:
                    pass

            out.append({
                'id': str(row.id),
                'name': row.name or row.type,
                'type': row.type,
                'quantity': float(row.quantity or 0),
                'occupancy': float(row.occupancy or 0),
                'status': 'AVAILABLE' if (row.quantity or 0) > 0 else 'DEPLETED',
                'district': dist_val,
                'latitude': lat,
                'longitude': lon,
                'geom': {
                    'coordinates': [lon, lat]
                },
                'createdAt': row.created_at.isoformat() if row.created_at else None
            })
        return jsonify({'resources': out, 'total': len(out)})
    except Exception as e:
        # Fallback to ORM query if SQL raw fails
        query = db.query(Resource)
        if res_type:
            query = query.filter(Resource.type == res_type)
        if district:
            query = query.filter(Resource.district == district)
        resources = query.all()
        out = []
        for r in resources:
            dist_val = r.district or 'Hyderabad'
            lat, lon = _get_resource_coords(dist_val)
            out.append({
                'id': str(r.id),
                'name': r.name or r.type,
                'type': r.type,
                'quantity': float(r.quantity or 0),
                'occupancy': float(r.occupancy or 0),
                'status': 'AVAILABLE' if (r.quantity or 0) > 0 else 'DEPLETED',
                'district': dist_val,
                'latitude': lat,
                'longitude': lon,
                'geom': {
                    'coordinates': [lon, lat]
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
