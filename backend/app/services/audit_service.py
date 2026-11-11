from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit import AdminAuditLog
from app.utils.timezone import get_ist_now

def log_admin_action(
    db: Session,
    admin_id: int,
    action: str,
    target_type: str,
    target_id: int,
    details: Optional[str] = None,
    ip_address: Optional[str] = None
) -> AdminAuditLog:
    audit_entry = AdminAuditLog(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        ip_address=ip_address,
        created_at=get_ist_now()
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry

