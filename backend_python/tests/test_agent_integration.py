import sys
import os
import unittest
import json

# Ensure python backend path is in sys.path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import app
from services.agent_service import agent_service


class TestAgentIntegration(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def test_01_agent_service_initialization(self):
        """Test DisasterResponseAgentService status and passport capabilities."""
        status = agent_service.get_status()
        self.assertEqual(status['status'], 'OPERATIONAL')
        self.assertTrue(status['passport_verified'])
        self.assertEqual(status['agent_id'], 'disaster-response-agent-01')
        self.assertIn('situational_assessment', status['capabilities'])
        self.assertIn('resource_allocation', status['capabilities'])

    def test_02_agent_status_endpoint(self):
        """Test GET /api/v1/agent/status endpoint."""
        response = self.client.get('/api/v1/agent/status')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['passport_verified'])
        self.assertEqual(data['name'], 'DisasterResponseAgent')
        self.assertEqual(data['checkpoint_verification']['checkpoint_1_validate'], 'PASSED')
        self.assertEqual(data['checkpoint_verification']['checkpoint_2_explain'], 'PASSED')
        self.assertEqual(data['checkpoint_verification']['checkpoint_3_export'], 'PASSED')

    def test_03_agent_analyze_endpoint_valid(self):
        """Test POST /api/v1/agent/analyze with a valid incident query."""
        # Get an incident ID from database
        inc_resp = self.client.get('/api/v1/incidents?limit=1')
        inc_data = json.loads(inc_resp.data)
        incidents = inc_data.get('incidents', [])
        self.assertGreater(len(incidents), 0, "Database must contain at least one incident")
        
        inc_id = incidents[0]['id']

        analyze_resp = self.client.post(
            '/api/v1/agent/analyze',
            data=json.dumps({'incidentId': inc_id, 'query': 'Analyze emergency priorities'}),
            content_type='application/json'
        )
        self.assertEqual(analyze_resp.status_code, 200)
        result = json.loads(analyze_resp.data)
        self.assertTrue(result['success'])
        
        data = result['data']
        self.assertIn('incident', data)
        self.assertIn('severity', data)
        self.assertIn('situation_summary', data)
        self.assertIn('recommended_actions', data)
        self.assertIn('resource_priorities', data)
        self.assertIn('hospital_recommendations', data)
        self.assertIn('ambulance_recommendations', data)
        self.assertIn('shelter_recommendations', data)
        self.assertIn('data_sources', data)
        self.assertGreater(len(data['recommended_actions']), 0)

    def test_04_agent_analyze_missing_id_fallback(self):
        """Test POST /api/v1/agent/analyze when no incidentId is provided (uses latest incident fallback)."""
        analyze_resp = self.client.post(
            '/api/v1/agent/analyze',
            data=json.dumps({'query': 'Evaluate situational state'}),
            content_type='application/json'
        )
        self.assertEqual(analyze_resp.status_code, 200)
        result = json.loads(analyze_resp.data)
        self.assertTrue(result['success'])

    def test_05_agent_execute_action(self):
        """Test POST /api/v1/agent/execute-action (Human Oversight Action Confirmation)."""
        exec_resp = self.client.post(
            '/api/v1/agent/execute-action',
            data=json.dumps({
                'actionId': 'act-1',
                'action': 'Dispatch 5 ambulance units to Visakhapatnam General Hospital',
                'district': 'Visakhapatnam'
            }),
            content_type='application/json'
        )
        self.assertEqual(exec_resp.status_code, 200)
        data = json.loads(exec_resp.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['status'], 'EXECUTED')


if __name__ == '__main__':
    unittest.main()
