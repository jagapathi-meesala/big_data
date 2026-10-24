# AID-DRAS AI Microservice

This microservice exposes the predictive models and routing optimization engines for the **AI Powered Distributed Disaster Resource Allocation System**.

---

## Technology Stack
- **FastAPI** + **Uvicorn**
- **Scikit-Learn** (Random Forest classifiers/regressors)
- **TensorFlow/Keras** (LSTM/GRU sequential architectures)
- **Pandas** + **NumPy** + **Joblib**

---

## API Documentation

### 1. Health Status
- **Method**: `GET`
- **Path**: `/health`
- **Response**:
  ```json
  {
    "status": "online",
    "service": "AI Powered Distributed Disaster Resource Allocation System"
  }
  ```

### 2. Predict Incident Severity
- **Method**: `POST`
- **Path**: `/predict/severity`
- **Request Body**:
  ```json
  {
    "disaster_type": "FLOOD",
    "population_density": 450.0,
    "rainfall": 82.5,
    "wind_speed": 14.2,
    "temperature": 75.0,
    "humidity": 85.0,
    "prev_history": 1
  }
  ```
- **Response**:
  ```json
  {
    "severity_score": 2.0,
    "risk_level": "HIGH",
    "confidence": 0.94,
    "explanation": "Derived using Random Forest prediction weights.",
    "explainable_ai": {
      "explainer_type": "SHAP (TreeExplainer)",
      "base_value": 0.45,
      "feature_impacts": {
        "disaster_type": 0.45,
        "population_density": 0.25,
        "rainfall": 0.15
      }
    }
  }
  ```

### 3. Predict Supply Demands
- **Method**: `POST`
- **Path**: `/predict/resources`
- **Request Body**:
  ```json
  {
    "disaster_type": "FLOOD",
    "severity": "HIGH",
    "population_density": 1200.0
  }
  ```

### 4. Fetch Recommend Assets
- **Method**: `POST`
- **Path**: `/recommend/resources`
- **Request Body**:
  ```json
  {
    "incident_coords": [37.7749, -122.4194],
    "hospitals": [
      { "id": "hosp_01", "coordinates": [37.7899, -122.4094], "beds": 15 }
    ],
    "shelters": [
      { "id": "shelt_01", "coordinates": [37.7649, -122.4294], "capacity": 250 }
    ]
  }
  ```

---

## Local Training Instructions

To retrain the Random Forest classifiers locally, issue an HTTP post request to `/train`:
```bash
curl -X POST "http://localhost:8000/train?version=v1.1.0"
```
This fits preprocessors and serializes versioned `.joblib` binaries to the `models_store/` cache folder.
