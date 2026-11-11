import pytest
from datetime import datetime, date, timedelta, time
import pytz
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.config import settings
from app.models import User, Employee, Attendance, AttendanceCorrectionRequest, OfficeNetworkSetting
from app.services.auth_service import hash_password
from app.utils.timezone import IST

# Test Database in-memory
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_attendance.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create Admin
    admin_user = User(
        employee_id="ADMIN001",
        password_hash=hash_password("Admin@123"),
        role="ADMIN",
        is_active=True
    )
    db.add(admin_user)
    db.flush()
    
    # Create Employee
    emp_user = User(
        employee_id="EMP001",
        password_hash=hash_password("Pass@123"),
        role="EMPLOYEE",
        is_active=True
    )
    db.add(emp_user)
    db.flush()

    emp_profile = Employee(
        user_id=emp_user.id,
        employee_id="EMP001",
        full_name="Aarav Sharma",
        email="aarav@company.com",
        department="Engineering",
        designation="Software Engineer",
        joining_date=date(2024, 1, 1),
        is_active=True
    )
    db.add(emp_profile)

    # Approved Office IP
    office_rule = OfficeNetworkSetting(
        name="Office LAN",
        ip_or_cidr="192.168.10.0/24",
        is_active=True
    )
    db.add(office_rule)
    db.commit()
    db.close()

    yield
    Base.metadata.drop_all(bind=engine)

def test_1_login_and_logout():
    # 1. Invalid login
    res = client.post("/api/auth/login", json={"employee_id": "EMP001", "password": "WrongPassword"})
    assert res.status_code == 401

    # 2. Valid Employee Login
    res = client.post("/api/auth/login", json={"employee_id": "EMP001", "password": "Pass@123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "EMPLOYEE"
    assert data["employee_id"] == "EMP001"

    # 3. Valid Admin Login
    res_admin = client.post("/api/auth/login", json={"employee_id": "ADMIN001", "password": "Admin@123"})
    assert res_admin.status_code == 200
    assert res_admin.json()["role"] == "ADMIN"

def test_2_attendance_blocked_from_unauthorized_network():
    login_res = client.post("/api/auth/login", json={"employee_id": "EMP001", "password": "Pass@123"})
    token = login_res.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "203.0.113.50"  # Unauthorized external public IP
    }

    # Attempt to Mark IN
    res = client.post("/api/attendance/in", json={}, headers=headers)
    assert res.status_code == 403
    assert "Attendance can only be marked from the authorized office network" in res.json()["detail"]

def test_3_attendance_allowed_from_authorized_network(monkeypatch):
    login_res = client.post("/api/auth/login", json={"employee_id": "EMP001", "password": "Pass@123"})
    token = login_res.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "192.168.10.45"  # Within authorized 192.168.10.0/24
    }

    # Test IN before 10:30 AM (Mocking 10:15 AM)
    fixed_time = datetime(2026, 11, 6, 10, 15, 0, tzinfo=IST)
    import app.services.attendance_service as att_svc
    monkeypatch.setattr(att_svc, "get_ist_now", lambda: fixed_time)

    res = client.post("/api/attendance/in", json={}, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["in_status"] == "ON_TIME"
    assert data["total_hours"] == 0.0

def test_4_duplicate_in_prevention(monkeypatch):
    login_res = client.post("/api/auth/login", json={"employee_id": "EMP001", "password": "Pass@123"})
    token = login_res.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "192.168.10.45"
    }

    fixed_time = datetime(2026, 11, 6, 10, 20, 0, tzinfo=IST)
    import app.services.attendance_service as att_svc
    monkeypatch.setattr(att_svc, "get_ist_now", lambda: fixed_time)

    res = client.post("/api/attendance/in", json={}, headers=headers)
    assert res.status_code == 400
    assert "already been marked IN" in res.json()["detail"]

def test_5_out_before_530_requires_reason(monkeypatch):
    login_res = client.post("/api/auth/login", json={"employee_id": "EMP001", "password": "Pass@123"})
    token = login_res.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "192.168.10.45"
    }

    # Early departure at 4:30 PM (16:30)
    fixed_time = datetime(2026, 11, 6, 16, 30, 0, tzinfo=IST)
    import app.services.attendance_service as att_svc
    monkeypatch.setattr(att_svc, "get_ist_now", lambda: fixed_time)

    # Without reason should fail
    res = client.post("/api/attendance/out", json={}, headers=headers)
    assert res.status_code == 400
    assert "Early departure reason is mandatory" in res.json()["detail"]

    # With reason should succeed
    res2 = client.post("/api/attendance/out", json={"early_departure_reason": "Doctor appointment"}, headers=headers)
    assert res2.status_code == 200
    data = res2.json()
    assert data["out_status"] == "EARLY"
    assert data["early_departure_reason"] == "Doctor appointment"
    assert data["total_hours"] > 0

def test_6_duplicate_out_prevention(monkeypatch):
    login_res = client.post("/api/auth/login", json={"employee_id": "EMP001", "password": "Pass@123"})
    token = login_res.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "192.168.10.45"
    }

    fixed_time = datetime(2026, 11, 6, 18, 0, 0, tzinfo=IST)
    import app.services.attendance_service as att_svc
    monkeypatch.setattr(att_svc, "get_ist_now", lambda: fixed_time)

    res = client.post("/api/attendance/out", json={}, headers=headers)
    assert res.status_code == 400
    assert "already been completed" in res.json()["detail"]

def test_7_in_after_1030_requires_reason(monkeypatch):
    # Create another employee EMP002
    db = TestingSessionLocal()
    emp_user = User(employee_id="EMP002", password_hash=hash_password("Pass@123"), role="EMPLOYEE", is_active=True)
    db.add(emp_user)
    db.flush()
    emp = Employee(user_id=emp_user.id, employee_id="EMP002", full_name="Meera", email="meera@company.com", joining_date=date(2024, 1, 1), is_active=True)
    db.add(emp)
    db.commit()
    db.close()

    login_res = client.post("/api/auth/login", json={"employee_id": "EMP002", "password": "Pass@123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Forwarded-For": "192.168.10.45"}

    # Mock time at 10:45 AM
    fixed_time = datetime(2026, 11, 6, 10, 45, 0, tzinfo=IST)
    import app.services.attendance_service as att_svc
    monkeypatch.setattr(att_svc, "get_ist_now", lambda: fixed_time)

    # Without reason -> Fail
    res1 = client.post("/api/attendance/in", json={}, headers=headers)
    assert res1.status_code == 400
    assert "Late arrival reason is mandatory" in res1.json()["detail"]

    # With reason -> Success
    res2 = client.post("/api/attendance/in", json={"late_reason": "Metro train delay"}, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["in_status"] == "LATE"
    assert res2.json()["late_reason"] == "Metro train delay"

def test_8_correction_window_3_days_and_rejection_approval(monkeypatch):
    login_res = client.post("/api/auth/login", json={"employee_id": "EMP001", "password": "Pass@123"})
    emp_token = login_res.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    # Reference today is Nov 10, 2026 (Tuesday)
    # Nov 9 is 1 day ago -> eligible
    # Nov 8 is 2 days ago (Sunday) -> weekly off
    # Nov 7 is 3 days ago -> eligible
    # Nov 6 is 4 days ago -> EXPIRED
    fixed_today = date(2026, 11, 10)
    import app.services.correction_service as corr_svc
    monkeypatch.setattr(corr_svc, "get_ist_today", lambda: fixed_today)

    # 1. Past 3 days: Request for Nov 6 should be blocked
    res_expired = client.post("/api/corrections/request", json={
        "request_date": "2026-11-06",
        "claimed_in_time": "2026-11-06T10:00:00+05:30",
        "claimed_out_time": "2026-11-06T17:30:00+05:30",
        "reason": "Forgot badge"
    }, headers=emp_headers)
    assert res_expired.status_code == 400
    assert "3-day correction window has expired" in res_expired.json()["detail"]

    # 2. Within 3 days: Request for Nov 7 (Saturday, 3 days ago) -> Allowed
    res_valid = client.post("/api/corrections/request", json={
        "request_date": "2026-11-07",
        "claimed_in_time": "2026-11-07T10:00:00+05:30",
        "claimed_out_time": "2026-11-07T18:00:00+05:30",
        "reason": "System maintenance forgot swipe"
    }, headers=emp_headers)
    assert res_valid.status_code == 200
    corr_data = res_valid.json()
    assert corr_data["status"] == "PENDING"
    req_id = corr_data["id"]

    # 3. Admin Login & Approval
    admin_login = client.post("/api/auth/login", json={"employee_id": "ADMIN001", "password": "Admin@123"})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Approve request
    review_res = client.post(f"/api/admin/corrections/{req_id}/review", json={
        "status": "APPROVED",
        "admin_remarks": "Approved after manager confirmation"
    }, headers=admin_headers)
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "APPROVED"

    # Verify finalized attendance record was created and marked is_correction=True
    db = TestingSessionLocal()
    att = db.query(Attendance).filter(Attendance.attendance_date == date(2026, 11, 7)).first()
    assert att is not None
    assert att.is_correction == True
    assert att.total_hours == 8.0
    db.close()

