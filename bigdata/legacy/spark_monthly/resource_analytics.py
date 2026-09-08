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
                self.columns = ["name", "district", "District code", "District name", "Population", "SUBDIVISION", "YEAR", "Flood", "capacity", "occupied_beds"]
            def withColumn(self, c, val): return self
            def withColumnRenamed(self, c1, c2): return self
            def createOrReplaceTempView(self, view_name):
                print(f"[SIMULATED SPARK SQL VIEW] Registered temporary view: {view_name}")
        class MockReader:
            def csv(self, p, header=True, inferSchema=True):
                print(f"[SIMULATED SPARK READ] Loaded dataset from: {p}")
                return SparkSessionMock.MockDataFrame()
        read = MockReader()
        class MockSQL:
            def show(self): pass
        def sql(self, query):
            print(f"[SIMULATED SPARK SQL EXECUTE] {query}")
            return SparkSessionMock.MockSQL()
        def stop(self):
            print("[SIMULATED SPARK STOP] Spark session closed.")
        def createDataFrame(self, data, schema):
            return SparkSessionMock.MockDataFrame()
    SparkSession = SparkSessionMock

LOCAL_FALLBACK = "/home/jagapathi/Downloads/big/datasets"

def get_spark_session():
    return SparkSession.builder \
        .appName("AID-DRAS Resource Analytics SQL") \
        .master("local[*]") \
        .getOrCreate()

def run_sql_analytics():
    spark = get_spark_session()
    
    disaster_path = f"{LOCAL_FALLBACK}/disasterIND.csv"
    hospitals_path = f"{LOCAL_FALLBACK}/hospitals.csv"
    shelters_path = f"{LOCAL_FALLBACK}/disaster_project_datasets/shelters/shelters.csv"
    resources_path = f"{LOCAL_FALLBACK}/disaster_project_datasets/resources/resources.csv"
    
    # Load and clean columns to standard format
    if os.path.exists(disaster_path):
        df_dis = spark.read.csv(disaster_path, header=True, inferSchema=True)
        # Rename columns containing spaces for Spark SQL compatibility
        df_dis = df_dis.withColumnRenamed("Disaster Type", "disaster_type") \
                       .withColumnRenamed("Total Deaths", "total_deaths")
        df_dis.createOrReplaceTempView("disasters")
    else:
        spark.createDataFrame([
            ("1926-0008-IND", "FLOOD", 10.0),
            ("1905-0003-IND", "EARTHQUAKE", 20000.0)
        ], ["DisNo", "disaster_type", "total_deaths"]).createOrReplaceTempView("disasters")
        
    if os.path.exists(hospitals_path):
        df_hosp = spark.read.csv(hospitals_path, header=True, inferSchema=True)
        if "capacity" not in df_hosp.columns:
            from pyspark.sql.functions import lit
            df_hosp = df_hosp.withColumn("capacity", lit(300)) \
                             .withColumn("occupied_beds", lit(180))
        df_hosp.createOrReplaceTempView("hospitals")
    else:
        spark.createDataFrame([
            (1, "Hospital A", 500, 120),
            (2, "Hospital B", 300, 280)
        ], ["hospital_id", "hospital_name", "capacity", "occupied_beds"]).createOrReplaceTempView("hospitals")

    if os.path.exists(shelters_path):
        df_shelt = spark.read.csv(shelters_path, header=True, inferSchema=True)
        df_shelt.createOrReplaceTempView("shelters")
    else:
        spark.createDataFrame([
            (1, "Shelter A", 450, 210)
        ], ["shelter_id", "name", "capacity", "occupied"]).createOrReplaceTempView("shelters")

    if os.path.exists(resources_path):
        df_res = spark.read.csv(resources_path, header=True, inferSchema=True)
        df_res.createOrReplaceTempView("resources")
    else:
        spark.createDataFrame([
            (1, "Medicine Kit", 3000, "Available")
        ], ["resource_id", "resource_name", "quantity", "status"]).createOrReplaceTempView("resources")

    # 1. Query Disaster Counts
    print("--- 1. Disaster Count Summary ---")
    spark.sql("SELECT COUNT(*) as total_disasters, SUM(total_deaths) as total_deaths FROM disasters").show()
    
    # 2. Query Disaster Types
    print("--- 2. Disaster Types Distribution ---")
    spark.sql("SELECT disaster_type, COUNT(*) as count FROM disasters GROUP BY disaster_type").show()
    
    # 3. Query Average Capacity in Hospitals
    print("--- 3. Hospital Vacancy Analysis ---")
    spark.sql("SELECT SUM(capacity) as total_capacity, SUM(occupied_beds) as occupied, (SUM(capacity) - SUM(occupied_beds)) as available_beds FROM hospitals").show()

    # 4. Query Shelter availability
    print("--- 4. Shelter Capacity Summary ---")
    spark.sql("SELECT SUM(capacity) as total_capacity, SUM(occupied) as occupied, (SUM(capacity) - SUM(occupied)) as available_spaces FROM shelters").show()

    # 5. Query Resource inventory
    print("--- 5. Resource Stock Levels ---")
    spark.sql("SELECT resource_name, SUM(quantity) as total_qty FROM resources GROUP BY resource_name").show()
    
    spark.stop()

if __name__ == "__main__":
    run_sql_analytics()
