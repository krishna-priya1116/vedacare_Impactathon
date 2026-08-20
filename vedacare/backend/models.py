"""
VedaCare — SQLAlchemy ORM models.
All tables defined per BACKEND.md schema specification.
"""

import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, JSON,
    ForeignKey, UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship
from database import Base


# ---------------------------------------------------------------------------
# Caregivers
# ---------------------------------------------------------------------------
class Caregiver(Base):
    __tablename__ = "caregivers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patients = relationship("Patient", back_populates="caregiver")
    alerts = relationship("Alert", back_populates="caregiver")


# ---------------------------------------------------------------------------
# Patients
# ---------------------------------------------------------------------------
class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    caregiver_id = Column(Integer, ForeignKey("caregivers.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    gender = Column(String)
    phone = Column(String, nullable=True)
    preferred_language = Column(String, default="en")
    photo_url = Column(String, nullable=True)
    accessibility_prefs = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    caregiver = relationship("Caregiver", back_populates="patients")
    connection_codes = relationship("ConnectionCode", back_populates="patient")
    device_tokens = relationship("DeviceToken", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")
    medications = relationship("Medication", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")
    care_instructions = relationship("CareInstruction", back_populates="patient")
    alerts = relationship("Alert", back_populates="patient")
    audit_logs = relationship("AuditLog", back_populates="patient")


# ---------------------------------------------------------------------------
# Connection Codes (PIN / QR for patient join)
# ---------------------------------------------------------------------------
class ConnectionCode(Base):
    __tablename__ = "connection_codes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    code = Column(String, unique=True, nullable=False, index=True)
    qr_data = Column(String, nullable=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="connection_codes")


# ---------------------------------------------------------------------------
# Device Tokens (long-lived patient device auth)
# ---------------------------------------------------------------------------
class DeviceToken(Base):
    __tablename__ = "device_tokens"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="device_tokens")


# ---------------------------------------------------------------------------
# Prescriptions
# ---------------------------------------------------------------------------
class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    uploaded_by = Column(Integer, ForeignKey("caregivers.id"), nullable=False)
    file_url = Column(String, nullable=True)
    ocr_raw_text = Column(Text, nullable=True)
    doctor_name = Column(String, nullable=True)
    hospital_name = Column(String, nullable=True)
    ai_confidence_overall = Column(Float, nullable=True)
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="prescriptions")
    uploader = relationship("Caregiver")
    medications = relationship("Medication", back_populates="prescription")
    appointments = relationship("Appointment", back_populates="prescription")
    care_instructions = relationship("CareInstruction", back_populates="prescription")


# ---------------------------------------------------------------------------
# Medications
# ---------------------------------------------------------------------------
class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    drug_name = Column(String, nullable=False)
    strength = Column(String, nullable=True)
    dose_per_intake = Column(Integer, default=1)
    form = Column(String, nullable=True)
    frequency_per_day = Column(Integer, default=1)
    timing_slots = Column(JSON, nullable=True)  # e.g. ["08:30","20:30"]
    food_instruction = Column(String, nullable=True)
    duration_days = Column(Integer, nullable=True)
    is_chronic = Column(Boolean, default=False)
    is_prn = Column(Boolean, default=False)
    special_instructions = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    total_quantity = Column(Integer, nullable=True)
    doses_taken_count = Column(Integer, default=0)
    refill_alert_sent = Column(Boolean, default=False)
    confidence = Column(String, default="high")  # high | needs_review
    status = Column(String, default="pending_review")  # pending_review|active|completed|paused|expired
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    prescription = relationship("Prescription", back_populates="medications")
    patient = relationship("Patient", back_populates="medications")
    dose_logs = relationship("DoseLog", back_populates="medication")


# ---------------------------------------------------------------------------
# Interaction Flags (medication pair safety check)
# ---------------------------------------------------------------------------
class InteractionFlag(Base):
    __tablename__ = "interaction_flags"

    id = Column(Integer, primary_key=True, index=True)
    medication_id_1 = Column(Integer, ForeignKey("medications.id"), nullable=False)
    medication_id_2 = Column(Integer, ForeignKey("medications.id"), nullable=False)
    severity = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    reviewed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    medication_1 = relationship("Medication", foreign_keys=[medication_id_1])
    medication_2 = relationship("Medication", foreign_keys=[medication_id_2])


# ---------------------------------------------------------------------------
# Dose Logs (one row per scheduled dose instance)
# ---------------------------------------------------------------------------
class DoseLog(Base):
    __tablename__ = "dose_logs"

    id = Column(Integer, primary_key=True, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id"), nullable=False, index=True)
    scheduled_time = Column(DateTime, nullable=False, index=True)
    status = Column(String, default="pending")  # pending|taken|missed|snoozed
    confirmed_at = Column(DateTime, nullable=True)
    confirmation_method = Column(String, nullable=True)  # button|voice
    miss_reason = Column(String, nullable=True)

    medication = relationship("Medication", back_populates="dose_logs")


# ---------------------------------------------------------------------------
# Appointments
# ---------------------------------------------------------------------------
class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    purpose = Column(String, nullable=True)
    doctor_name = Column(String, nullable=True)
    hospital_name = Column(String, nullable=True)
    appointment_datetime = Column(DateTime, nullable=True)
    status = Column(String, default="scheduled")
    reminder_sent = Column(Boolean, default=False)
    source = Column(String, default="manual")  # extracted|manual

    prescription = relationship("Prescription", back_populates="appointments")
    patient = relationship("Patient", back_populates="appointments")


# ---------------------------------------------------------------------------
# Care Instructions
# ---------------------------------------------------------------------------
class CareInstruction(Base):
    __tablename__ = "care_instructions"

    id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    instruction_text = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    valid_until = Column(DateTime, nullable=True)

    prescription = relationship("Prescription", back_populates="care_instructions")
    patient = relationship("Patient", back_populates="care_instructions")


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    caregiver_id = Column(Integer, ForeignKey("caregivers.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # safety|missed_dose|repeated_miss|system
    severity = Column(String, nullable=True)  # red|orange|yellow
    related_id = Column(Integer, nullable=True)
    message = Column(Text, nullable=False)
    status = Column(String, default="active")  # active|reviewed|resolved
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
    channel = Column(String, nullable=True)

    caregiver = relationship("Caregiver", back_populates="alerts")
    patient = relationship("Patient", back_populates="alerts")


# ---------------------------------------------------------------------------
# Audit Logs (append-only)
# ---------------------------------------------------------------------------
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    actor = Column(String, nullable=False)  # caregiver|patient|system
    actor_id = Column(Integer, nullable=True)
    action = Column(String, nullable=False)
    detail = Column(Text, nullable=True)
    time = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="audit_logs")
