# AID-DRAS / RADAR

**AID-DRAS** — AI-Powered Distributed Disaster Resource Allocation System for
Andhra Pradesh & Telangana — now carries **RADAR** (Risk-Aware District
Allocation & Response), a research-grade big-data pipeline whose outputs are
served through the web dashboard.

> **Paper working title:** *From Meteorological Risk to Response Priority:
> Uncertainty-Aware District-Level Disaster Resource Pre-Positioning Validated
> on Historical Flood Events (Andhra Pradesh & Telangana, on Hadoop/Spark).*
> See `paper/paper.md` and `bigdata/README_RADAR.md`.

## What is where

| Path | What it is |
|---|---|
| `bigdata/` | **The research core (RADAR).** IMD gridded rainfall → district-day panel (PySpark), Spark MLlib hazard models, isotonic+conformal uncertainty, DDRPS 2.0 response-priority ranking, budget-constrained pre-positioning evaluated on historical flood events, Spark Structured Streaming live alerts, scalability benchmarks. Guide: [`bigdata/README_RADAR.md`](bigdata/README_RADAR.md) |
| `backend/` | Node.js/Express + Sequelize + PostGIS API. Serves incidents/resources/allocations **and** the RADAR results via `/api/v1/research/*` |
| `frontend/` | React + Vite + Leaflet dashboard, including the **Research Console** (`/research`) that renders pipeline outputs (calibrated risk, ranking, replay metrics, live alerts) |
| `ai-service/` | Legacy FastAPI ML microservice from the pre-RADAR build. **Kept for reference, not part of the paper path** |
| `datasets/` | Static inputs: Census-2011, hospitals, district registry. `datasets/raw/` (git-ignored) holds downloaded IMD/events data |
| `paper/` | IEEE-style paper draft + how to build it |
| `run_pipeline.sh` | One-command runner for the whole research pipeline |

## Quick start

```bash
# 0. infra (postgres+postgis, redis, hadoop, 3x spark workers)
docker compose up -d

# 1. data + pipeline (downloads on first run; heavy steps run in Spark)
./run_pipeline.sh download
./run_pipeline.sh all

# 2. dashboard
cd backend  && npm install && npm run dev     # API on :5000
cd frontend && npm install && npm run dev     # app on :3000
# -> /research = RADAR console; backend login seeded on first boot
```

Run unit tests (no Spark needed): `python -m unittest discover -s bigdata/tests -v`

## Stack

React 18 · Redux Toolkit · React Query · Leaflet · Node/Express · Sequelize +
PostGIS · Socket.IO + Redis · FastAPI (legacy) · **Hadoop HDFS · PySpark
(ETL, MLlib, Structured Streaming)** · scikit-learn/isotonic + split-conformal
· PuLP (allocation LP) · IMD 0.25° gridded observational data · EM-DAT / IFI /
GDACS ground truth.

## Honest limitations (documented, not hidden)

- Radar (hazard) features are meteorological; flood-event ground truth starts
  in 1978 and is event-sparse in some districts — see the paper's threats section.
- Legacy-district (23) vs current-district (46) mismatch is handled by a
  population-weighted mapping table; boundary changes within Telangana after
  2018 are approximate.
- The web dashboard's operational "AI" claims from the old build were
  removed; only pipeline-published numbers are shown.

---

## Disaster Response Agent Passport Integration

The project integrates the **Disaster Response Agent** (`disaster-response-agent-01`, v1.0.0) from the Agent Passport framework as an **intelligent orchestration and decision-support layer**.

### Architecture & Data Flow

```
User / Admin
    ↓
AID-DRAS Frontend (Dashboard / Agent Panel)
    ↓
Agent API Controller (POST /api/v1/agent/analyze)
    ↓
Disaster Response Agent Core Engine (Passport Verified)
    ├── PostgreSQL / PostGIS (Incidents & Resource Capacity)
    ├── Python Scikit-Learn ML Risk Predictor
    ├── PostGIS Spatial Solver Allocation Engine
    ├── OSRM Highway Rescue Routing Service
    └── PySpark / Hadoop Big Data Pipeline
    ↓
Structured Agent Decision JSON Recommendation
    ↓
Dashboard / Disaster Map / Human Oversight Confirmation
```

### Agent API Endpoints

- `GET /api/v1/agent/status` — Retrieves operational status, passport verification status, active capabilities (`situational_assessment`, `logistics_coordination`, `resource_allocation`, `weather_monitoring`, `resource_location`), and Checkpoint status (`Validate: PASSED`, `Explain: PASSED`, `Export: PASSED`).
- `POST /api/v1/agent/analyze` — Accepts `{ "incidentId": "<UUID>", "query": "..." }`, queries PostgreSQL/PostGIS & ML risk models, executes Agent reasoning, logs notifications, and returns structured decision JSON.
- `POST /api/v1/agent/execute-action` — Human Oversight Confirmation: Executes an authorized action recommended by the AI Agent.

### Structured Response Schema Example

```json
{
  "success": true,
  "agent_id": "disaster-response-agent-01",
  "data": {
    "incident": {
      "id": "789ce87c-43c5-4e47-8bbd-5cdcd8b82ed1",
      "title": "Severe Coastal Cyclone - Visakhapatnam",
      "disasterType": "CYCLONE",
      "severity": "CRITICAL",
      "district": "Visakhapatnam",
      "coordinates": [83.2185, 17.6868]
    },
    "severity": {
      "level": "CRITICAL",
      "risk_score": 85.0
    },
    "situation_summary": "Agent Passport situational analysis for 'Severe Coastal Cyclone - Visakhapatnam'...",
    "recommended_actions": [
      {
        "id": "act-1",
        "action": "Pre-position 5 ambulance units along emergency corridor to Visakhapatnam.",
        "priority": "CRITICAL",
        "category": "AMBULANCE",
        "status": "PROPOSED"
      }
    ],
    "resource_priorities": [
      {"resourceType": "AMBULANCE", "priorityLevel": "CRITICAL", "reason": "Rapid triage required..."}
    ],
    "hospital_recommendations": [...],
    "ambulance_recommendations": [...],
    "shelter_recommendations": [...],
    "risk_factors": [...],
    "reasoning_summary": "The Disaster Response Agent analyzed live operational metrics...",
    "data_sources": [
      "PostgreSQL / PostGIS Operational DB",
      "Disaster Response Agent Passport Specification v1.0.0",
      "Python Scikit-Learn ML Hazard Predictor",
      "PostGIS Spatial Solver Allocation Engine",
      "PySpark / Hadoop Big Data Analytics Pipeline"
    ],
    "timestamp": "2026-09-26T17:20:00Z"
  }
}
```

### Human Oversight Model

The Agent acts purely as a decision-support system. All generated recommendations are flagged as `PROPOSED` until an authorized administrator clicks **Confirm & Execute Action**, which records an audited execution log in the database.

### Running Agent Unit Tests

```bash
python3 -m unittest backend_python/tests/test_agent_integration.py
```

