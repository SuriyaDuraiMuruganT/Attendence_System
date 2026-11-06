from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.correction import AttendanceCorrectionRequest
from app.schemas.correction import (
    MissedDateOption,
    CorrectionCreateRequest,
    CorrectionResponse
)
from app.services.auth_service import require_employee
from app.services.correction_service import (
    get_eligible_missed_dates,
    create_correction_request
)

router = APIRouter(prefix="/corrections", tags=["Attendance Corrections"])

def format_correction_response(req: AttendanceCorrectionRequest, emp: Employee) -> CorrectionResponse:
    return CorrectionResponse(
        id=req.id,
        employee_id=req.employee_id,
        employee_code=emp.employee_id,
        employee_name=emp.full_name,
        department=emp.department,
        attendance_id=req.attendance_id,
        request_date=req.request_date,
        claimed_in_time=req.claimed_in_time,
        claimed_out_time=req.claimed_out_time,
        reason=req.reason,
        status=req.status,
        admin_id=req.admin_id,
        admin_remarks=req.admin_remarks,
        reviewed_at=req.reviewed_at,
        created_at=req.created_at
    )

@router.get("/eligible-dates", response_model=List[MissedDateOption])
def list_eligible_missed_dates(
    auth_data: tuple[User, Employee] = Depends(require_employee),
    db: Session = Depends(get_db)
):
    _, employee = auth_data
    return get_eligible_missed_dates(db, employee)

@router.post("/request", response_model=CorrectionResponse)
def submit_correction_request(
    payload: CorrectionCreateRequest,
    auth_data: tuple[User, Employee] = Depends(require_employee),
    db: Session = Depends(get_db)
):
    _, employee = auth_data
    req = create_correction_request(
        db=db,
        employee=employee,
        request_date=payload.request_date,
        claimed_in_time=payload.claimed_in_time,
        claimed_out_time=payload.claimed_out_time,
        reason=payload.reason
    )
    return format_correction_response(req, employee)

@router.get("/my-requests", response_model=List[CorrectionResponse])
def get_my_requests(
    auth_data: tuple[User, Employee] = Depends(require_employee),
    db: Session = Depends(get_db)
):
    _, employee = auth_data
    requests = db.query(AttendanceCorrectionRequest).filter(
        AttendanceCorrectionRequest.employee_id == employee.id
    ).order_by(AttendanceCorrectionRequest.created_at.desc()).all()

    return [format_correction_response(r, employee) for r in requests]
