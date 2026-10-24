#!/bin/bash

# Dynamic script location resolution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIGDATA_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$BIGDATA_DIR/.." && pwd)"

HDFS_BASE="/user/hadoop/datasets"
LOCAL_DATASETS="$PROJECT_ROOT/datasets"
HDFS_SIMULATION_DIR="$BIGDATA_DIR/hdfs"

echo "Checking Hadoop command availability..."
if ! command -v hadoop &> /dev/null; then
    echo "Hadoop command line tools not found. Simulating local HDFS storage replication..."
    mkdir -p "$HDFS_SIMULATION_DIR"
    cp -r "$LOCAL_DATASETS"/* "$HDFS_SIMULATION_DIR"/ 2>/dev/null || true
    echo "Simulated local HDFS storage replica upload complete at: $HDFS_SIMULATION_DIR"
    exit 0
fi

hadoop fs -mkdir -p "$HDFS_BASE"

echo "Uploading files from local datasets ($LOCAL_DATASETS) to HDFS..."
find "$LOCAL_DATASETS" -name "*.csv" | while read -r file; do
    rel_path=$(realpath --relative-to="$LOCAL_DATASETS" "$file")
    hdfs_dir="$HDFS_BASE/$(dirname "$rel_path")"
    
    hadoop fs -mkdir -p "$hdfs_dir"
    echo "Uploading $file -> $hdfs_dir"
    hadoop fs -put -f "$file" "$hdfs_dir/"
done

echo "HDFS Dataset upload complete."
