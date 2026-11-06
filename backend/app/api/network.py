from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.network import OfficeNetworkSetting
from app.schemas.network import NetworkSettingCreate, NetworkSettingResponse, NetworkSettingUpdate
from app.services.auth_service import require_admin
from app.services.network_service import check_office_network, get_allowed_network_rules
from app.services.audit_service import log_admin_action
from app.utils.ip_validator import extract_client_ip
from app.utils.timezone import get_ist_now

router = APIRouter(prefix="/network", tags=["Office Network Configuration"])

@router.get("/status")
def get_network_status(
    request: Request,
    db: Session = Depends(get_db)
):
    client_ip, is_allowed = check_office_network(request, db, enforce=False)
    return {
        "client_ip": client_ip,
        "is_authorized_office_network": is_allowed,
        "message": "Connected from approved office network" if is_allowed else "Unauthorized network detected"
    }

@router.get("/settings", response_model=List[NetworkSettingResponse])
def list_network_settings(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    return db.query(OfficeNetworkSetting).order_by(OfficeNetworkSetting.id.desc()).all()

@router.post("/settings", response_model=NetworkSettingResponse)
def add_network_setting(
    payload: NetworkSettingCreate,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(OfficeNetworkSetting).filter(
        OfficeNetworkSetting.ip_or_cidr == payload.ip_or_cidr.strip()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Network rule '{payload.ip_or_cidr}' already exists."
        )

    now_ist = get_ist_now()
    setting = OfficeNetworkSetting(
        name=payload.name.strip(),
        ip_or_cidr=payload.ip_or_cidr.strip(),
        description=payload.description,
        is_active=payload.is_active,
        created_at=now_ist,
        updated_at=now_ist
    )
    db.add(setting)
    db.commit()
    db.refresh(setting)

    client_ip = extract_client_ip(request)
    log_admin_action(
        db=db,
        admin_id=admin.id,
        action="CREATE_NETWORK_RULE",
        target_type="office_network_settings",
        target_id=setting.id,
        details=f"Added office network rule {setting.ip_or_cidr} ({setting.name})",
        ip_address=client_ip
    )

    return setting

@router.delete("/settings/{setting_id}")
def delete_network_setting(
    setting_id: int,
    request: Request,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    setting = db.query(OfficeNetworkSetting).filter(OfficeNetworkSetting.id == setting_id).first()
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Network rule not found.")

    client_ip = extract_client_ip(request)
    log_admin_action(
        db=db,
        admin_id=admin.id,
        action="DELETE_NETWORK_RULE",
        target_type="office_network_settings",
        target_id=setting.id,
        details=f"Deleted office network rule {setting.ip_or_cidr} ({setting.name})",
        ip_address=client_ip
    )

    db.delete(setting)
    db.commit()
    return {"message": "Network rule deleted successfully."}
