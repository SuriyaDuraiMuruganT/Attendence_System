import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date
from app.database import SessionLocal, Base, engine
from app.models import User, Employee, OfficeNetworkSetting
from app.services.auth_service import hash_password
from app.utils.timezone import get_ist_now

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    now_ist = get_ist_now()

    try:
        # 1. Seed Admin
        admin = db.query(User).filter(User.employee_id == "ADMIN001").first()
        if not admin:
            print("Creating default Admin user (ADMIN001)...")
            admin = User(
                employee_id="ADMIN001",
                password_hash=hash_password("AdminPassword@123"),
                role="ADMIN",
                is_active=True,
                created_at=now_ist,
                updated_at=now_ist
            )
            db.add(admin)
            db.flush()

            admin_emp = Employee(
                user_id=admin.id,
                employee_id="ADMIN001",
                full_name="Operations Administrator",
                email="admin@company.com",
                department="Management",
                designation="System Admin",
                joining_date=date(2023, 1, 1),
                is_active=True,
                created_at=now_ist,
                updated_at=now_ist
            )
            db.add(admin_emp)
            db.commit()
            print("Admin created successfully: ID=ADMIN001, Pass=AdminPassword@123")
        else:
            print("Admin user already exists.")

        # 2. Seed Employee 1
        emp1 = db.query(User).filter(User.employee_id == "EMP101").first()
        if not emp1:
            print("Creating sample employee (EMP101)...")
            emp1 = User(
                employee_id="EMP101",
                password_hash=hash_password("Employee@123"),
                role="EMPLOYEE",
                is_active=True,
                created_at=now_ist,
                updated_at=now_ist
            )
            db.add(emp1)
            db.flush()

            emp1_profile = Employee(
                user_id=emp1.id,
                employee_id="EMP101",
                full_name="Rahul Sharma",
                email="rahul.sharma@company.com",
                department="Engineering",
                designation="Senior Software Engineer",
                joining_date=date(2024, 1, 15),
                is_active=True,
                created_at=now_ist,
                updated_at=now_ist
            )
            db.add(emp1_profile)
            db.commit()
            print("Employee 1 created: ID=EMP101, Pass=Employee@123")

        # 3. Seed Employee 2
        emp2 = db.query(User).filter(User.employee_id == "EMP102").first()
        if not emp2:
            print("Creating sample employee (EMP102)...")
            emp2 = User(
                employee_id="EMP102",
                password_hash=hash_password("Employee@123"),
                role="EMPLOYEE",
                is_active=True,
                created_at=now_ist,
                updated_at=now_ist
            )
            db.add(emp2)
            db.flush()

            emp2_profile = Employee(
                user_id=emp2.id,
                employee_id="EMP102",
                full_name="Priya Patel",
                email="priya.patel@company.com",
                department="Product Design",
                designation="Lead UI Designer",
                joining_date=date(2024, 3, 1),
                is_active=True,
                created_at=now_ist,
                updated_at=now_ist
            )
            db.add(emp2_profile)
            db.commit()
            print("Employee 2 created: ID=EMP102, Pass=Employee@123")

        # 4. Seed Office Network Rules
        rules = [
            ("Jio Office Wi-Fi (IPv4)", "49.37.201.144", "Reliance Jio Public IPv4"),
            ("Jio Office Wi-Fi Subnet (IPv4)", "49.37.201.0/24", "Reliance Jio IPv4 Subnet"),
            ("Jio Office Wi-Fi (IPv6)", "2405:201:e029:f00c:2dc9:10f8:e8d0:dff9", "Reliance Jio Public IPv6"),
            ("Jio Office Wi-Fi Subnet (IPv6)", "2405:201:e029:f00c::/64", "Reliance Jio IPv6 Subnet Prefix"),
            ("Office LAN Router", "192.168.29.0/24", "Local Office LAN Subnet"),
        ]

        for name, cidr, desc in rules:
            existing = db.query(OfficeNetworkSetting).filter(OfficeNetworkSetting.ip_or_cidr == cidr).first()
            if not existing:
                setting = OfficeNetworkSetting(
                    name=name,
                    ip_or_cidr=cidr,
                    description=desc,
                    is_active=True,
                    created_at=now_ist,
                    updated_at=now_ist
                )
                db.add(setting)
        db.commit()
        print("Office Network Rules verified.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
