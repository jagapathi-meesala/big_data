import os
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from xgboost import XGBClassifier, XGBRegressor

from feature_engineering import build_master_dataset
from preprocess import PreprocessingPipeline, save_pipeline
from app.config import MODEL_DIR

def train_all_models(version="v1.0.0"):
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Load or create master dataset
    df = build_master_dataset()
    
    # Initialize and fit Preprocessing pipeline
    pipeline = PreprocessingPipeline()
    
    df["disaster_type_enc"] = pipeline.encode_column("disaster_type", df["disaster_type"])
    df["severity_enc"] = pipeline.encode_column("severity", df["severity"])
    df["road_condition_enc"] = pipeline.encode_column("road_condition", df["road_condition"])
    
    # Save preprocessors
    save_pipeline(pipeline, os.path.join(MODEL_DIR, f"preprocessor_{version}.joblib"))
    save_pipeline(pipeline, os.path.join(MODEL_DIR, "preprocessor_latest.joblib"))
    
    # Features & targets shaping
    # A. Severity Prediction
    X_sev = df[["disaster_type_enc", "population_density", "rainfall", "wind_speed", "temperature", "humidity", "prev_history"]].values
    y_sev = df["severity_enc"].values
    
    # B. Resource Demands
    X_dem = df[["disaster_type_enc", "severity_enc", "population_density"]].values
    y_dem_food = df["demand_food"].values
    y_dem_water = df["demand_water"].values
    y_dem_med = df["demand_medical"].values
    
    # C. Response Times
    X_res = df[["distance_km", "traffic_multiplier", "road_condition_enc"]].values
    y_res = df["rescue_time_mins"].values

    # D. Disaster Risk
    X_risk = df[["rainfall", "wind_speed", "temperature", "humidity"]].values
    y_risk = df["disaster_type_enc"].values

    # Fitting Classifiers and Regressors
    severity_model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    severity_model.fit(X_sev, y_sev)
    
    demand_food_model = RandomForestRegressor(n_estimators=100, random_state=42)
    demand_food_model.fit(X_dem, y_dem_food)
    
    demand_water_model = RandomForestRegressor(n_estimators=100, random_state=42)
    demand_water_model.fit(X_dem, y_dem_water)
    
    demand_med_model = RandomForestRegressor(n_estimators=100, random_state=42)
    demand_med_model.fit(X_dem, y_dem_med)
    
    response_model = XGBRegressor(n_estimators=100, max_depth=6, random_state=42)
    response_model.fit(X_res, y_res)
    
    risk_model = XGBClassifier(n_estimators=100, max_depth=6, random_state=42, eval_metric="mlogloss")
    risk_model.fit(X_risk, y_risk)
    
    # Save versioned binaries
    joblib.dump(severity_model, os.path.join(MODEL_DIR, f"severity_model_{version}.joblib"))
    joblib.dump(demand_food_model, os.path.join(MODEL_DIR, f"demand_food_model_{version}.joblib"))
    joblib.dump(demand_water_model, os.path.join(MODEL_DIR, f"demand_water_model_{version}.joblib"))
    joblib.dump(demand_med_model, os.path.join(MODEL_DIR, f"demand_med_model_{version}.joblib"))
    joblib.dump(response_model, os.path.join(MODEL_DIR, f"response_model_{version}.joblib"))
    joblib.dump(risk_model, os.path.join(MODEL_DIR, f"risk_model_{version}.joblib"))
    
    # Save latest binaries
    joblib.dump(severity_model, os.path.join(MODEL_DIR, "severity_latest.joblib"))
    joblib.dump(demand_food_model, os.path.join(MODEL_DIR, "demand_food_latest.joblib"))
    joblib.dump(demand_water_model, os.path.join(MODEL_DIR, "demand_water_latest.joblib"))
    joblib.dump(demand_med_model, os.path.join(MODEL_DIR, "demand_med_latest.joblib"))
    joblib.dump(response_model, os.path.join(MODEL_DIR, "response_latest.joblib"))
    joblib.dump(risk_model, os.path.join(MODEL_DIR, "risk_latest.joblib"))
    
    print("All models successfully trained and serialized.")
    return {
        "status": "success",
        "version": version,
        "records_trained": len(df)
    }

if __name__ == "__main__":
    train_all_models()
