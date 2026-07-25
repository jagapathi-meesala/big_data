import os
import joblib
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split

class PreprocessingPipeline:
    def __init__(self):
        self.scalers = {}
        self.encoders = {}
        
    def fit_encoder(self, name, categories):
        le = LabelEncoder()
        # Add UNKNOWN label for unseen categories during inference
        cats = list(set([str(c) for c in categories]))
        if "UNKNOWN" not in cats:
            cats.append("UNKNOWN")
        le.fit(cats)
        self.encoders[name] = le
        return le
        
    def encode_column(self, name, series):
        if name not in self.encoders:
            self.fit_encoder(name, series)
        le = self.encoders[name]
        # Map unseen labels to UNKNOWN
        mapped = series.astype(str).apply(lambda x: x if x in le.classes_ else "UNKNOWN")
        return le.transform(mapped)

    def fit_scaler(self, name, data):
        scaler = StandardScaler()
        scaler.fit(data)
        self.scalers[name] = scaler
        return scaler

    def scale_column(self, name, data):
        if name not in self.scalers:
            self.fit_scaler(name, data)
        return self.scalers[name].transform(data)

def save_pipeline(pipeline, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(pipeline, path)
    print(f"Saved preprocessing pipeline to {path}")

def load_pipeline(path):
    if os.path.exists(path):
        return joblib.load(path)
    return PreprocessingPipeline()
