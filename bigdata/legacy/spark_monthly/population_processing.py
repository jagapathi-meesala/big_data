import os
from pyspark.sql import SparkSession

LOCAL_FALLBACK = "/home/jagapathi/Downloads/big/datasets"

def run_population_processing():
    spark = SparkSession.builder \
        .appName("AID-DRAS Population Processing") \
        .master("local[*]") \
        .getOrCreate()
        
    pop_path = f"{LOCAL_FALLBACK}/population 11.csv"
    
    if os.path.exists(pop_path):
        df = spark.read.csv(pop_path, header=True, inferSchema=True)
        print("Population dataset loaded. Spark schema:")
        df.printSchema()
        df.show(5)
    else:
        print("Population dataset not found, skipping population processing.")
        
    spark.stop()

if __name__ == "__main__":
    run_population_processing()
