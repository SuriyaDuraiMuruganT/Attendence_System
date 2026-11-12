import os
import sys

# Ensure backend directory is in python path and working directory
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if os.path.exists(backend_dir):
    os.chdir(backend_dir)
    sys.path.insert(0, backend_dir)

from seed import seed_database

if __name__ == "__main__":
    seed_database()

