import json
import psycopg2
from pyspark.sql import SparkSession
from app.config import DATABASE_URL

def write_to_postgres(row):
    try:
        data = json.loads(row.value)
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        event_type = data.get("event_type", "INCIDENT")
        if event_type == "INCIDENT":
            query = """
            INSERT INTO incidents (title, description, severity, status, disaster_type, geom, "createdAt", "updatedAt")
            VALUES (%s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), NOW(), NOW());
            """
            cur.execute(query, (
                data.get("title", "SOS Event"),
                data.get("description", "Live Stream Dispatch"),
                data.get("severity", "MEDIUM"),
                data.get("status", "REPORTED"),
                data.get("disaster_type", "OTHER"),
                float(data.get("longitude", 0.0)),
                float(data.get("latitude", 0.0))
            ))
        elif event_type == "RESOURCE":
            query = """
            INSERT INTO resources (type, quantity, status, geom, "createdAt", "updatedAt")
            VALUES (%s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), NOW(), NOW());
            """
            cur.execute(query, (
                data.get("type", "FOOD"),
                int(data.get("quantity", 100)),
                data.get("status", "AVAILABLE"),
                float(data.get("longitude", 0.0)),
                float(data.get("latitude", 0.0))
            ))
            
        conn.commit()
        cur.close()
        conn.close()
        print(f"Successfully committed stream event to DB: {data}")
    except Exception as e:
        print(f"Error inserting streamed row to PostgreSQL: {e}")

def start_spark_streaming():
    spark = SparkSession.builder \
        .appName("AID-DRAS Spark Streaming Gateway") \
        .master("local[*]") \
        .getOrCreate()
        
    print("Initializing socket stream on port 9999...")
    try:
        lines = spark.readStream \
            .format("socket") \
            .option("host", "localhost") \
            .option("port", 9999) \
            .load()
            
        query = lines.writeStream \
            .foreach(write_to_postgres) \
            .start()
            
        query.awaitTermination()
    except Exception as e:
        print(f"Socket stream simulation error or termination: {e}")
        
    spark.stop()

if __name__ == "__main__":
    start_spark_streaming()
