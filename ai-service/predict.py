import os
import joblib
from app.config import MODEL_DIR

def load_inference_models():
    try:
        pipeline = joblib.load(os.path.join(MODEL_DIR, "preprocessor_latest.joblib"))
        severity_model = joblib.load(os.path.join(MODEL_DIR, "severity_latest.joblib"))
        demand_food = joblib.load(os.path.join(MODEL_DIR, "demand_food_latest.joblib"))
        demand_water = joblib.load(os.path.join(MODEL_DIR, "demand_water_latest.joblib"))
        demand_med = joblib.load(os.path.join(MODEL_DIR, "demand_med_latest.joblib"))
        response_model = joblib.load(os.path.join(MODEL_DIR, "response_latest.joblib"))
        risk_model = joblib.load(os.path.join(MODEL_DIR, "risk_latest.joblib"))
        return {
            "pipeline": pipeline,
            "severity": severity_model,
            "food": demand_food,
            "water": demand_water,
            "medicine": demand_med,
            "response": response_model,
            "risk": risk_model
        }
    except Exception as e:
        print(f"Error loading models for inference: {e}")
        return None
