#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIGDATA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$BIGDATA_DIR/.." && pwd)"

echo "=== Running AID-DRAS IEEE Research Pipeline ==="

echo "Step 1: Uploading datasets to HDFS..."
bash "$SCRIPT_DIR/upload_to_hdfs.sh"

echo "Step 2: Executing Python/Spark Research Pipeline..."
python3 "$BIGDATA_DIR/spark/run_full_pipeline.py"

echo "Step 3: Triggering AI Microservice Model Sync..."
curl -s -X POST "http://localhost:8000/train?version=auto_$(date +%s)" || true

echo "=== AID-DRAS Pipeline Run Complete ==="
