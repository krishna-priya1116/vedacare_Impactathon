"""
VedaCare — Appointments router.
POST /appointments, GET /patients/{id}/appointments
"""

import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Appointment
from routers.auth import get_current_user

router = APIRouter(tags=["Appointments"])


@router.post("/appointments")
def create_appointment(
    patient_id: int,
    purpose: str,
    doctor_name: str = "",
    hospital_name: str = "",
    appointment_datetime: str = "",
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    appt = Appointment(
        patient_id=patient_id,
        purpose=purpose,
        doctor_name=doctor_name,
        hospital_name=hospital_name,
        appointment_datetime=datetime.datetime.fromisoformat(appointment_datetime) if appointment_datetime else None,
        source="manual",
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return {"success": True, "appointment_id": appt.id}


@router.get("/patients/{patient_id}/appointments")
def list_appointments(patient_id: int, db: Session = Depends(get_db)):
    appointments = (
        db.query(Appointment)
        .filter(Appointment.patient_id == patient_id)
        .order_by(Appointment.appointment_datetime)
        .all()
    )
    return {
        "appointments": [
            {
                "id": a.id,
                "purpose": a.purpose,
                "doctor_name": a.doctor_name,
                "hospital_name": a.hospital_name,
                "appointment_datetime": a.appointment_datetime.isoformat() if a.appointment_datetime else None,
                "status": a.status,
                "source": a.source,
            }
            for a in appointments
        ]
    }
