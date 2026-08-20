"""
VedaCare — Admin router.
GET /admin/review-queue (low-confidence / OCR-failed prescriptions)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Prescription, Patient
from schemas import ReviewQueueResponse, ReviewQueueItem
from routers.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/review-queue", response_model=ReviewQueueResponse)
def review_queue(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Return prescriptions needing manual review (low confidence or no confidence)."""
    prescriptions = (
        db.query(Prescription)
        .filter(
            (Prescription.ai_confidence_overall < 80) | (Prescription.ai_confidence_overall == None)
        )
        .order_by(Prescription.upload_date.desc())
        .limit(50)
        .all()
    )
    items = []
    for rx in prescriptions:
        patient = db.query(Patient).filter(Patient.id == rx.patient_id).first()
        if rx.ai_confidence_overall is None:
            issue = "ocr_failed"
        elif rx.ai_confidence_overall < 60:
            issue = "low_confidence"
        else:
            issue = "missing_fields"
        items.append(ReviewQueueItem(
            prescription_id=rx.id,
            patient_name=patient.name if patient else "Unknown",
            issue=issue,
            time=rx.upload_date.isoformat() if rx.upload_date else "",
        ))
    return ReviewQueueResponse(items=items)
