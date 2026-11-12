import os
import sys

backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if os.path.exists(backend_dir):
    os.chdir(backend_dir)

# Import the actual FastAPI app from backend/app/main.py
from app.main import app

