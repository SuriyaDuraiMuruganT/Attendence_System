from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

class MarkInRequest(BaseModel):
    late_reason: Optional[str] = None

class MarkOutRequest(BaseModel):
    early_departure_reason: Optional[str] = None

class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    attendance_date: date
    in_time: Optional[datetime] = None
    out_time: Optional[datetime] = None
    in_status: str
    out_status: str
    late_reason: Optional[str] = None
    early_departure_reason: Optional[str] = None
    total_hours: float
    client_ip: Optional[str] = None
    is_correction: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TodayAttendanceStatus(BaseModel):
    status: str  # 'NOT_CHECKED_IN', 'WORKING', 'COMPLETED'
    server_time: str
    server_date: str
    server_day: str
    is_after_late_threshold: bool
    is_before_standard_out: bool
    record: Optional[AttendanceResponse] = None
    client_ip: str
    is_office_network: bool

class AttendanceFilter(BaseModel):
    month: Optional[int] = None
    year: Optional[int] = None
    employee_id: Optional[int] = None
