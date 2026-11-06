from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AuditLogResponse(BaseModel):
    id: int
    admin_id: int
    admin_employee_id: Optional[str] = None
    action: str
    target_type: str
    target_id: int
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AdminDashboardStats(BaseModel):
    total_employees: int
    present_today: int
    absent_missing_today: int
    currently_working: int
    incomplete_attendance: int
    pending_corrections: int
