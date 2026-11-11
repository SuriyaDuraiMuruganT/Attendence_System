from typing import List
from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.models.network import OfficeNetworkSetting
from app.utils.ip_validator import extract_client_ip, is_ip_allowed

OFFICE_NETWORK_ERROR_MESSAGE = (
    "Connect to office Wi-Fi. Access is only permitted from the authorized office network (JioFiber-Growbytee5G)."
)

def get_allowed_network_rules(db: Session) -> List[str]:
    """
    Combines configured office network IPs from environment settings
    and active entries in office_network_settings table.
    """
    rules: List[str] = []
    
    # Env configured rules
    if isinstance(settings.APPROVED_OFFICE_IPS, list):
        rules.extend(settings.APPROVED_OFFICE_IPS)
    elif isinstance(settings.APPROVED_OFFICE_IPS, str):
        rules.extend([r.strip() for r in settings.APPROVED_OFFICE_IPS.split(",") if r.strip()])
        
    # Database registered active rules
    try:
        db_settings = db.query(OfficeNetworkSetting).filter(OfficeNetworkSetting.is_active == True).all()
        for item in db_settings:
            rules.append(item.ip_or_cidr.strip())
    except Exception:
        pass
        
    return list(set(rules))

def check_office_network(request: Request, db: Session, enforce: bool = True) -> tuple[str, bool]:
    """
    Extracts client IP and checks if it falls within the authorized office networks.
    If enforce=True and IP is not allowed, raises 403 Forbidden with standard message.
    """
    client_ip = extract_client_ip(request)
    
    # If network enforcement is turned off in settings, permit all
    if not settings.ENFORCE_OFFICE_NETWORK:
        return client_ip, True
        
    allowed_rules = get_allowed_network_rules(db)
    is_allowed = is_ip_allowed(client_ip, allowed_rules)
    
    if enforce and not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=OFFICE_NETWORK_ERROR_MESSAGE
        )
        
    return client_ip, is_allowed

