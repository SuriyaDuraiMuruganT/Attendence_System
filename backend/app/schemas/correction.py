from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional

class MissedDateOption(BaseModel):
    attendance_date: date
    day_name: str
    is_eligible: bool
    status_label: str  # 'Missed', 'Incomplete (No OUT)', 'Existing'
    days_ago: int
    has_pending_request: bool

class CorrectionCreateRequest(BaseModel):
    request_date: date
    claimed_in_time: datetime
    claimed_out_time: Optional[datetime] = None
    reason: str

class CorrectionReviewRequest(BaseModel):
    status: str  # 'APPROVED', 'REJECTED'
    admin_remarks: Optional[str] = None

class CorrectionResponse(BaseModel):
    id: int
    employee_id: int
    employee_code: Optional[str] = None
    employee_name: Optional[str] = None
    department: Optional[str] = None
    attendance_id: Optional[int] = None
    request_date: date
    claimed_in_time: datetime
    claimed_out_time: Optional[datetime] = None
    reason: str
    status: str
    admin_id: Optional[int] = None
    admin_remarks: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
