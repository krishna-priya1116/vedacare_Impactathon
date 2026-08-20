"""
VedaCare — Alerts router.
GET /caregivers/{id}/alerts, POST /alerts/{id}/review, POST /alerts/{id}/resolve
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Alert
from schemas import AlertListResponse, AlertItem, SuccessResponse
from routers.auth import get_current_user
from audit import write_audit

router = APIRouter(tags=["Alerts"])


@router.get("/caregivers/{caregiver_id}/alerts", response_model=AlertListResponse)
def list_alerts(
    caregiver_id: int,
    status: str = Query("active"),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(Alert).filter(Alert.caregiver_id == caregiver_id)
    if status:
        query = query.filter(Alert.status == status)
    alerts = query.order_by(Alert.sent_at.desc()).all()
    return AlertListResponse(
        alerts=[
            AlertItem(
                id=a.id,
                type=a.type,
                severity=a.severity,
                message=a.message,
                time=a.sent_at.isoformat() if a.sent_at else None,
            )
            for a in alerts
        ]
    )


@router.post("/alerts/{alert_id}/review", response_model=SuccessResponse)
def review_alert(alert_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.status = "reviewed"
    db.commit()
    write_audit(db, alert.patient_id, "caregiver", user["id"], "alert_reviewed",
                f"Alert #{alert.id} reviewed")
    return SuccessResponse()


@router.post("/alerts/{alert_id}/resolve", response_model=SuccessResponse)
def resolve_alert(alert_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.status = "resolved"
    db.commit()
    write_audit(db, alert.patient_id, "caregiver", user["id"], "alert_resolved",
                f"Alert #{alert.id} resolved")
    return SuccessResponse()
