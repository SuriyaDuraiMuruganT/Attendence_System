from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.employee import Employee
from app.models.attendance import Attendance
from app.models.correction import AttendanceCorrectionRequest
from app.models.audit import AdminAuditLog
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeStatusUpdate
from app.schemas.attendance import AttendanceResponse
from app.schemas.correction import CorrectionResponse, CorrectionReviewRequest
from app.schemas.audit import AdminDashboardStats, AuditLogResponse
from app.services.auth_service import require_admin, hash_password
from app.services.correction_service import review_correction_request
from app.services.audit_service import log_admin_action
from app.utils.timezone import get_ist_now, get_ist_today
from app.utils.ip_validator import extract_client_ip

router = APIRouter(prefix="/admin", tags=["Admin Management"])

@router.get("/stats", response_model=AdminDashboardStats)
def get_admin_stats(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    today = get_ist_today()
    total_employees = db.query(Employee).filter(Employee.is_active == True).count()
    
    # Attendances today for active employees
    today_records = db.query(Attendance).join(Employee).filter(
        Attendance.attendance_date == today,
        Employee.is_active == True
    ).all()

    present_today = len(today_records)
    absent_missing_today = max(0, total_employees - present_today)
    
    # Currently working = marked in but no out_time
    currently_working = sum(1 for r in today_records if r.in_time and not r.out_time)
    
    # Incomplete attendance = yesterday or past dates with no out_time
    incomplete_attendance = db.query(Attendance).filter(
        Attendance.attendance_date < today,
        Attendance.in_time != None,
        Attendance.out_time == None
    ).count()

    pending_corrections = db.query(AttendanceCorrectionRequest).filter(
        AttendanceCorrectionRequest.status == "PENDING"
    ).count()

    return AdminDashboardStats(
        total_employees=total_employees,
        present_today=present_today,
        absent_missing_today=absent_missing_today,
        currently_working=currently_working,
        incomplete_attendance=incomplete_attendance,
        pending_corrections=pending_corrections
    )

@router.get("/today", response_model=List[dict])
def get_today_attendance_summary(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    today = get_ist_today()
    employees = db.query(Employee).filter(Employee.is_active == True).order_by(Employee.employee_id).all()
    records = {att.employee_id: att for att in db.query(Attendance).filter(Attendance.attendance_date == today).all()}

    summary = []
    for emp in employees:
        att = records.get(emp.id)
        if att:
            status_text = "COMPLETED" if att.out_time else "WORKING"
            summary.append({
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "department": emp.department,
                "attendance_date": today.isoformat(),
                "status": status_text,
                "in_time": att.in_time.isoformat() if att.in_time else None,
                "out_time": att.out_time.isoformat() if att.out_time else None,
                "in_status": att.in_status,
                "out_status": att.out_status,
                "late_reason": att.late_reason,
                "early_departure_reason": att.early_departure_reason,
                "total_hours": att.total_hours,
                "client_ip": att.client_ip,
                "is_correction": att.is_correction
            })
        else:
            summary.append({
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "department": emp.department,
                "attendance_date": today.isoformat(),
                "status": "ABSENT",
                "in_time": None,
                "out_time": None,
                "in_status": "NOT_MARKED",
                "out_status": "NOT_MARKED",
                "late_reason": None,
                "early_departure_reason": None,
                "total_hours": 0.0,
                "client_ip": None,
                "is_correction": False
            })
    return summary

@router.get("/employees", response_model=List[EmployeeResponse])
def list_employees(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(Employee).order_by(Employee.id.desc()).all()

@router.post("/employees", response_model=EmployeeResponse)
def create_employee(
    payload: EmployeeCreate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    emp_code = payload.employee_id.strip()
    
    # Check duplicate employee_id in users
    if db.query(User).filter(User.employee_id == emp_code).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee ID '{emp_code}' is already registered."
        )

    # Check duplicate email in employees
    if db.query(Employee).filter(Employee.email == payload.email.strip().lower()).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{payload.email}' is already registered."
        )

    # Create User
    now_ist = get_ist_now()
    user = User(
        employee_id=emp_code,
        password_hash=hash_password(payload.password),
        role="EMPLOYEE",
        is_active=True,
        created_at=now_ist,
        updated_at=now_ist
    )
    db.add(user)
    db.flush()

    # Create Employee Profile
    employee = Employee(
        user_id=user.id,
        employee_id=emp_code,
        full_name=payload.full_name.strip(),
        email=payload.email.strip().lower(),
        department=payload.department.strip(),
        designation=payload.designation.strip(),
        joining_date=payload.joining_date,
        is_active=True,
        created_at=now_ist,
        updated_at=now_ist
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    # Audit log
    client_ip = extract_client_ip(request)
    log_admin_action(
        db=db,
        admin_id=admin.id,
        action="CREATE_EMPLOYEE",
        target_type="employees",
        target_id=employee.id,
        details=f"Created employee {employee.employee_id} ({employee.full_name})",
        ip_address=client_ip
    )

    return employee

@router.patch("/employees/{emp_id}/status", response_model=EmployeeResponse)
def update_employee_status(
    emp_id: int,
    payload: EmployeeStatusUpdate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    employee = db.query(Employee).filter(Employee.id == emp_id).first()
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    employee.is_active = payload.is_active
    employee.updated_at = get_ist_now()

    # Also update corresponding user
    if employee.user:
        employee.user.is_active = payload.is_active
        employee.user.updated_at = get_ist_now()

    db.commit()
    db.refresh(employee)

    # Audit log
    action_name = "ACTIVATE_EMPLOYEE" if payload.is_active else "DEACTIVATE_EMPLOYEE"
    client_ip = extract_client_ip(request)
    log_admin_action(
        db=db,
        admin_id=admin.id,
        action=action_name,
        target_type="employees",
        target_id=employee.id,
        details=f"Updated status for employee {employee.employee_id} to {payload.is_active}",
        ip_address=client_ip
    )

    return employee

@router.get("/corrections", response_model=List[CorrectionResponse])
def list_corrections(
    status_filter: Optional[str] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(AttendanceCorrectionRequest).join(Employee)
    if status_filter:
        query = query.filter(AttendanceCorrectionRequest.status == status_filter)
    
    requests = query.order_by(AttendanceCorrectionRequest.created_at.desc()).all()
    results = []
    for r in requests:
        emp = r.employee
        results.append(CorrectionResponse(
            id=r.id,
            employee_id=r.employee_id,
            employee_code=emp.employee_id if emp else None,
            employee_name=emp.full_name if emp else None,
            department=emp.department if emp else None,
            attendance_id=r.attendance_id,
            request_date=r.request_date,
            claimed_in_time=r.claimed_in_time,
            claimed_out_time=r.claimed_out_time,
            reason=r.reason,
            status=r.status,
            admin_id=r.admin_id,
            admin_remarks=r.admin_remarks,
            reviewed_at=r.reviewed_at,
            created_at=r.created_at
        ))
    return results

@router.post("/corrections/{request_id}/review", response_model=CorrectionResponse)
def review_correction(
    request_id: int,
    payload: CorrectionReviewRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    updated_req = review_correction_request(
        db=db,
        request_id=request_id,
        admin_id=admin.id,
        new_status=payload.status,
        admin_remarks=payload.admin_remarks
    )

    # Audit log
    client_ip = extract_client_ip(request)
    log_admin_action(
        db=db,
        admin_id=admin.id,
        action=f"{payload.status}_CORRECTION",
        target_type="attendance_correction_requests",
        target_id=request_id,
        details=f"Correction for date {updated_req.request_date} set to {payload.status}. Remarks: {payload.admin_remarks}",
        ip_address=client_ip
    )

    emp = updated_req.employee
    return CorrectionResponse(
        id=updated_req.id,
        employee_id=updated_req.employee_id,
        employee_code=emp.employee_id if emp else None,
        employee_name=emp.full_name if emp else None,
        department=emp.department if emp else None,
        attendance_id=updated_req.attendance_id,
        request_date=updated_req.request_date,
        claimed_in_time=updated_req.claimed_in_time,
        claimed_out_time=updated_req.claimed_out_time,
        reason=updated_req.reason,
        status=updated_req.status,
        admin_id=updated_req.admin_id,
        admin_remarks=updated_req.admin_remarks,
        reviewed_at=updated_req.reviewed_at,
        created_at=updated_req.created_at
    )

@router.get("/history", response_model=List[AttendanceResponse])
def get_all_attendance_history(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    employee_id: Optional[int] = Query(None),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Attendance).join(Employee)

    if employee_id:
        query = query.filter(Attendance.employee_id == employee_id)

    if year and month:
        start_date = f"{year}-{month:02d}-01"
        end_date = f"{year + 1}-01-01" if month == 12 else f"{year}-{month + 1:02d}-01"
        query = query.filter(
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date < end_date
        )

    records = query.order_by(Attendance.attendance_date.desc(), Attendance.id.desc()).all()
    return [
        AttendanceResponse(
            id=r.id,
            employee_id=r.employee_id,
            employee_code=r.employee.employee_id,
            employee_name=r.employee.full_name,
            department=r.employee.department,
            attendance_date=r.attendance_date,
            in_time=r.in_time,
            out_time=r.out_time,
            in_status=r.in_status,
            out_status=r.out_status,
            late_reason=r.late_reason,
            early_departure_reason=r.early_departure_reason,
            total_hours=r.total_hours,
            client_ip=r.client_ip,
            is_correction=r.is_correction,
            created_at=r.created_at
        )
        for r in records
    ]

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    logs = db.query(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(100).all()
    results = []
    for log in logs:
        results.append(AuditLogResponse(
            id=log.id,
            admin_id=log.admin_id,
            admin_employee_id=log.admin.employee_id if log.admin else None,
            action=log.action,
            target_type=log.target_type,
            target_id=log.target_id,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at
        ))
    return results

