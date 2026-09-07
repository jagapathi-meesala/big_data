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
