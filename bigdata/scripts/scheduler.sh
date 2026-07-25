#!/bin/bash

echo "=== Running Big Data Scheduled Jobs ==="

echo "Step 1: Uploading datasets to HDFS..."
bash /home/jagapathi/Downloads/big/bigdata/scripts/upload_to_hdfs.sh

echo "Step 2: Starting Spark Batch Analytics..."
if command -v spark-submit &> /dev/null; then
    spark-submit /home/jagapathi/Downloads/big/bigdata/spark/data_cleaning.py
    spark-submit /home/jagapathi/Downloads/big/bigdata/spark/resource_analytics.py
    spark-submit /home/jagapathi/Downloads/big/bigdata/spark/prediction_preparation.py
else
    echo "Spark-submit tool not found. Simulating Spark job runs..."
    python3 /home/jagapathi/Downloads/big/bigdata/spark/data_cleaning.py
    python3 /home/jagapathi/Downloads/big/bigdata/spark/resource_analytics.py
    python3 /home/jagapathi/Downloads/big/bigdata/spark/prediction_preparation.py
fi

echo "Step 3: Triggering AI model retraining..."
curl -s -X POST "http://localhost:8000/train?version=auto_$(date +%s)"

echo "=== Big Data Schedule Run Complete ==="
