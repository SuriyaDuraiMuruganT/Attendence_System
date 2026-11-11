from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class NetworkSettingCreate(BaseModel):
    name: str
    ip_or_cidr: str
    description: Optional[str] = None
    is_active: bool = True

class NetworkSettingUpdate(BaseModel):
    name: Optional[str] = None
    ip_or_cidr: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class NetworkSettingResponse(BaseModel):
    id: int
    name: str
    ip_or_cidr: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

