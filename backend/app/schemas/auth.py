from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    employee_id: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    employee_id: str
    full_name: str
    department: Optional[str] = None
    designation: Optional[str] = None

class UserInfoResponse(BaseModel):
    id: int
    employee_id: str
    role: str
    is_active: bool
    full_name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
