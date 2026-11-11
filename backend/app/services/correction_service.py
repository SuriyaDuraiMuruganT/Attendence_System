from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.correction import AttendanceCorrectionRequest
from app.schemas.correction import MissedDateOption
from app.utils.timezone import (
    get_ist_today,
    get_ist_now,
    calculate_working_hours,
    is_late_arrival,
    is_early_departure
)

def get_eligible_missed_dates(db: Session, employee: Employee) -> List[MissedDateOption]:
    """
    Returns dates for the last 7 calendar days up to yesterday,
    indicating which ones are within the 3-day correction window
    and were either completely missed or left without check-out.
    """
    today = get_ist_today()
    options: List[MissedDateOption] = []

    # Check past 7 days to show recent history, marking eligibility for <= 3 days ago
    for i in range(1, 8):
        target_date = today - timedelta(days=i)
        days_ago = i
        day_name = target_date.strftime("%A")

        # Check joining date
        if target_date < employee.joining_date:
            continue

        # Check if weekly off (e.g. Sunday = 6 in python weekday 0=Mon, 6=Sun)
        is_sunday = target_date.weekday() == 6

        # Check existing attendance
        attendance = db.query(Attendance).filter(
            Attendance.employee_id == employee.id,
            Attendance.attendance_date == target_date
        ).first()

        # Check pending correction request
        pending_req = db.query(AttendanceCorrectionRequest).filter(
            AttendanceCorrectionRequest.employee_id == employee.id,
            AttendanceCorrectionRequest.request_date == target_date,
            AttendanceCorrectionRequest.status == "PENDING"
        ).first()

        is_eligible = (days_ago <= 3) and (not is_sunday) and (pending_req is None)
        status_label = "Missed"

        if attendance:
            if attendance.in_time and not attendance.out_time:
                status_label = "Incomplete (Missing OUT)"
            elif attendance.in_time and attendance.out_time:
                status_label = "Completed"
                is_eligible = False  # Already present and complete
        elif is_sunday:
            status_label = "Weekly Off (Sunday)"
            is_eligible = False

        if pending_req:
            status_label = f"Correction Pending ({pending_req.status})"

        options.append(MissedDateOption(
            attendance_date=target_date,
            day_name=day_name,
            is_eligible=is_eligible,
            status_label=status_label,
            days_ago=days_ago,
            has_pending_request=pending_req is not None
        ))

    return options

def create_correction_request(
    db: Session,
    employee: Employee,
    request_date: date,
    claimed_in_time: datetime,
    claimed_out_time: Optional[datetime],
    reason: str
) -> AttendanceCorrectionRequest:
    today = get_ist_today()

    # Rule 1: Cannot be today or in the future
    if request_date >= today:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance correction can only be requested for past dates."
        )

    # Rule 2: Cannot be before employee joining date
    if request_date < employee.joining_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attendance correction cannot be requested for dates before joining date ({employee.joining_date})."
        )

    # Rule 3: Enforce strict 3-calendar-day window
    days_diff = (today - request_date).days
    if days_diff > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The 3-day correction window has expired for {request_date}. Corrections are only allowed within 3 calendar days."
        )

    # Rule 4: Cannot request on weekly off (Sunday)
    if request_date.weekday() == 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit attendance correction for a weekly off day (Sunday)."
        )

    # Rule 5: Cannot submit duplicate pending request
    existing_req = db.query(AttendanceCorrectionRequest).filter(
        AttendanceCorrectionRequest.employee_id == employee.id,
        AttendanceCorrectionRequest.request_date == request_date,
        AttendanceCorrectionRequest.status == "PENDING"
    ).first()
    if existing_req:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A correction request for {request_date} is already pending review."
        )

    # Check if attendance row exists
    attendance = db.query(Attendance).filter(
        Attendance.employee_id == employee.id,
        Attendance.attendance_date == request_date
    ).first()

    now_ist = get_ist_now()
    req = AttendanceCorrectionRequest(
        employee_id=employee.id,
        attendance_id=attendance.id if attendance else None,
        request_date=request_date,
        claimed_in_time=claimed_in_time,
        claimed_out_time=claimed_out_time,
        reason=reason.strip(),
        status="PENDING",
        created_at=now_ist,
        updated_at=now_ist
    )

    db.add(req)
    db.commit()
    db.refresh(req)
    return req

def review_correction_request(
    db: Session,
    request_id: int,
    admin_id: int,
    new_status: str,
    admin_remarks: Optional[str]
) -> AttendanceCorrectionRequest:
    if new_status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be either APPROVED or REJECTED."
        )

    req = db.query(AttendanceCorrectionRequest).filter(
        AttendanceCorrectionRequest.id == request_id
    ).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Correction request not found."
        )

    if req.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This request has already been reviewed ({req.status})."
        )

    now_ist = get_ist_now()
    req.status = new_status
    req.admin_id = admin_id
    req.admin_remarks = admin_remarks
    req.reviewed_at = now_ist
    req.updated_at = now_ist

    if new_status == "APPROVED":
        # Update or create the attendance record
        attendance = db.query(Attendance).filter(
            Attendance.employee_id == req.employee_id,
            Attendance.attendance_date == req.request_date
        ).first()

        in_status = "LATE" if is_late_arrival(req.claimed_in_time) else "ON_TIME"
        out_status = "ON_TIME"
        if req.claimed_out_time:
            out_status = "EARLY" if is_early_departure(req.claimed_out_time) else "ON_TIME"

        total_hours = 0.0
        if req.claimed_in_time and req.claimed_out_time:
            total_hours = calculate_working_hours(req.claimed_in_time, req.claimed_out_time)

        if not attendance:
            attendance = Attendance(
                employee_id=req.employee_id,
                attendance_date=req.request_date,
                in_time=req.claimed_in_time,
                out_time=req.claimed_out_time,
                in_status=in_status,
                out_status=out_status,
                late_reason="Approved correction: " + req.reason,
                early_departure_reason="Approved correction: " + req.reason if out_status == "EARLY" else None,
                total_hours=total_hours,
                client_ip="Historical Claim",
                is_correction=True,
                created_at=now_ist,
                updated_at=now_ist
            )
            db.add(attendance)
            db.flush()
            req.attendance_id = attendance.id
        else:
            attendance.in_time = req.claimed_in_time
            attendance.out_time = req.claimed_out_time
            attendance.in_status = in_status
            attendance.out_status = out_status
            attendance.total_hours = total_hours
            attendance.is_correction = True
            attendance.updated_at = now_ist

    db.commit()
    db.refresh(req)
    return req

