from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.schemas.auth import LoginRequest, TokenResponse, UserInfoResponse
from app.services.auth_service import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    employee_id = payload.employee_id.strip()
    user = db.query(User).filter(User.employee_id == employee_id).first()
    
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Employee ID or password"
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is deactivated. Please contact administrator."
        )

    # Fetch employee profile details if present
    full_name = "Administrator" if user.role == "ADMIN" else user.employee_id
    department = "Administration" if user.role == "ADMIN" else "General"
    designation = "Administrator" if user.role == "ADMIN" else "Staff"

    if user.employee_profile:
        full_name = user.employee_profile.full_name
        department = user.employee_profile.department
        designation = user.employee_profile.designation

    token = create_access_token(data={"sub": user.employee_id, "role": user.role, "uid": user.id})

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        employee_id=user.employee_id,
        full_name=full_name,
        department=department,
        designation=designation
    )

@router.get("/me", response_model=UserInfoResponse)
def get_me(current_user: User = Depends(get_current_user)):
    full_name = current_user.employee_id
    email = None
    department = None
    designation = None

    if current_user.employee_profile:
        full_name = current_user.employee_profile.full_name
        email = current_user.employee_profile.email
        department = current_user.employee_profile.department
        designation = current_user.employee_profile.designation

    return UserInfoResponse(
        id=current_user.id,
        employee_id=current_user.employee_id,
        role=current_user.role,
        is_active=current_user.is_active,
        full_name=full_name,
        email=email,
        department=department,
        designation=designation
    )

