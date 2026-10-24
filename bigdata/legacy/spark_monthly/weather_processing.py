import os
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, when

LOCAL_FALLBACK = "/home/jagapathi/Downloads/big/datasets"

def run_weather_processing():
    spark = SparkSession.builder \
        .appName("AID-DRAS Weather Processing") \
        .master("local[*]") \
        .getOrCreate()
        
    weather_path = f"{LOCAL_FALLBACK}/rain fall dataset.csv"
    
    if os.path.exists(weather_path):
        df = spark.read.csv(weather_path, header=True, inferSchema=True)
        # Flag warning if precipitation exceeds 2800mm
        df_processed = df.withColumn("heavy_rain_warning", when(col("ANNUAL") > 2800.0, "YES").otherwise("NO"))
        print("Weather / Precipitation processed sample:")
        df_processed.select("SUBDIVISION", "YEAR", "ANNUAL", "heavy_rain_warning").show(5)
    else:
        print("Precipitation dataset not found, skipping weather processing.")
        
    spark.stop()

if __name__ == "__main__":
    run_weather_processing()
