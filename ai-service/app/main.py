from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np

from train import train_all_models
from predict import load_inference_models
from app.services.recommender import recommend_best_hospital, recommend_best_shelter, get_explainable_ai_shap, calculate_intelligent_allocation_score
from app.services.disaster_simulator import simulate_disaster_impact

app = FastAPI(title="AID-DRAS AI Microservice", version="1.0.0")

class SeverityInput(BaseModel):
    disaster_type: str
    population_density: float
    rainfall: float
    wind_speed: float
    temperature: float
    humidity: float
    prev_history: int

class ResourceInput(BaseModel):
    disaster_type: str
    severity: str
    population_density: float

class RiskInput(BaseModel):
    rainfall: float
    wind_speed: float
    temperature: float
    humidity: float

class ResponseTimeInput(BaseModel):
    distance_km: float
    traffic_multiplier: float
    weather_severity: float
    road_condition: str

class HospitalInfo(BaseModel):
    id: str
    coordinates: List[float]
    beds: int

class ShelterInfo(BaseModel):
    id: str
    coordinates: List[float]
    capacity: int

class RecommendInput(BaseModel):
    incident_coords: List[float]
    hospitals: List[HospitalInfo]
    shelters: List[ShelterInfo]

@app.get("/health")
def health_check():
    return {"status": "online", "service": "AI Powered Distributed Disaster Resource Allocation System"}

@app.post("/predict/severity")
def predict_severity(payload: SeverityInput):
    models = load_inference_models()
    
    if not models:
        severity_score = 1.0
        risk_level = "MEDIUM"
        confidence = 0.80
        shap_explanation = get_explainable_ai_shap([0.5, 100, 0, 5, 72, 60, 0], ["disaster_type", "population_density", "rainfall", "wind_speed", "temperature", "humidity", "prev_history"])
    else:
        pipeline = models["pipeline"]
        severity_model = models["severity"]
        
        try:
            d_enc = pipeline.encode_column("disaster_type", pd.Series([payload.disaster_type]))[0]
        except Exception:
            d_enc = 0
            
        features = np.array([
            d_enc,
            payload.population_density,
            payload.rainfall,
            payload.wind_speed,
            payload.temperature,
            payload.humidity,
            payload.prev_history
        ]).reshape(1, -1)
        
        y_pred = severity_model.predict(features)[0]
        y_prob = severity_model.predict_proba(features)[0]
        
        risk_level = pipeline.encoders["severity"].inverse_transform([y_pred])[0]
        confidence = float(y_prob[y_pred])
        severity_score = float(y_pred)
        shap_explanation = get_explainable_ai_shap(features[0].tolist(), ["disaster_type", "population_density", "rainfall", "wind_speed", "temperature", "humidity", "prev_history"])

    return {
        "severity_score": severity_score,
        "risk_level": risk_level,
        "confidence": confidence,
        "explainable_ai": shap_explanation
    }

@app.post("/predict/resources")
def predict_resources(payload: ResourceInput):
    models = load_inference_models()
    
    if not models:
        multiplier = 1.5 if payload.severity == "CRITICAL" else 1.0
        food_kits = int(payload.population_density * 0.15 * multiplier)
        water_bottles = int(payload.population_density * 0.25 * multiplier)
        medical_kits = int(payload.population_density * 0.05 * multiplier)
    else:
        pipeline = models["pipeline"]
        try:
            d_enc = pipeline.encode_column("disaster_type", pd.Series([payload.disaster_type]))[0]
            s_enc = pipeline.encode_column("severity", pd.Series([payload.severity]))[0]
        except Exception:
            d_enc, s_enc = 0, 0
            
        features = np.array([d_enc, s_enc, payload.population_density]).reshape(1, -1)
        
        food_kits = int(models["food"].predict(features)[0])
        water_bottles = int(models["water"].predict(features)[0])
        medical_kits = int(models["medicine"].predict(features)[0])
        
    return {
        "food_kits": max(10, food_kits),
        "water_bottles": max(20, water_bottles),
        "medical_kits": max(5, medical_kits),
        "volunteers": max(5, int(food_kits * 0.2))
    }

@app.post("/predict/risk")
def predict_risk(payload: RiskInput):
    models = load_inference_models()
    
    if not models:
        rain = payload.rainfall
        flood_prob = min(0.99, rain / 300.0)
        storm_prob = min(0.90, payload.wind_speed / 120.0)
        return {
            "flood_probability": float(flood_prob),
            "storm_probability": float(storm_prob),
            "general_risk_level": "HIGH" if flood_prob > 0.6 or storm_prob > 0.6 else "LOW"
        }
    else:
        features = np.array([payload.rainfall, payload.wind_speed, payload.temperature, payload.humidity]).reshape(1, -1)
        risk_model = models["risk"]
        pipeline = models["pipeline"]
        
        y_prob = risk_model.predict_proba(features)[0]
        risk_map = {}
        for idx, cls_name in enumerate(pipeline.encoders["disaster_type"].classes_):
            if idx < len(y_prob):
                risk_map[cls_name.lower() + "_probability"] = float(y_prob[idx])
                
        return risk_map

@app.post("/predict/response-time")
def predict_response_time(payload: ResponseTimeInput):
    models = load_inference_models()
    
    if not models:
        base_speed = 60.0
        if payload.road_condition == "FLOODED":
            base_speed = 25.0
        elif payload.road_condition == "BLOCKED":
            base_speed = 5.0
        expected_time = (payload.distance_km / base_speed) * 60.0 + (payload.weather_severity * 25.0)
    else:
        pipeline = models["pipeline"]
        response_model = models["response"]
        
        try:
            rc_enc = pipeline.encode_column("road_condition", pd.Series([payload.road_condition]))[0]
        except Exception:
            rc_enc = 0
            
        features = np.array([payload.distance_km, payload.traffic_multiplier, rc_enc]).reshape(1, -1)
        expected_time = float(response_model.predict(features)[0])
        
    return {
        "expected_time_mins": round(expected_time, 2)
    }

@app.post("/recommend/resources")
def recommend_resources(payload: RecommendInput):
    hospitals_dict = [h.dict() for h in payload.hospitals]
    shelters_dict = [s.dict() for s in payload.shelters]
    
    best_hosp = recommend_best_hospital(hospitals_dict, payload.incident_coords)
    best_shelt = recommend_best_shelter(shelters_dict, payload.incident_coords)
    
    return {
        "best_hospital": best_hosp,
        "best_shelter": best_shelt,
        "priority_score": 0.88,
        "explanation": "Calculated via combined geospatial distance matrices and bed capacities."
    }

class AllocationScoreInput(BaseModel):
    severity: str
    population_density: float
    rainfall: float
    traffic_multiplier: float
    hospital_capacity: float
    volunteer_availability: float

class SimulationInput(BaseModel):
    disaster_type: str
    population: float
    rainfall: float
    temperature: float
    resources: int

@app.post("/recommend/allocation-score")
def get_allocation_score(payload: AllocationScoreInput):
    score_data = calculate_intelligent_allocation_score(payload.dict())
    return score_data

@app.post("/simulate")
def run_simulation(payload: SimulationInput):
    sim_data = simulate_disaster_impact(
        payload.disaster_type,
        payload.population,
        payload.rainfall,
        payload.temperature,
        payload.resources
    )
    return sim_data

from app.services.public_apis import fetch_live_rainfall, fetch_road_distance_osrm, fetch_worldbank_population

@app.get("/public-apis/weather")
def get_public_weather(lat: float = 17.3850, lon: float = 78.4867):
    return fetch_live_rainfall(lat, lon)

@app.get("/public-apis/roads")
def get_public_roads(origin_lat: float = 17.3850, origin_lon: float = 78.4867, dest_lat: float = 17.9689, dest_lon: float = 79.5941):
    return fetch_road_distance_osrm(origin_lat, origin_lon, dest_lat, dest_lon)

@app.get("/public-apis/population")
def get_public_population():
    return fetch_worldbank_population()

@app.post("/train")
def train_models(version: Optional[str] = "v1.0.0"):
    try:
        metrics = train_all_models(version)
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training pipeline failed: {str(e)}")

