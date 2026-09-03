def simulate_disaster_impact(disaster_type: str, population: float, rainfall: float, temp: float, resources: int) -> dict:
    disaster_type = disaster_type.upper()
    displaced = 0
    severity = "LOW"
    damage_usd = 0.0
    
    if disaster_type == "FLOOD":
        displaced = int(population * (rainfall / 300.0) * 0.4)
        damage_usd = (rainfall * population * 0.15)
        severity = "CRITICAL" if rainfall > 200 else "HIGH" if rainfall > 100 else "MEDIUM"
        
    elif disaster_type == "CYCLONE":
        displaced = int(population * 0.3)
        damage_usd = (population * 45.0)
        severity = "HIGH"
        
    elif disaster_type == "EARTHQUAKE":
        displaced = int(population * 0.15)
        damage_usd = (population * 120.0)
        severity = "CRITICAL"
        
    elif disaster_type == "LANDSLIDE":
        displaced = int(population * 0.05)
        damage_usd = (population * 15.0)
        severity = "MEDIUM"
        
    required_food = int(displaced * 1.2)
    resource_deficit = max(0, required_food - resources)
    
    return {
        "disaster_type": disaster_type,
        "predicted_displaced_people": max(0, displaced),
        "predicted_severity": severity,
        "infrastructure_damage_usd": round(damage_usd, 2),
        "resource_deficit": resource_deficit,
        "confidence_score": 0.88
    }
