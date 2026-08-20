"""
VedaCare — Patients router.
Patient CRUD, PIN/QR connection flow, dashboard, history, today, dose endpoints, audit-log.
"""

import datetime
import secrets
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import (
    Patient, ConnectionCode, DeviceToken, Medication, DoseLog,
    Alert, Appointment, AuditLog,
)
from schemas import (
    PatientCreateRequest, PatientCreateResponse,
    GenerateCodeResponse, JoinRequest, JoinResponse,
    ConfirmJoinRequest, ConfirmJoinResponse,
    PatientDetailResponse,
    MedicationListItem, MedicationListResponse,
    TodayResponse, ReminderItem, TodayProgress,
    DoseConfirmRequest, DoseConfirmResponse, DoseSnoozeResponse,
    DashboardResponse, AdherenceToday, WeeklyAdherenceDay,
    AlertItem, RecentActivity,
    HistoryResponse, HistoryEntry,
    AuditLogResponse, AuditEntry,
    SuccessResponse,
)
from routers.auth import get_current_user
from audit import write_audit

router = APIRouter(tags=["Patients"])


# ---------------------------------------------------------------------------
# Patient CRUD
# ---------------------------------------------------------------------------
@router.post("/patients", response_model=PatientCreateResponse)
def create_patient(req: PatientCreateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Parse age from dob_or_age
    try:
        age = int(req.dob_or_age)
    except ValueError:
        age = None

    patient = Patient(
        caregiver_id=user["id"],
        name=req.name,
        age=age,
        gender=req.gender,
        phone=req.phone,
        preferred_language=req.preferred_language,
        accessibility_prefs=req.accessibility_prefs.model_dump() if req.accessibility_prefs else None,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    write_audit(db, patient.id, "caregiver", user["id"], "patient_created", f"Patient {patient.name} created")
    return PatientCreateResponse(patient_id=patient.id)


@router.get("/patients/{patient_id}", response_model=PatientDetailResponse)
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    # Check connection status
    has_device = db.query(DeviceToken).filter(DeviceToken.patient_id == patient_id).first()
    return PatientDetailResponse(
        id=patient.id,
        name=patient.name,
        age=patient.age,
        preferred_language=patient.preferred_language,
        photo_url=patient.photo_url,
        connection_status="connected" if has_device else "pending",
    )


# ---------------------------------------------------------------------------
# PIN / QR connection flow
# ---------------------------------------------------------------------------
@router.post("/patients/{patient_id}/generate-code", response_model=GenerateCodeResponse)
def generate_code(patient_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Invalidate all previous codes for this patient
    db.query(ConnectionCode).filter(
        ConnectionCode.patient_id == patient_id,
        ConnectionCode.used == False,
    ).update({"used": True})

    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=7)
    qr_data = json.dumps({"code": code, "patient_id": patient_id})

    conn_code = ConnectionCode(
        patient_id=patient_id,
        code=code,
        qr_data=qr_data,
        expires_at=expires_at,
    )
    db.add(conn_code)
    db.commit()
    write_audit(db, patient_id, "caregiver", user["id"], "code_generated", f"PIN code generated for patient {patient_id}")
    return GenerateCodeResponse(
        code=code,
        qr_data=qr_data,
        expires_at=expires_at.isoformat(),
    )


@router.post("/patients/join", response_model=JoinResponse)
def join_patient(req: JoinRequest, db: Session = Depends(get_db)):
    conn = db.query(ConnectionCode).filter(ConnectionCode.code == req.code).first()
    if not conn:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Code not found."})
    if conn.used:
        raise HTTPException(status_code=400, detail={"code": "CODE_ALREADY_USED", "message": "This code has already been used."})
    if conn.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail={"code": "CODE_EXPIRED", "message": "This code has expired."})

    patient = db.query(Patient).filter(Patient.id == conn.patient_id).first()
    from models import Caregiver
    caregiver = db.query(Caregiver).filter(Caregiver.id == patient.caregiver_id).first()
    return JoinResponse(
        patient_id=patient.id,
        patient_name=patient.name,
        caregiver_name=caregiver.name if caregiver else "",
    )


@router.post("/patients/{patient_id}/confirm-join", response_model=ConfirmJoinResponse)
def confirm_join(patient_id: int, req: ConfirmJoinRequest, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Mark all unused codes for this patient as used
    db.query(ConnectionCode).filter(
        ConnectionCode.patient_id == patient_id,
        ConnectionCode.used == False,
    ).update({"used": True})

    # Update patient preferences
    patient.preferred_language = req.preferred_language
    if req.phone:
        patient.phone = req.phone

    # Issue device token
    token = secrets.token_urlsafe(48)
    device = DeviceToken(patient_id=patient_id, token=token)
    db.add(device)
    db.commit()
    write_audit(db, patient_id, "patient", patient_id, "patient_connected", "Patient device connected")
    return ConfirmJoinResponse(device_token=token)


# ---------------------------------------------------------------------------
# GET /patients  — list all patients for caregiver
# ---------------------------------------------------------------------------
@router.get("/patients")
def list_patients(db: Session = Depends(get_db), user=Depends(get_current_user)):
    patients = db.query(Patient).filter(Patient.caregiver_id == user["id"]).all()
    result = []
    for p in patients:
        has_device = db.query(DeviceToken).filter(DeviceToken.patient_id == p.id).first()
        result.append({
            "id": p.id,
            "name": p.name,
            "age": p.age,
            "preferred_language": p.preferred_language,
            "connection_status": "connected" if has_device else "pending",
        })
    return {"success": True, "patients": result}


# ---------------------------------------------------------------------------
# Medications list
# ---------------------------------------------------------------------------
@router.get("/patients/{patient_id}/medications", response_model=MedicationListResponse)
def list_medications(patient_id: int, db: Session = Depends(get_db)):
    meds = db.query(Medication).filter(Medication.patient_id == patient_id).all()
    items = []
    for m in meds:
        remaining = (m.total_quantity or 0) - (m.doses_taken_count or 0)
        if m.is_chronic and remaining <= (m.frequency_per_day or 1) * 3:
            stock_status = "refill_soon"
        elif not m.is_chronic and m.duration_days and m.doses_taken_count and m.doses_taken_count >= ((m.frequency_per_day or 1) * (m.duration_days or 1)) - (m.frequency_per_day or 1) * 3:
            stock_status = "course_completing"
        else:
            stock_status = "ok"
        items.append(MedicationListItem(
            id=m.id,
            drug_name=m.drug_name,
            strength=m.strength,
            status=m.status,
            stock_remaining=max(remaining, 0),
            stock_status=stock_status,
        ))
    return MedicationListResponse(medications=items)


# ---------------------------------------------------------------------------
# Today / Timetable
# ---------------------------------------------------------------------------
@router.get("/patients/{patient_id}/today", response_model=TodayResponse)
def get_today(patient_id: int, db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)

    logs = (
        db.query(DoseLog)
        .join(Medication)
        .filter(
            Medication.patient_id == patient_id,
            DoseLog.scheduled_time >= today_start,
            DoseLog.scheduled_time < today_end,
        )
        .order_by(DoseLog.scheduled_time)
        .all()
    )

    taken = sum(1 for l in logs if l.status == "taken")
    total = len(logs)

    def to_reminder(dl: DoseLog) -> ReminderItem:
        med = dl.medication
        return ReminderItem(
            dose_log_id=dl.id,
            drug_name=med.drug_name,
            dose_per_intake=med.dose_per_intake or 1,
            form=med.form,
            food_instruction=med.food_instruction,
            image_url=med.image_url,
            audio_url=None,
            scheduled_time=dl.scheduled_time.isoformat() if dl.scheduled_time else None,
        )

    pending = [l for l in logs if l.status in ("pending", "snoozed")]
    current = None
    upcoming = []
    for l in pending:
        if l.scheduled_time <= now and current is None:
            current = to_reminder(l)
        elif l.scheduled_time > now:
            upcoming.append(to_reminder(l))

    # If no current due now, show the next upcoming as current
    if current is None and upcoming:
        current = upcoming.pop(0)

    return TodayResponse(
        current_reminder=current,
        upcoming_today=upcoming,
        progress=TodayProgress(taken=taken, total=total),
    )


# ---------------------------------------------------------------------------
# Dose confirm / snooze
# ---------------------------------------------------------------------------
@router.post("/dose_logs/{log_id}/confirm", response_model=DoseConfirmResponse)
def confirm_dose(log_id: int, req: DoseConfirmRequest, db: Session = Depends(get_db)):
    dl = db.query(DoseLog).filter(DoseLog.id == log_id).first()
    if not dl:
        raise HTTPException(status_code=404, detail="Dose log not found.")
    now = datetime.datetime.utcnow()
    dl.status = "taken"
    dl.confirmed_at = now
    dl.confirmation_method = req.confirmation_method

    # Decrement stock: only on "taken"
    med = dl.medication
    med.doses_taken_count = (med.doses_taken_count or 0) + 1
    db.commit()
    write_audit(db, med.patient_id, "patient", med.patient_id, "dose_confirmed",
                f"Dose {med.drug_name} confirmed at {now.isoformat()}")
    return DoseConfirmResponse(confirmed_at=now.isoformat())


@router.post("/dose_logs/{log_id}/snooze", response_model=DoseSnoozeResponse)
def snooze_dose(log_id: int, db: Session = Depends(get_db)):
    dl = db.query(DoseLog).filter(DoseLog.id == log_id).first()
    if not dl:
        raise HTTPException(status_code=404, detail="Dose log not found.")
    new_time = dl.scheduled_time + datetime.timedelta(minutes=30)
    dl.status = "snoozed"
    dl.scheduled_time = new_time
    db.commit()
    return DoseSnoozeResponse(new_reminder_at=new_time.isoformat())


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@router.get("/patients/{patient_id}/dashboard", response_model=DashboardResponse)
def get_dashboard(patient_id: int, db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)

    # Adherence today
    today_logs = (
        db.query(DoseLog)
        .join(Medication)
        .filter(Medication.patient_id == patient_id, DoseLog.scheduled_time >= today_start, DoseLog.scheduled_time < today_end)
        .all()
    )
    taken_today = sum(1 for l in today_logs if l.status == "taken")
    total_today = len(today_logs)
    pct = round((taken_today / total_today * 100) if total_today else 0, 1)

    # Weekly adherence (last 7 days)
    weekly = []
    for i in range(6, -1, -1):
        day_start = (today_start - datetime.timedelta(days=i))
        day_end = day_start + datetime.timedelta(days=1)
        day_logs = (
            db.query(DoseLog)
            .join(Medication)
            .filter(Medication.patient_id == patient_id, DoseLog.scheduled_time >= day_start, DoseLog.scheduled_time < day_end)
            .all()
        )
        weekly.append(WeeklyAdherenceDay(
            date=day_start.strftime("%Y-%m-%d"),
            taken=sum(1 for l in day_logs if l.status == "taken"),
            total=len(day_logs),
        ))

    # Alerts
    alerts_db = db.query(Alert).filter(Alert.patient_id == patient_id, Alert.status == "active").order_by(Alert.sent_at.desc()).limit(10).all()
    alert_items = [AlertItem(id=a.id, type=a.type, severity=a.severity, message=a.message, time=a.sent_at.isoformat() if a.sent_at else None) for a in alerts_db]

    # Upcoming appointments
    appointments = db.query(Appointment).filter(
        Appointment.patient_id == patient_id,
        Appointment.appointment_datetime >= now,
    ).order_by(Appointment.appointment_datetime).limit(5).all()
    upcoming_appts = [{"purpose": a.purpose, "doctor_name": a.doctor_name, "appointment_datetime": a.appointment_datetime.isoformat() if a.appointment_datetime else None} for a in appointments]

    # Medications
    meds = db.query(Medication).filter(Medication.patient_id == patient_id, Medication.status == "active").all()
    med_items = [MedicationListItem(id=m.id, drug_name=m.drug_name, strength=m.strength, status=m.status,
                                     stock_remaining=max((m.total_quantity or 0) - (m.doses_taken_count or 0), 0),
                                     stock_status="ok") for m in meds]

    # Recent activity from audit logs
    audits = db.query(AuditLog).filter(AuditLog.patient_id == patient_id).order_by(AuditLog.time.desc()).limit(10).all()
    recent = [RecentActivity(type=a.action, message=a.detail or a.action, time=a.time.isoformat() if a.time else "") for a in audits]

    return DashboardResponse(
        adherence_today=AdherenceToday(taken=taken_today, total=total_today, percent=pct),
        weekly_adherence=weekly,
        alerts=alert_items,
        upcoming_appointments=upcoming_appts,
        medications=med_items,
        recent_activity=recent,
    )


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------
@router.get("/patients/{patient_id}/history", response_model=HistoryResponse)
def get_history(patient_id: int, range: str = Query("today"), db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if range == "week":
        start = today_start - datetime.timedelta(days=7)
    elif range == "month":
        start = today_start - datetime.timedelta(days=30)
    else:
        start = today_start

    logs = (
        db.query(DoseLog)
        .join(Medication)
        .filter(Medication.patient_id == patient_id, DoseLog.scheduled_time >= start)
        .order_by(DoseLog.scheduled_time.desc())
        .all()
    )
    entries = [
        HistoryEntry(
            medicine=dl.medication.drug_name,
            scheduled_time=dl.scheduled_time.isoformat(),
            status=dl.status,
            confirmed_at=dl.confirmed_at.isoformat() if dl.confirmed_at else None,
        )
        for dl in logs
    ]
    return HistoryResponse(logs=entries)


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------
@router.get("/patients/{patient_id}/audit-log", response_model=AuditLogResponse)
def get_audit_log(patient_id: int, db: Session = Depends(get_db)):
    entries = db.query(AuditLog).filter(AuditLog.patient_id == patient_id).order_by(AuditLog.time.desc()).all()
    return AuditLogResponse(
        entries=[
            AuditEntry(action=e.action, actor=e.actor, time=e.time.isoformat() if e.time else "", detail=e.detail)
            for e in entries
        ]
    )
