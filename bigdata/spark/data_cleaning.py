import os

try:
    from pyspark.sql import SparkSession
except ImportError:
    class SparkSessionMock:
        class Builder:
            def appName(self, name): return self
            def config(self, k, v): return self
            def master(self, m): return self
            def getOrCreate(self): return SparkSessionMock()
        builder = Builder()
        class MockDataFrame:
            def __init__(self):
                self.columns = ["name", "district", "District code", "District name", "Population", "SUBDIVISION", "YEAR", "Flood"]
            def dropDuplicates(self): return self
            def dropna(self, subset=None): return self
            class MockWriter:
                def mode(self, m): return self
                def csv(self, p, header=True):
                    print(f"[SIMULATED SPARK WRITE] Saved processed dataset to: {p}")
            write = MockWriter()
            def toPandas(self):
                class MockPandas:
                    def to_csv(self, p, index=False):
                        print(f"[SIMULATED PANDAS FALLBACK] Saved backup dataset to: {p}")
                return MockPandas()
        class MockReader:
            def csv(self, p, header=True, inferSchema=True):
                print(f"[SIMULATED SPARK READ] Loaded dataset from: {p}")
                return SparkSessionMock.MockDataFrame()
        read = MockReader()
        def stop(self):
            print("[SIMULATED SPARK STOP] Spark session closed.")
    SparkSession = SparkSessionMock

HDFS_BASE = "hdfs://namenode:9000/user/hadoop/datasets"
LOCAL_FALLBACK = "/home/jagapathi/Downloads/big/datasets"

def get_spark_session():
    return SparkSession.builder \
        .appName("AID-DRAS Data Cleaning") \
        .config("spark.driver.memory", "2g") \
        .master("local[*]") \
        .getOrCreate()

def clean_dataset(spark, file_name, key_cols):
    hdfs_path = f"{HDFS_BASE}/{file_name}"
    local_path = f"{LOCAL_FALLBACK}/{file_name}"
    
    try:
        df = spark.read.csv(hdfs_path, header=True, inferSchema=True)
        print(f"Reading from HDFS: {hdfs_path}")
    except Exception:
        # Resolve path including subdirectories
        resolved_local = local_path
        if not os.path.exists(resolved_local):
            # Try recursive find
            for root, dirs, files in os.walk(LOCAL_FALLBACK):
                for f in files:
                    if f == os.path.basename(file_name):
                        resolved_local = os.path.join(root, f)
                        break
        
        if os.path.exists(resolved_local):
            df = spark.read.csv(resolved_local, header=True, inferSchema=True)
            print(f"Reading from local path: {resolved_local}")
        else:
            print(f"File {file_name} not found.")
            return None
            
    df = df.dropDuplicates()
    df = df.dropna(subset=key_cols)
    
    try:
        output_path = f"{HDFS_BASE}/processed/{file_name}"
        df.write.mode("overwrite").csv(output_path, header=True)
        print(f"Cleaned dataset written back to: {output_path}")
    except Exception as e:
        print(f"Could not write to HDFS: {e}. Writing locally...")
        local_output = f"/home/jagapathi/Downloads/big/bigdata/hdfs/processed/{os.path.basename(file_name)}"
        os.makedirs(os.path.dirname(local_output), exist_ok=True)
        df.toPandas().to_csv(local_output, index=False)
        
    return df

if __name__ == "__main__":
    spark = get_spark_session()
    
    clean_dataset(spark, "Monthly Rainfall - flood Data 1901-2015.csv", ["SUBDIVISION", "YEAR", "Flood"])
    clean_dataset(spark, "hospitals.csv", ["name", "district"])
    clean_dataset(spark, "india-districts-census-2011.csv", ["District code", "District name", "Population"])
    
    spark.stop()
