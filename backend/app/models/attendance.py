from sqlalchemy import Column, Integer, String, Float, Text, Boolean, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.timezone import get_ist_now

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_date = Column(Date, nullable=False, index=True)
    in_time = Column(DateTime(timezone=True), nullable=True)
    out_time = Column(DateTime(timezone=True), nullable=True)
    in_status = Column(String(20), default="ON_TIME", nullable=False)   # 'ON_TIME', 'LATE', 'MISSED', 'CORRECTED'
    out_status = Column(String(20), default="PENDING", nullable=False)  # 'ON_TIME', 'EARLY', 'PENDING', 'CORRECTED'
    late_reason = Column(Text, nullable=True)
    early_departure_reason = Column(Text, nullable=True)
    total_hours = Column(Float, default=0.0, nullable=False)
    client_ip = Column(String(50), nullable=True)
    is_correction = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_ist_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_ist_now, onupdate=get_ist_now, nullable=False)

    # Relationships
    employee = relationship("Employee", back_populates="attendances")
    correction_requests = relationship("AttendanceCorrectionRequest", back_populates="attendance")

    __table_args__ = (
        UniqueConstraint("employee_id", "attendance_date", name="uq_employee_attendance_date"),
    )

