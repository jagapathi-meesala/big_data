import os
import psycopg2
from pyspark.sql import SparkSession
from app.config import DATABASE_URL

LOCAL_DATASETS = "/home/jagapathi/Downloads/big/datasets"

def run_sync_etl():
    print("Initializing distributed ETL Pipeline sync...")
    
    spark = SparkSession.builder \
        .appName("AID-DRAS ETL Synchronizer") \
        .master("local[*]") \
        .getOrCreate()
        
    # Read resource list
    resources_file = f"{LOCAL_DATASETS}/disaster_project_datasets/resources/resources.csv"
    
    if os.path.exists(resources_file):
        df = spark.read.csv(resources_file, header=True, inferSchema=True)
        df_clean = df.dropDuplicates().dropna(subset=["resource_name", "quantity"])
        rows = df_clean.collect()
        
        print(f"Loading {len(rows)} resources to PostGIS SQL database...")
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            # Clear old records to prevent duplicate load
            cur.execute("TRUNCATE TABLE resources CASCADE;")
            
            for row in rows:
                query = """
                INSERT INTO resources (type, quantity, status, geom, "createdAt", "updatedAt")
                VALUES (%s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), NOW(), NOW());
                """
                r_type = "FOOD"
                r_name = str(row["resource_name"]).upper()
                if "WATER" in r_name:
                    r_type = "WATER"
                elif "MEDICINE" in r_name:
                    r_type = "MEDICINE"
                elif "TENT" in r_name or "BLANKET" in r_name:
                    r_type = "SHELTER_CAPACITY"
                    
                cur.execute(query, (
                    r_type,
                    int(row["quantity"]),
                    "AVAILABLE" if str(row["status"]).lower() == "available" else "ALLOCATED",
                    float(row["longitude"]),
                    float(row["latitude"])
                ))
                
            conn.commit()
            cur.close()
            conn.close()
            print("PostgreSQL load successfully completed.")
        except Exception as e:
            print(f"Error loading to database: {e}")
    else:
        print("Resources CSV dataset not found. Skipping ETL loader.")
        
    spark.stop()

if __name__ == "__main__":
    run_sync_etl()
