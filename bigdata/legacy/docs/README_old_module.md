# AID-DRAS Big Data Module

This folder handles MapReduce scheduling and Spark Stream parsing logic for **AID-DRAS**.

---

## Folder Layout
- `configs/`: Cluster templates (`core-site.xml`, `yarn-site.xml`).
- `scripts/`: Cron schedule orchestrators and backups.
- `spark/`: PySpark batch analytics and MLlib comparators.

---

## Execution Guide

### 1. Ingest datasets to HDFS
Upload CSVs to the cluster filesystem using:
```bash
bash scripts/upload_to_hdfs.sh
```

### 2. Run batch SQL analytics
To calculate active vacancies and disaster counts:
```bash
spark-submit spark/resource_analytics.py
```

### 3. Compare MLlib vs Scikit-learn
To train and print the comparison report:
```bash
spark-submit spark/prediction_preparation.py
```
This writes results directly to `configs/model_comparison_report.txt`.

### 4. Run Spark Streaming
To start the socket receiver:
```bash
spark-submit spark/spark_streaming.py
```
To feed event streams manually in dev, open a shell and type:
```bash
nc -lk 9999
```
Then paste structured JSON:
```json
{"event_type": "INCIDENT", "title": "Flash Flooding", "description": "High wind levels", "severity": "CRITICAL", "disaster_type": "FLOOD", "latitude": 17.3850, "longitude": 78.4867}
```
This automatically inserts the geolocated event to the PostgreSQL database.
