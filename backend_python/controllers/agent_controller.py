import uuid
import datetime
from flask import Blueprint, request, jsonify
from services.agent_service import agent_service
from db import get_db
from models import SystemNotification, Incident

agent_bp = Blueprint('agent', __name__)

@agent_bp.route('/status', methods=['GET'])
def get_agent_status():
    """Retrieve operational status, passport verification status, and capabilities."""
    status_data = agent_service.get_status()
    return jsonify(status_data)

@agent_bp.route('/analyze', methods=['POST'])
def analyze_incident():
    """
    POST /api/v1/agent/analyze
    Accepts: { "incidentId": "...", "query": "..." }
    Runs Agent Passport situational assessment & returns structured decision JSON.
    """
    data = request.json or {}
    incident_id = data.get('incidentId') or data.get('incident_id')
    query = data.get('query', '')

    if not incident_id:
        # Get latest active incident if none provided
        db = get_db()
        latest = db.query(Incident).order_by(Incident.created_at.desc()).first()
        if latest:
            incident_id = str(latest.id)
        else:
            return jsonify({'message': 'No incident specified and no active incidents found in database.'}), 400

    try:
        analysis_result = agent_service.analyze_incident(incident_id, query)
        
        # Log system notification for agent analysis event
        db = get_db()
        notif = SystemNotification(
            id=str(uuid.uuid4()),
            title=f"AI Agent Analysis Completed: {analysis_result['incident']['title']}",
            message=f"Disaster Response Agent generated {len(analysis_result['recommended_actions'])} priority actions for {analysis_result['incident']['district']}.",
            type='INFO'
        )
        db.add(notif)
        db.commit()

        return jsonify({
            "success": True,
            "agent_id": "disaster-response-agent-01",
            "data": analysis_result
        })
    except Exception as e:
        print(f"[AgentController] Error during analysis: {e}")
        return jsonify({
            "success": False,
            "message": f"Agent analysis failed: {str(e)}"
        }), 500

@agent_bp.route('/execute-action', methods=['POST'])
def execute_agent_action():
    """
    POST /api/v1/agent/execute-action
    Human Oversight Confirmation: Executes an authorized action recommended by the AI Agent.
    """
    data = request.json or {}
    action_id = data.get('actionId')
    action_text = data.get('action') or 'Confirm Action'
    district = data.get('district') or 'Regional Command'

    db = get_db()
    notif = SystemNotification(
        id=str(uuid.uuid4()),
        title=f"Action Executed: {action_text}",
        message=f"Human Command Officer confirmed and executed action for {district}.",
        type='SUCCESS'
    )
    db.add(notif)
    db.commit()

    return jsonify({
        "success": True,
        "actionId": action_id,
        "status": "EXECUTED",
        "message": f"Action '{action_text}' successfully executed by Human Command Officer."
    })
