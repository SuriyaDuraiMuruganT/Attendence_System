from datetime import datetime, date
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.utils.timezone import (
    get_ist_now,
    get_ist_today,
    is_late_arrival,
    is_early_departure,
    calculate_working_hours,
    LATE_THRESHOLD_TIME,
    STANDARD_OUT_TIME
)

def get_today_attendance(db: Session, employee_id: int, today_date: Optional[date] = None) -> Optional[Attendance]:
    if today_date is None:
        today_date = get_ist_today()
    return db.query(Attendance).filter(
        Attendance.employee_id == employee_id,
        Attendance.attendance_date == today_date
    ).first()

def mark_in(
    db: Session,
    employee: Employee,
    client_ip: str,
    late_reason: Optional[str] = None
) -> Attendance:
    now_ist = get_ist_now()
    today = now_ist.date()

    existing = get_today_attendance(db, employee.id, today)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance has already been marked IN for today."
        )

    # Check if late
    is_late = is_late_arrival(now_ist)
    if is_late:
        if not late_reason or not late_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Late arrival reason is mandatory when checking in after 10:30 AM."
            )
        in_status = "LATE"
    else:
        in_status = "ON_TIME"

    attendance = Attendance(
        employee_id=employee.id,
        attendance_date=today,
        in_time=now_ist,
        out_time=None,
        in_status=in_status,
        out_status="PENDING",
        late_reason=late_reason.strip() if late_reason else None,
        early_departure_reason=None,
        total_hours=0.0,
        client_ip=client_ip,
        is_correction=False,
        created_at=now_ist,
        updated_at=now_ist
    )

    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    return attendance

def mark_out(
    db: Session,
    employee: Employee,
    client_ip: str,
    early_departure_reason: Optional[str] = None
) -> Attendance:
    now_ist = get_ist_now()
    today = now_ist.date()

    attendance = get_today_attendance(db, employee.id, today)
    if not attendance or not attendance.in_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot mark OUT without marking IN first for today."
        )

    if attendance.out_time is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance has already been completed (marked OUT) for today."
        )

    # Check if early departure
    is_early = is_early_departure(now_ist)
    if is_early:
        if not early_departure_reason or not early_departure_reason.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Early departure reason is mandatory when checking out before 05:30 PM."
            )
        out_status = "EARLY"
    else:
        out_status = "ON_TIME"

    attendance.out_time = now_ist
    attendance.out_status = out_status
    attendance.early_departure_reason = early_departure_reason.strip() if early_departure_reason else None
    attendance.total_hours = calculate_working_hours(attendance.in_time, now_ist)
    attendance.client_ip = client_ip
    attendance.updated_at = now_ist

    db.commit()
    db.refresh(attendance)
    return attendance

