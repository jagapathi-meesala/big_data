import datetime
from flask import Blueprint, jsonify
from db import get_db
from models import Incident, Resource
from services.ai_predictor import fit_live_api_predictor
from services.gdacs_service import sync_gdacs_disasters
from ml_pipeline import ml_pipeline

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/stats', methods=['GET'])
def get_analytics_stats():
    db = get_db()
    incidents = db.query(Incident).all()

    # Train Python ML models over active database records
    ml_train_result = ml_pipeline.train_models([
        {'lat': 17.385, 'lon': 78.486, 'estimated_damage': inc.estimated_damage or 100000.0, 'disaster_type': inc.disaster_type, 'severity': inc.severity}
        for inc in incidents
    ])

    sev_counts = {}
    district_counts = {}
    for inc in incidents:
        sev_counts[inc.severity] = sev_counts.get(inc.severity, 0) + 1
        d = inc.district or 'General'
        district_counts[d] = district_counts.get(d, 0) + 1

    severity_dist = [{'severity': k, 'count': v} for k, v in sev_counts.items()]
    district_dist = [{'district': k, 'count': v} for k, v in district_counts.items()]

    resources = db.query(Resource).all()
    resource_dist = {}
    for r in resources:
        resource_dist[r.type] = resource_dist.get(r.type, 0) + int(r.quantity or 0)
    res_list = [{'type': k, 'total': str(v)} for k, v in resource_dist.items()]

    trends_map = {}
    for inc in incidents:
        dt_str = inc.created_at.strftime('%Y-%m-%d') if inc.created_at else datetime.datetime.utcnow().strftime('%Y-%m-%d')
        trends_map[dt_str] = trends_map.get(dt_str, 0) + 1

    trends_list = [{'date': datetime.datetime.strptime(k, '%Y-%m-%d'), 'count': v} for k, v in sorted(trends_map.items())]
    if not trends_list:
        today = datetime.datetime.utcnow()
        trends_list = [{'date': today - datetime.timedelta(days=i), 'count': 5 + i * 2} for i in range(5)]

    model_fit = fit_live_api_predictor(db, trends_list)
    formatted_trends = [{'date': t['date'].strftime('%Y-%m-%d'), 'count': t['count']} for t in trends_list]

    return jsonify({
        'severityDistribution': severity_dist,
        'districtDistribution': district_dist,
        'resourceDistribution': res_list,
        'hospitalUtilization': [],
        'trends': formatted_trends,
        'forecast': model_fit['forecastPoints'],
        'metrics': {
            'accuracy': model_fit['accuracy'],
            'rSquared': model_fit['accuracy'],
            'trainingTimeMs': model_fit['trainingTimeMs'],
            'mse': model_fit['mse'],
            'slope': model_fit['slope'],
            'intercept': model_fit['intercept'],
            'N': len(trends_list)
        },
        'modelFit': {
            'rSquared': model_fit['accuracy'],
            'mse': model_fit['mse'],
            'slope': model_fit['slope'],
            'intercept': model_fit['intercept'],
            'method': 'Python scikit-learn Ridge Multi-Feature Regressor'
        },
        'mlPipeline': ml_train_result,
        'liveMeta': {
            'totalIncidentsCount': len(incidents),
            'liveApiIncidentsCount': sum(1 for i in incidents if 'Live Alert' in (i.title or '')),
            'userReportedCount': sum(1 for i in incidents if i.reporter_id is not None)
        }
    })

@analytics_bp.route('/sync-live', methods=['POST'])
def sync_live():
    db = get_db()
    count = sync_gdacs_disasters(db)
    return jsonify({
        'message': 'Live feeds successfully queried & synced in Python.',
        'ingestedCount': count
    })
