"""
VedaCare — Medications router.
PUT /medications/{id}/approve, PUT /medications/{id}, DELETE /medications/{id},
PUT /medications/{id}/pause, POST /interaction-flags/{id}/mark-reviewed,
GET /medications/{id}/audio
"""

import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Medication, InteractionFlag, DoseLog
from schemas import (
    MedicationApproveRequest, MedicationApproveResponse,
    AudioResponse, SuccessResponse,
)
from routers.auth import get_current_user
from audit import write_audit

router = APIRouter(tags=["Medications"])


def _generate_dose_logs(db: Session, med: Medication):
    """Generate dose_log rows for the medication's timing_slots × duration."""
    slots = med.timing_slots or []
    if not slots:
        return

    now = datetime.datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if med.is_chronic:
        # Rolling 7-day window for chronic medications
        days = 7
    else:
        days = med.duration_days or 30

    for day_offset in range(days):
        day = today + datetime.timedelta(days=day_offset)
        for slot in slots:
            try:
                parts = slot.split(":")
                hour, minute = int(parts[0]), int(parts[1])
            except (ValueError, IndexError):
                continue
            scheduled = day.replace(hour=hour, minute=minute)
            if scheduled < now:
                continue  # don't create past logs
            dl = DoseLog(
                medication_id=med.id,
                scheduled_time=scheduled,
                status="pending",
            )
            db.add(dl)
    db.commit()


@router.put("/medications/{med_id}/approve", response_model=MedicationApproveResponse)
def approve_medication(
    med_id: int,
    req: MedicationApproveRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found.")

    # Apply any edits from the caregiver review
    med.drug_name = req.drug_name
    med.strength = req.strength
    med.dose_per_intake = req.dose_per_intake
    med.form = req.form
    med.frequency_per_day = req.frequency_per_day
    med.timing_slots = req.timing_slots
    med.food_instruction = req.food_instruction
    med.duration_days = req.duration_days
    med.is_chronic = req.is_chronic
    med.is_prn = req.is_prn
    med.special_instructions = req.special_instructions

    # Recalculate total quantity
    if med.duration_days and med.frequency_per_day:
        med.total_quantity = med.frequency_per_day * med.duration_days
    elif med.is_chronic:
        med.total_quantity = med.frequency_per_day * 7  # rolling week

    # Activate
    med.status = "active"
    db.commit()

    # Generate dose_logs via scheduler logic
    _generate_dose_logs(db, med)

    write_audit(db, med.patient_id, "caregiver", user["id"], "plan_activated",
                f"Medication {med.drug_name} approved and activated")

    return MedicationApproveResponse(medication_id=med.id)


@router.put("/medications/{med_id}")
def edit_medication(
    med_id: int,
    req: MedicationApproveRequest,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found.")
    med.drug_name = req.drug_name
    med.strength = req.strength
    med.dose_per_intake = req.dose_per_intake
    med.form = req.form
    med.frequency_per_day = req.frequency_per_day
    med.timing_slots = req.timing_slots
    med.food_instruction = req.food_instruction
    med.duration_days = req.duration_days
    med.is_chronic = req.is_chronic
    med.is_prn = req.is_prn
    med.special_instructions = req.special_instructions
    db.commit()
    return {"success": True, "medication_id": med.id}


@router.delete("/medications/{med_id}")
def delete_medication(
    med_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found.")
    # Delete future pending dose logs
    db.query(DoseLog).filter(
        DoseLog.medication_id == med_id,
        DoseLog.status == "pending",
    ).delete()
    db.delete(med)
    db.commit()
    return {"success": True}


@router.put("/medications/{med_id}/pause")
def pause_medication(
    med_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found.")
    med.status = "paused"
    # Pause future pending dose logs
    db.query(DoseLog).filter(
        DoseLog.medication_id == med_id,
        DoseLog.status == "pending",
        DoseLog.scheduled_time > datetime.datetime.utcnow(),
    ).update({"status": "snoozed"})
    db.commit()
    return {"success": True}


# ---------------------------------------------------------------------------
# Interaction flags
# ---------------------------------------------------------------------------
@router.post("/interaction-flags/{flag_id}/mark-reviewed", response_model=SuccessResponse)
def mark_reviewed(flag_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    flag = db.query(InteractionFlag).filter(InteractionFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Interaction flag not found.")
    flag.reviewed = True
    db.commit()
    return SuccessResponse()


# ---------------------------------------------------------------------------
# Audio (stub)
# ---------------------------------------------------------------------------
@router.get("/medications/{med_id}/audio", response_model=AudioResponse)
def get_audio(med_id: int, lang: str = Query("en"), db: Session = Depends(get_db)):
    med = db.query(Medication).filter(Medication.id == med_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found.")
    # Stub — return placeholder URL
    return AudioResponse(audio_url=f"/static/audio/{med_id}_{lang}.mp3")
