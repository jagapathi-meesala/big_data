import os
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, mean_absolute_error
from sklearn.model_selection import train_test_split
from feature_engineering import build_master_dataset
from app.config import MODEL_DIR

def evaluate_all_models():
    preprocessor_path = os.path.join(MODEL_DIR, "preprocessor_latest.joblib")
    if not os.path.exists(preprocessor_path):
        print("No trained models found to evaluate. Please execute train.py first.")
        return {}
        
    pipeline = joblib.load(preprocessor_path)
    severity_model = joblib.load(os.path.join(MODEL_DIR, "severity_latest.joblib"))
    demand_food_model = joblib.load(os.path.join(MODEL_DIR, "demand_food_latest.joblib"))
    response_model = joblib.load(os.path.join(MODEL_DIR, "response_latest.joblib"))
    risk_model = joblib.load(os.path.join(MODEL_DIR, "risk_latest.joblib"))
    
    df = build_master_dataset()
    df["disaster_type_enc"] = pipeline.encode_column("disaster_type", df["disaster_type"])
    df["severity_enc"] = pipeline.encode_column("severity", df["severity"])
    df["road_condition_enc"] = pipeline.encode_column("road_condition", df["road_condition"])
    
    # 1. Severity Evaluation
    X_sev = df[["disaster_type_enc", "population_density", "rainfall", "wind_speed", "temperature", "humidity", "prev_history"]].values
    y_sev = df["severity_enc"].values
    
    _, X_test_sev, _, y_test_sev = train_test_split(X_sev, y_sev, test_size=0.2, random_state=42)
    sev_preds = severity_model.predict(X_test_sev)
    sev_acc = accuracy_score(y_test_sev, sev_preds)
    
    # 2. Demand Evaluation
    X_dem = df[["disaster_type_enc", "severity_enc", "population_density"]].values
    y_dem_food = df["demand_food"].values
    _, X_test_dem, _, y_test_dem = train_test_split(X_dem, y_dem_food, test_size=0.2, random_state=42)
    dem_preds = demand_food_model.predict(X_test_dem)
    dem_mae = mean_absolute_error(y_test_dem, dem_preds)
    
    # 3. Response Time Evaluation
    X_res = df[["distance_km", "traffic_multiplier", "road_condition_enc"]].values
    y_res = df["rescue_time_mins"].values
    _, X_test_res, _, y_test_res = train_test_split(X_res, y_res, test_size=0.2, random_state=42)
    res_preds = response_model.predict(X_test_res)
    res_mae = mean_absolute_error(y_test_res, res_preds)

    # 4. Disaster Risk Evaluation
    X_risk = df[["rainfall", "wind_speed", "temperature", "humidity"]].values
    y_risk = df["disaster_type_enc"].values
    _, X_test_risk, _, y_test_risk = train_test_split(X_risk, y_risk, test_size=0.2, random_state=42)
    risk_preds = risk_model.predict(X_test_risk)
    risk_acc = accuracy_score(y_test_risk, risk_preds)
    
    print("--- MODEL EVALUATION METRICS ---")
    print(f"Disaster Severity Classifier Accuracy: {sev_acc * 100:.2f}%")
    print(f"Resource Demand Predictor (Food) MAE: {dem_mae:.2f} units")
    print(f"Rescue Response Time Regressor MAE: {res_mae:.2f} mins")
    print(f"Disaster Risk Classifier Accuracy: {risk_acc * 100:.2f}%")
    
    return {
        "severity_accuracy": float(sev_acc),
        "demand_food_mae": float(dem_mae),
        "response_time_mae": float(res_mae),
        "risk_classifier_accuracy": float(risk_acc)
    }

if __name__ == "__main__":
    evaluate_all_models()
