import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/aid_dras")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000/api/v1")
MODEL_DIR = os.getenv("MODEL_DIR", "models_store")
