import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import Field, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Employee Attendance Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Timezone: Asia/Kolkata is mandatory
    TIMEZONE: str = "Asia/Kolkata"
    
    # Secrets
    JWT_SECRET_KEY: str = Field(default="dev-insecure-secret-key-change-in-production-attendance-system-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    
    # Database
    DATABASE_URL: str = Field(default="sqlite:///./attendance.db")
    
    # Network Restriction
    # Approved office public IPs or CIDR blocks
    APPROVED_OFFICE_IPS: Union[str, List[str]] = Field(
        default=["127.0.0.1", "::1", "10.0.0.0/8", "192.168.0.0/16", "172.16.0.0/12"]
    )
    ENFORCE_OFFICE_NETWORK: bool = True
    
    # Trusted reverse proxies for extracting real client IP (e.g., Render, Railway, Vercel)
    TRUSTED_PROXIES: Union[str, List[str]] = Field(
        default=["127.0.0.1", "::1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
    )
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    )

    @field_validator("APPROVED_OFFICE_IPS", "TRUSTED_PROXIES", "CORS_ORIGINS", mode="before")
    def parse_comma_separated(cls, v):
        if isinstance(v, str):
            items = [item.strip() for item in v.split(",") if item.strip()]
            return items
        return v

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
