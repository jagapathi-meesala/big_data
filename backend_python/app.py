import os
from flask import Flask, jsonify, request
from flask_cors import CORS

from db import get_db, engine, Base
from seed import seed_database
from services.routing_service import compute_escape_routes

from controllers.auth_controller import auth_bp
from controllers.incident_controller import incident_bp
from controllers.resource_controller import resource_bp
from controllers.analytics_controller import analytics_bp

app = Flask(__name__)
CORS(app)

# Register modular Python Blueprints
app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
app.register_blueprint(incident_bp, url_prefix='/api/v1/incidents')
app.register_blueprint(resource_bp, url_prefix='/api/v1/resources')
app.register_blueprint(analytics_bp, url_prefix='/api/v1/analytics')

# Escape Routes API
@app.route('/api/v1/public-apis/escape-routes', methods=['GET'])
def get_escape_routes():
    o_lat = float(request.args.get('originLat', 17.3850))
    o_lon = float(request.args.get('originLon', 78.4867))
    d_lat = float(request.args.get('destLat', 17.9689))
    d_lon = float(request.args.get('destLon', 79.5941))
    target = request.args.get('targetName', 'Target Hub')
    
    res = compute_escape_routes(o_lat, o_lon, d_lat, d_lon, target)
    return jsonify({'success': True, 'data': res})

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        'status': 'online',
        'system': 'AID-DRAS Python Backend Service',
        'version': '2.0.0-python'
    })

if __name__ == '__main__':
    print("[Python Backend] Initializing database tables and seeds...")
    seed_database()
    print("[Python Backend] Starting Flask API Server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
