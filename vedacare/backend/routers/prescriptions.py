"""
VedaCare — Prescriptions router.
POST /prescriptions/upload
"""

import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from database import get_db
from models import Prescription, Medication, InteractionFlag, Appointment
from schemas import PrescriptionUploadResponse, MedicationExtracted, InteractionFlagExtracted, AppointmentExtracted
from routers.auth import get_current_user
from ai_pipeline.extraction import extract_prescription
from audit import write_audit

router = APIRouter(tags=["Prescriptions"])


@router.post("/prescriptions/upload", response_model=PrescriptionUploadResponse)
async def upload_prescription(
    patient_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Read file
    file_bytes = await file.read()

    # Call AI pipeline (stub)
    try:
        ai_result = extract_prescription(file_bytes, file.filename or "")
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={"code": "AI_PROCESSING_FAILED", "message": str(e)},
        )

    # Store prescription
    rx = Prescription(
        patient_id=patient_id,
        uploaded_by=user["id"],
        file_url=f"uploads/{file.filename}",
        doctor_name=ai_result.get("doctor_name"),
        hospital_name=ai_result.get("hospital_name"),
        ai_confidence_overall=ai_result.get("ai_confidence_overall"),
    )
    db.add(rx)
    db.commit()
    db.refresh(rx)

    # Store medications (all start as pending_review — never auto-activate)
    temp_id_to_db_id: dict[str, int] = {}
    med_responses = []
    for m in ai_result.get("medications", []):
        med = Medication(
            prescription_id=rx.id,
            patient_id=patient_id,
            drug_name=m["drug_name"],
            strength=m.get("strength"),
            dose_per_intake=m.get("dose_per_intake", 1),
            form=m.get("form"),
            frequency_per_day=m.get("frequency_per_day", 1),
            timing_slots=m.get("timing_slots"),
            food_instruction=m.get("food_instruction"),
            duration_days=m.get("duration_days"),
            is_chronic=m.get("is_chronic", False),
            is_prn=m.get("is_prn", False),
            special_instructions=m.get("special_instructions_en"),
            confidence=m.get("confidence", "high"),
            status="pending_review",
            total_quantity=(m.get("frequency_per_day", 1) * m.get("duration_days", 1)) if m.get("duration_days") else None,
        )
        db.add(med)
        db.commit()
        db.refresh(med)
        temp_id_to_db_id[m["temp_id"]] = med.id
        med_responses.append(MedicationExtracted(**m))

    # Store interaction flags
    flag_responses = []
    for f in ai_result.get("interaction_flags", []):
        ids = f.get("medication_ids", [])
        med_id_1 = temp_id_to_db_id.get(ids[0]) if len(ids) > 0 else None
        med_id_2 = temp_id_to_db_id.get(ids[1]) if len(ids) > 1 else None
        if med_id_1 and med_id_2:
            flag = InteractionFlag(
                medication_id_1=med_id_1,
                medication_id_2=med_id_2,
                severity=f["severity"],
                summary=f["summary"],
                recommendation=f["recommendation"],
            )
            db.add(flag)
            db.commit()
            db.refresh(flag)
        flag_responses.append(InteractionFlagExtracted(**f))

    # Store appointments
    appt_responses = []
    for a in ai_result.get("appointments", []):
        appt = Appointment(
            prescription_id=rx.id,
            patient_id=patient_id,
            purpose=a.get("purpose"),
            doctor_name=a.get("doctor_name"),
            appointment_datetime=datetime.datetime.fromisoformat(a["appointment_datetime"]) if a.get("appointment_datetime") else None,
            source="extracted",
        )
        db.add(appt)
        db.commit()
        appt_responses.append(AppointmentExtracted(**a))

    write_audit(db, patient_id, "caregiver", user["id"], "prescription_uploaded",
                f"Prescription #{rx.id} uploaded with {len(med_responses)} medications")

    return PrescriptionUploadResponse(
        prescription_id=rx.id,
        doctor_name=rx.doctor_name,
        hospital_name=rx.hospital_name,
        ai_confidence_overall=rx.ai_confidence_overall,
        medications=med_responses,
        interaction_flags=flag_responses,
        appointments=appt_responses,
    )
