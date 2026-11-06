from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional

class EmployeeCreate(BaseModel):
    employee_id: str
    full_name: str
    email: EmailStr
    department: str = "Engineering"
    designation: str = "Software Engineer"
    joining_date: date
    password: str

class EmployeeResponse(BaseModel):
    id: int
    user_id: int
    employee_id: str
    full_name: str
    email: str
    department: str
    designation: str
    joining_date: date
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class EmployeeStatusUpdate(BaseModel):
    is_active: bool
