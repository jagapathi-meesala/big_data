import json
import numpy as np
from pathlib import Path

# Default hardcoded weights (fallback)
_DEFAULT_WEIGHTS = {
    "Qd": 0.30,  # Predicted Risk Probability
    "Dd": 0.25,  # Population Exposure
    "Hd": 0.20,  # Healthcare Availability Deficit
    "Rd": 0.15,  # Road Infrastructure Deficit
    "Sd": 0.10,  # Shelter Availability Deficit
}

# Path to learned weights produced by weight_learning.py
_LEARNED_WEIGHTS_PATH = (
    Path(__file__).resolve().parents[3]
    / "bigdata" / "results" / "learned_ddrps_weights.json"
)


def _load_weights() -> dict:
    """Load XGBoost+SHAP learned weights if available, else use defaults."""
    try:
        if _LEARNED_WEIGHTS_PATH.exists():
            with open(_LEARNED_WEIGHTS_PATH) as f:
                data = json.load(f)
            lw = data.get("learned_weights", {})
            # ai-service uses Rd/Sd aliases (backward compat)
            return {
                "Qd": lw.get("Qd", _DEFAULT_WEIGHTS["Qd"]),
                "Dd": lw.get("Dd", _DEFAULT_WEIGHTS["Dd"]),
                "Hd": lw.get("Hd", _DEFAULT_WEIGHTS["Hd"]),
                "Rd": lw.get("Md", _DEFAULT_WEIGHTS["Rd"]),  # Md == Rd
                "Sd": lw.get("Vd", _DEFAULT_WEIGHTS["Sd"]),  # Vd == Sd
            }
    except Exception:
        pass
    return _DEFAULT_WEIGHTS


DDRPS_WEIGHTS = _load_weights()

def calculate_ddrps_priority(params: dict) -> dict:
    """
    Computes mathematical DDRPS priority score for FastAPI AI microservice:
    DDRPS_d = 0.30 * Qd + 0.25 * Dd + 0.20 * Hd + 0.15 * Rd + 0.10 * Sd
    """
    # 1. Inputs normalized in [0, 1]
    Qd = float(params.get("risk_probability", params.get("Qd", 0.50)))
    pop_density = float(params.get("population_density", 500.0))
    Dd = min(1.0, max(0.0, pop_density / 2000.0))
    
    # Healthcare deficit proxy (1 - available_beds_per_1k / max_beds_per_1k)
    hospital_capacity = float(params.get("hospital_capacity", 50.0))
    Hd = min(1.0, max(0.0, 1.0 - (hospital_capacity / 300.0)))
    
    # Road deficit proxy (based on traffic delay multiplier)
    traffic = float(params.get("traffic_multiplier", 1.2))
    Rd = min(1.0, max(0.0, (traffic - 1.0) / 1.5))
    
    # Shelter deficit proxy
    shelter_capacity = float(params.get("shelter_capacity", 50.0))
    Sd = min(1.0, max(0.0, 1.0 - (shelter_capacity / 200.0)))
    
    # 2. Weighted Score
    w = DDRPS_WEIGHTS
    ddrps_score = (
        w["Qd"] * Qd +
        w["Dd"] * Dd +
        w["Hd"] * Hd +
        w["Rd"] * Rd +
        w["Sd"] * Sd
    )
    ddrps_score = min(1.0, max(0.0, ddrps_score))
    
    # 3. Factor Contributions (%)
    total_non_zero = ddrps_score if ddrps_score > 0 else 1.0
    risk_contrib = round((w["Qd"] * Qd) / total_non_zero, 4)
    pop_contrib = round((w["Dd"] * Dd) / total_non_zero, 4)
    health_contrib = round((w["Hd"] * Hd) / total_non_zero, 4)
    road_contrib = round((w["Rd"] * Rd) / total_non_zero, 4)
    shelter_contrib = round((w["Sd"] * Sd) / total_non_zero, 4)
    
    # Priority rank category
    if ddrps_score >= 0.70:
        cat = "PRIORITY_1_CRITICAL"
    elif ddrps_score >= 0.50:
        cat = "PRIORITY_2_HIGH"
    elif ddrps_score >= 0.30:
        cat = "PRIORITY_3_MEDIUM"
    else:
        cat = "PRIORITY_4_LOW"
        
    return {
        "ddrps_score": round(ddrps_score, 4),
        "priority_category": cat,
        "sub_scores": {
            "risk_score_Qd": round(Qd, 4),
            "population_score_Dd": round(Dd, 4),
            "healthcare_deficit_Hd": round(Hd, 4),
            "road_deficit_Rd": round(Rd, 4),
            "shelter_deficit_Sd": round(Sd, 4)
        },
        "factor_contributions": {
            "risk_contribution": risk_contrib,
            "population_contribution": pop_contrib,
            "healthcare_contribution": health_contrib,
            "road_contribution": road_contrib,
            "shelter_contribution": shelter_contrib
        },
        "formula": "DDRPS = 0.30*Qd + 0.25*Dd + 0.20*Hd + 0.15*Rd + 0.10*Sd"
    }
