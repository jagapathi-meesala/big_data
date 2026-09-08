import os
from pyspark.sql import SparkSession

LOCAL_FALLBACK = "/home/jagapathi/Downloads/big/datasets"

def run_disaster_processing():
    spark = SparkSession.builder \
        .appName("AID-DRAS Disaster Processing") \
        .master("local[*]") \
        .getOrCreate()
        
    disaster_path = f"{LOCAL_FALLBACK}/disasterIND.csv"
    
    if os.path.exists(disaster_path):
        df = spark.read.csv(disaster_path, header=True, inferSchema=True)
        df = df.withColumnRenamed("Disaster Type", "disaster_type") \
               .withColumnRenamed("Start Year", "start_year")
        print("Disaster events registered in India since 2000:")
        df.filter(df["start_year"] >= 2000) \
          .select("DisNo.", "disaster_type", "start_year", "Location") \
          .show(10, truncate=False)
    else:
        print("Disaster dataset not found, skipping disaster processing.")
        
    spark.stop()

if __name__ == "__main__":
    run_disaster_processing()
