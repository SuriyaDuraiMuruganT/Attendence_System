from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.schemas.attendance import (
    MarkInRequest,
    MarkOutRequest,
    AttendanceResponse,
    TodayAttendanceStatus
)
from app.services.auth_service import require_employee
from app.services.network_service import check_office_network
from app.services.attendance_service import (
    get_today_attendance,
    mark_in,
    mark_out
)
from app.utils.timezone import (
    get_ist_now,
    get_ist_today,
    is_late_arrival,
    is_early_departure
)

router = APIRouter(prefix="/attendance", tags=["Employee Attendance"])

def format_attendance_response(att: Attendance, emp: Employee) -> AttendanceResponse:
    return AttendanceResponse(
        id=att.id,
        employee_id=att.employee_id,
        employee_code=emp.employee_id,
        employee_name=emp.full_name,
        department=emp.department,
        attendance_date=att.attendance_date,
        in_time=att.in_time,
        out_time=att.out_time,
        in_status=att.in_status,
        out_status=att.out_status,
        late_reason=att.late_reason,
        early_departure_reason=att.early_departure_reason,
        total_hours=att.total_hours,
        client_ip=att.client_ip,
        is_correction=att.is_correction,
        created_at=att.created_at
    )

@router.get("/today", response_model=TodayAttendanceStatus)
def get_today_status(
    request: Request,
    auth_data: tuple[User, Employee] = Depends(require_employee),
    db: Session = Depends(get_db)
):
    _, employee = auth_data
    now_ist = get_ist_now()
    client_ip, is_office = check_office_network(request, db, enforce=False)
    
    attendance = get_today_attendance(db, employee.id, now_ist.date())
    
    status_str = "NOT_CHECKED_IN"
    if attendance:
        if attendance.in_time and not attendance.out_time:
            status_str = "WORKING"
        elif attendance.in_time and attendance.out_time:
            status_str = "COMPLETED"

    record_resp = format_attendance_response(attendance, employee) if attendance else None

    return TodayAttendanceStatus(
        status=status_str,
        server_time=now_ist.strftime("%I:%M:%S %p"),
        server_date=now_ist.strftime("%Y-%m-%d"),
        server_day=now_ist.strftime("%A"),
        is_after_late_threshold=is_late_arrival(now_ist),
        is_before_standard_out=is_early_departure(now_ist),
        record=record_resp,
        client_ip=client_ip,
        is_office_network=is_office
    )

@router.post("/in", response_model=AttendanceResponse)
def mark_attendance_in(
    payload: MarkInRequest,
    request: Request,
    auth_data: tuple[User, Employee] = Depends(require_employee),
    db: Session = Depends(get_db)
):
    _, employee = auth_data
    # 1. Enforce Office Network Validation
    client_ip, _ = check_office_network(request, db, enforce=True)

    # 2. Mark in with server timestamp
    attendance = mark_in(db, employee, client_ip, payload.late_reason)
    return format_attendance_response(attendance, employee)

@router.post("/out", response_model=AttendanceResponse)
def mark_attendance_out(
    payload: MarkOutRequest,
    request: Request,
    auth_data: tuple[User, Employee] = Depends(require_employee),
    db: Session = Depends(get_db)
):
    _, employee = auth_data
    # 1. Enforce Office Network Validation
    client_ip, _ = check_office_network(request, db, enforce=True)

    # 2. Mark out with server timestamp
    attendance = mark_out(db, employee, client_ip, payload.early_departure_reason)
    return format_attendance_response(attendance, employee)

@router.get("/history", response_model=List[AttendanceResponse])
def get_my_attendance_history(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    auth_data: tuple[User, Employee] = Depends(require_employee),
    db: Session = Depends(get_db)
):
    _, employee = auth_data
    now_ist = get_ist_now()
    target_year = year or now_ist.year
    target_month = month or now_ist.month

    query = db.query(Attendance).filter(
        Attendance.employee_id == employee.id
    )

    # Filter by month and year
    start_date = f"{target_year}-{target_month:02d}-01"
    if target_month == 12:
        end_date = f"{target_year + 1}-01-01"
    else:
        end_date = f"{target_year}-{target_month + 1:02d}-01"

    query = query.filter(
        Attendance.attendance_date >= start_date,
        Attendance.attendance_date < end_date
    ).order_by(Attendance.attendance_date.desc())

    records = query.all()
    return [format_attendance_response(r, employee) for r in records]

