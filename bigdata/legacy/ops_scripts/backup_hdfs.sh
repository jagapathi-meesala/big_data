#!/bin/bash

HDFS_SRC="/user/hadoop/datasets"
BACKUP_DIR="/home/jagapathi/Downloads/big/bigdata/hdfs/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "Starting Daily HDFS Backup process..."
mkdir -p "$BACKUP_DIR"

if ! command -v hadoop &> /dev/null; then
    echo "Hadoop tools unavailable. Archiving simulated HDFS directories..."
    tar -czf "$BACKUP_DIR/hdfs_backup_$TIMESTAMP.tar.gz" -C "/home/jagapathi/Downloads/big/bigdata/hdfs" .
    echo "Simulated archive completed: $BACKUP_DIR/hdfs_backup_$TIMESTAMP.tar.gz"
    exit 0
fi

echo "Downloading HDFS image data..."
hadoop fs -get "$HDFS_SRC" "/tmp/hdfs_backup_tmp"
tar -czf "$BACKUP_DIR/hdfs_backup_$TIMESTAMP.tar.gz" -C "/tmp/hdfs_backup_tmp" .
rm -rf "/tmp/hdfs_backup_tmp"

echo "Backup created successfully: $BACKUP_DIR/hdfs_backup_$TIMESTAMP.tar.gz"
