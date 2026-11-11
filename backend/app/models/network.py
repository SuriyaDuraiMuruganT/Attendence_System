from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from app.database import Base
from app.utils.timezone import get_ist_now

class OfficeNetworkSetting(Base):
    __tablename__ = "office_network_settings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    ip_or_cidr = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=get_ist_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=get_ist_now, onupdate=get_ist_now, nullable=False)

