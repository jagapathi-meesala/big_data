from pyspark.sql import SparkSession
from pyspark.ml.feature import StringIndexer, VectorAssembler, StandardScaler

def get_spark_session():
    return SparkSession.builder \
        .appName("AID-DRAS Spark Feature Engineering") \
        .master("local[*]") \
        .getOrCreate()

def run_spark_feature_engineering():
    spark = get_spark_session()
    
    local_master_path = "/home/jagapathi/Downloads/big/datasets/training/master_dataset.csv"
    try:
        df = spark.read.csv(local_master_path, header=True, inferSchema=True)
    except Exception:
        df = spark.createDataFrame([
            ("FLOOD", 500.0, 120.0, 15.0, 72.0, 85.0, 1, "HIGH"),
            ("FIRE", 200.0, 10.0, 25.0, 95.0, 40.0, 0, "MEDIUM")
        ], ["disaster_type", "population_density", "rainfall", "wind_speed", "temperature", "humidity", "prev_history", "severity"])

    # Category indexing
    indexer_type = StringIndexer(inputCol="disaster_type", outputCol="disaster_type_indexed", handleInvalid="keep")
    df_indexed = indexer_type.fit(df).transform(df)
    
    # Assembly
    feature_cols = ["disaster_type_indexed", "population_density", "rainfall", "wind_speed", "temperature", "humidity", "prev_history"]
    assembler = VectorAssembler(inputCols=feature_cols, outputCol="raw_features", handleInvalid="keep")
    df_assembled = assembler.transform(df_indexed)
    
    # Scale
    scaler = StandardScaler(inputCol="raw_features", outputCol="scaled_features", withStd=True, withMean=True)
    scaler_model = scaler.fit(df_assembled)
    df_scaled = scaler_model.transform(df_assembled)
    
    print("Spark MLlib Vector Assembler output schema:")
    df_scaled.select("scaled_features").show(2, truncate=False)
    
    spark.stop()

if __name__ == "__main__":
    run_spark_feature_engineering()
