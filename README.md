# AI-Powered Distributed Disaster Resource Allocation System (AID-DRAS)

AID-DRAS is a production-grade, highly available, distributed emergency management application designed to coordinate resource dispatches, analyze meteorological hazard indices, predict disaster severities, and optimize relief routes.

---

## 1. System Architecture & Tech Stack
- **Frontend Panel**: React.js (TypeScript, Vite, Tailwind CSS, Redux Toolkit, Leaflet mapping).
- **Backend Services**: Node.js (Express, Sequelize PostGIS ORM, WebSocket gateway, Winston logs).
- **AI Microservice**: Python 3.12 (FastAPI, Scikit-learn, XGBoost, SHAP Explainer model caches).
- **Big Data Module**: Apache Hadoop (HDFS distributed datastores) and Apache Spark (PySpark ETL + Spark MLlib).
- **Distributed Cache & Broker**: Redis (WebSocket load-balancing + Pub/Sub telemetry).

---

## 2. Directory Layout
- `backend/`: Node.js Express controllers and PostGIS configurations.
- `frontend/`: React components, layouts, maps, and state management.
- `ai-service/`: FastAPI model training and inference scripts.
- `bigdata/`: Hadoop configs and PySpark batch routines.
- `datasets/`: Census demographics, EM-DAT historical charts, and meteorological rainfall statistics.

---

## 3. Deployment Guide

### Prerequisites
Ensure `docker` and `docker-compose` are active.

### Bootstrapping Services
To initialize database migrations, create environment configs, and spin up Namenodes and Spark Master worker servers, run:
```bash
bash deploy.sh
```

---

## 4. API Documentation

### Backend endpoints
- **Authentication**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
- **Incidents**: `GET /api/v1/incidents`, `POST /api/v1/incidents`
- **IoT Registries**: `POST /api/v1/iot/register`, `POST /api/v1/iot/telemetry`

### AI Solver endpoints
- **Predict Severity**: `POST http://localhost:8000/predict/severity`
- **Disaster Simulation**: `POST http://localhost:8000/simulate`
- **Allocation Scores**: `POST http://localhost:8000/recommend/allocation-score`

---

## 5. Developer Guide
To verify compilation and run load testing suites:
```bash
# Verify Python syntax
python3 -m py_compile ai-service/app/main.py

# Execute concurrent authentication load check
node backend/tests/load_test.js
```
