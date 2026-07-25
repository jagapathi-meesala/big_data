from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from xgboost import XGBClassifier, XGBRegressor
from lightgbm import LGBMClassifier
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, GRU, Dense, Dropout

def create_random_forest_classifier(n_estimators=100, max_depth=10):
    return RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42)

def create_xgboost_classifier(n_estimators=100, max_depth=6):
    return XGBClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42, eval_metric="mlogloss")

def create_lightgbm_classifier(n_estimators=100, max_depth=6):
    return LGBMClassifier(n_estimators=n_estimators, max_depth=max_depth, random_state=42, verbose=-1)

def create_demand_predictor_rf():
    return RandomForestRegressor(n_estimators=100, random_state=42)

def create_demand_predictor_xgb():
    return XGBRegressor(n_estimators=100, random_state=42)

def build_lstm_forecaster(input_shape=(10, 1)):
    model = Sequential([
        LSTM(64, input_shape=input_shape, return_sequences=True),
        Dropout(0.2),
        LSTM(32),
        Dropout(0.2),
        Dense(4, activation='softmax') # Output probability: [Flood, Cyclone, Landslide, Wildfire]
    ])
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
    return model

def build_gru_forecaster(input_shape=(10, 1)):
    model = Sequential([
        GRU(64, input_shape=input_shape, return_sequences=True),
        Dropout(0.2),
        GRU(32),
        Dropout(0.2),
        Dense(4, activation='softmax')
    ])
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
    return model
