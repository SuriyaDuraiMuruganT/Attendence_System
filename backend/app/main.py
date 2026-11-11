from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.models import User, Employee, Attendance, AttendanceCorrectionRequest, OfficeNetworkSetting, AdminAuditLog
from app.api.auth import router as auth_router
from app.api.attendance import router as attendance_router
from app.api.correction import router as correction_router
from app.api.admin import router as admin_router
from app.api.network import router as network_router
from app.utils.timezone import get_ist_now

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Employee Attendance Management System - Backend API"
)

# CORS setup
origins = settings.CORS_ORIGINS
if isinstance(origins, str):
    origins = [origins]
if "*" not in origins and "http://localhost:5173" not in origins:
    origins.extend(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits deployed frontend on Vercel or any origin in prototype
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(attendance_router, prefix=settings.API_V1_STR)
app.include_router(correction_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(network_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["System"])
@app.get("/api/health", tags=["System"])
def health_check():
    now_ist = get_ist_now()
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "server_time_ist": now_ist.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "timezone": settings.TIMEZONE
    }

@app.get("/", tags=["System"])
def root():
    return {
        "message": "Employee Attendance Management API",
        "docs": "/docs",
        "health": "/api/health"
    }

