#!/bin/bash

HDFS_BASE="/user/hadoop/datasets"

echo "Checking Hadoop command availability..."
if ! command -v hadoop &> /dev/null; then
    echo "Hadoop command line tools not found. Simulating local storage replication..."
    HDFS_SIMULATION_DIR="/home/jagapathi/Downloads/big/bigdata/hdfs"
    mkdir -p "$HDFS_SIMULATION_DIR"
    cp -r /home/jagapathi/Downloads/big/datasets/* "$HDFS_SIMULATION_DIR"
    echo "Simulated local storage replica upload complete."
    exit 0
fi

hadoop fs -mkdir -p "$HDFS_BASE"

echo "Uploading files from local datasets to HDFS..."
find /home/jagapathi/Downloads/big/datasets/ -name "*.csv" | while read -r file; do
    rel_path=$(realpath --relative-to=/home/jagapathi/Downloads/big/datasets "$file")
    hdfs_dir="$HDFS_BASE/$(dirname "$rel_path")"
    
    hadoop fs -mkdir -p "$hdfs_dir"
    echo "Uploading $file -> $hdfs_dir"
    hadoop fs -put -f "$file" "$hdfs_dir/"
done

echo "HDFS Dataset upload complete."
