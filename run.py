import os
import sys

# Ensure backend directory is in path and current working directory
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if os.path.exists(backend_dir):
    os.chdir(backend_dir)
    sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    # 1. Run seed script to ensure admin & rules are present
    try:
        import seed
        seed.seed_database()
    except Exception as e:
        print(f"[Startup Seed]: {e}")

    # 2. Start Uvicorn Web Server
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Attendance Server on 0.0.0.0:{port}...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=port)

