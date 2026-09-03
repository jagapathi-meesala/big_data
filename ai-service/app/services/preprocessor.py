import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder

class DataPreprocessor:
    def __init__(self):
        self.scaler = StandardScaler()
        self.severity_encoder = LabelEncoder()
        self.disaster_encoder = LabelEncoder()
        
    def fit(self, df):
        # Fit encoders
        if "disaster_type" in df.columns:
            self.disaster_encoder.fit(df["disaster_type"].astype(str))
        if "severity" in df.columns:
            self.severity_encoder.fit(df["severity"].astype(str))
            
    def transform_severity_input(self, data: dict):
        # Expects: disaster_type, population_density, rainfall, wind_speed, temp, humidity, prev_history
        try:
            disaster_val = str(data.get("disaster_type", "OTHER"))
            disaster_encoded = self.disaster_encoder.transform([disaster_val])[0]
        except Exception:
            disaster_encoded = 0
            
        feature_vector = np.array([
            disaster_encoded,
            float(data.get("population_density", 100.0)),
            float(data.get("rainfall", 0.0)),
            float(data.get("wind_speed", 5.0)),
            float(data.get("temperature", 72.0)),
            float(data.get("humidity", 60.0)),
            float(data.get("prev_history", 0))
        ]).reshape(1, -1)
        
        return feature_vector

    def prepare_time_series_data(self, history_series, lookback=10):
        # LSTM/GRU 3D array shaper: [samples, timesteps, features]
        X = []
        for i in range(len(history_series) - lookback):
            X.append(history_series[i:(i + lookback)])
        return np.array(X)
