"""
VedaCare — Pydantic schemas for request / response validation.
Shapes match API_CONTRACT.md exactly.
"""

from __future__ import annotations
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel, Field


# ===========================================================================
# Generic wrapper
# ===========================================================================
class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail


# ===========================================================================
# Auth
# ===========================================================================
class SignupRequest(BaseModel):
    name: str
    contact: str
    password: str


class SignupResponse(BaseModel):
    success: bool = True
    caregiver_id: int
    token: str


class LoginRequest(BaseModel):
    contact: str
    password: str


class LoginResponse(BaseModel):
    success: bool = True
    role: str  # caregiver | patient
    token: str
    redirect: str  # /caregiver | /patient


class ForgotPasswordRequest(BaseModel):
    contact: str


class ForgotPasswordResponse(BaseModel):
    success: bool = True
    otp_sent: bool = True


class ResetPasswordRequest(BaseModel):
    contact: str
    otp: str
    new_password: str


class SuccessResponse(BaseModel):
    success: bool = True


# ===========================================================================
# Patient & Connection
# ===========================================================================
class AccessibilityPrefs(BaseModel):
    text_size: str = "large"
    voice_volume: int = 80


class PatientCreateRequest(BaseModel):
    name: str
    dob_or_age: str
    gender: str
    phone: Optional[str] = None
    preferred_language: str = "en"
    accessibility_prefs: Optional[AccessibilityPrefs] = None


class PatientCreateResponse(BaseModel):
    success: bool = True
    patient_id: int


class GenerateCodeResponse(BaseModel):
    success: bool = True
    code: str
    qr_data: str
    expires_at: str  # ISO 8601


class JoinRequest(BaseModel):
    code: str


class JoinResponse(BaseModel):
    success: bool = True
    patient_id: int
    patient_name: str
    caregiver_name: str


class ConfirmJoinRequest(BaseModel):
    preferred_language: str = "en"
    phone: Optional[str] = None


class ConfirmJoinResponse(BaseModel):
    success: bool = True
    device_token: str


class PatientDetailResponse(BaseModel):
    id: int
    name: str
    age: Optional[int] = None
    preferred_language: str
    photo_url: Optional[str] = None
    connection_status: str = "connected"


# ===========================================================================
# Prescription Upload
# ===========================================================================
class MedicationExtracted(BaseModel):
    temp_id: str
    drug_name: str
    strength: Optional[str] = None
    dose_per_intake: int = 1
    form: Optional[str] = None
    frequency_per_day: int = 1
    timing_slots: list[str] = []
    food_instruction: Optional[str] = None
    duration_days: Optional[int] = None
    is_chronic: bool = False
    is_prn: bool = False
    special_instructions_en: Optional[str] = None
    confidence: str = "high"


class InteractionFlagExtracted(BaseModel):
    medication_ids: list[str]
    severity: str
    summary: str
    recommendation: str


class AppointmentExtracted(BaseModel):
    purpose: str
    doctor_name: Optional[str] = None
    appointment_datetime: Optional[str] = None


class PrescriptionUploadResponse(BaseModel):
    success: bool = True
    prescription_id: int
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    ai_confidence_overall: Optional[float] = None
    medications: list[MedicationExtracted] = []
    interaction_flags: list[InteractionFlagExtracted] = []
    appointments: list[AppointmentExtracted] = []


# ===========================================================================
# Medication CRUD
# ===========================================================================
class MedicationApproveRequest(BaseModel):
    drug_name: str
    strength: Optional[str] = None
    dose_per_intake: int = 1
    form: Optional[str] = None
    frequency_per_day: int = 1
    timing_slots: list[str] = []
    food_instruction: Optional[str] = None
    duration_days: Optional[int] = None
    is_chronic: bool = False
    is_prn: bool = False
    special_instructions: Optional[str] = None


class MedicationApproveResponse(BaseModel):
    success: bool = True
    medication_id: int


class MedicationListItem(BaseModel):
    id: int
    drug_name: str
    strength: Optional[str] = None
    status: str
    stock_remaining: Optional[int] = None
    stock_status: str = "ok"  # ok | refill_soon | course_completing


class MedicationListResponse(BaseModel):
    medications: list[MedicationListItem] = []


class AudioResponse(BaseModel):
    audio_url: str


# ===========================================================================
# Today / Timetable
# ===========================================================================
class ReminderItem(BaseModel):
    dose_log_id: int
    drug_name: str
    dose_per_intake: int = 1
    form: Optional[str] = None
    food_instruction: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    scheduled_time: Optional[str] = None


class TodayProgress(BaseModel):
    taken: int = 0
    total: int = 0


class TodayResponse(BaseModel):
    current_reminder: Optional[ReminderItem] = None
    upcoming_today: list[ReminderItem] = []
    progress: TodayProgress = TodayProgress()


class DoseConfirmRequest(BaseModel):
    confirmation_method: str = "button"  # button | voice


class DoseConfirmResponse(BaseModel):
    success: bool = True
    confirmed_at: str


class DoseSnoozeResponse(BaseModel):
    success: bool = True
    new_reminder_at: str


# ===========================================================================
# Dashboard
# ===========================================================================
class AdherenceToday(BaseModel):
    taken: int = 0
    total: int = 0
    percent: float = 0.0


class WeeklyAdherenceDay(BaseModel):
    date: str
    taken: int
    total: int


class AlertItem(BaseModel):
    id: int
    type: str
    severity: Optional[str] = None
    message: str
    medicine: Optional[str] = None
    time: Optional[str] = None


class RecentActivity(BaseModel):
    type: str
    message: str
    time: str


class DashboardResponse(BaseModel):
    adherence_today: AdherenceToday = AdherenceToday()
    weekly_adherence: list[WeeklyAdherenceDay] = []
    alerts: list[AlertItem] = []
    upcoming_appointments: list[dict] = []
    medications: list[MedicationListItem] = []
    recent_activity: list[RecentActivity] = []


# ===========================================================================
# History
# ===========================================================================
class HistoryEntry(BaseModel):
    medicine: str
    scheduled_time: str
    status: str
    confirmed_at: Optional[str] = None


class HistoryResponse(BaseModel):
    logs: list[HistoryEntry] = []


# ===========================================================================
# Alerts
# ===========================================================================
class AlertListResponse(BaseModel):
    alerts: list[AlertItem] = []


# ===========================================================================
# Audit Log
# ===========================================================================
class AuditEntry(BaseModel):
    action: str
    actor: str
    time: str
    detail: Optional[str] = None


class AuditLogResponse(BaseModel):
    entries: list[AuditEntry] = []


# ===========================================================================
# Admin
# ===========================================================================
class ReviewQueueItem(BaseModel):
    prescription_id: int
    patient_name: str
    issue: str
    time: str


class ReviewQueueResponse(BaseModel):
    items: list[ReviewQueueItem] = []
