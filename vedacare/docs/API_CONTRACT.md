# API Contract — Frontend ↔ Backend (Source of Truth)

Base URL (dev): `http://localhost:8000`
All timestamps ISO 8601. Language codes: `en`, `hi`, `gu`. All error responses use the standard shape from `ARCHITECTURE.md §9`.

**Do not change a shape here without telling the team and updating this file first.**

---

## Auth & Onboarding

### POST `/auth/signup`
```
REQUEST:  { "name": "string", "contact": "email_or_phone", "password": "string" }
RESPONSE: { "success": true, "caregiver_id": 1, "token": "jwt" }
AUTH: none
ERRORS: INVALID_INPUT (weak password / duplicate contact)
```

### POST `/auth/login`
```
REQUEST:  { "contact": "string", "password": "string" }
RESPONSE: { "success": true, "role": "caregiver|patient", "token": "jwt", "redirect": "/caregiver|/patient" }
AUTH: none
ERRORS: UNAUTHORIZED
```
Single login page, backend determines role automatically per `signup_login.docx §5`.

### POST `/auth/forgot-password`
```
REQUEST:  { "contact": "string" }
RESPONSE: { "success": true, "otp_sent": true }
```

### POST `/auth/reset-password`
```
REQUEST:  { "contact": "string", "otp": "string", "new_password": "string" }
RESPONSE: { "success": true }
ERRORS: INVALID_INPUT (wrong OTP)
```

---

## Patient & Connection

### POST `/patients` (caregiver, auth required)
```
REQUEST:  { "name": "string", "dob_or_age": "string", "gender": "string",
            "phone": "string|null", "preferred_language": "en|hi|gu",
            "accessibility_prefs": { "text_size": "large|xl", "voice_volume": "int" } }
RESPONSE: { "success": true, "patient_id": 1 }
```

### POST `/patients/{id}/generate-code` (caregiver, auth required)
```
RESPONSE: { "success": true, "code": "482913", "qr_data": "string", "expires_at": "iso8601" }
```
7-day validity, one-time use, regenerating invalidates the previous code (`signup_login.docx §7`).

### POST `/patients/join` (patient device, no prior auth)
```
REQUEST:  { "code": "482913" }
RESPONSE: { "success": true, "patient_id": 1, "patient_name": "Meera", "caregiver_name": "Parthiv" }
ERRORS: CODE_EXPIRED, CODE_ALREADY_USED, NOT_FOUND
```

### POST `/patients/{id}/confirm-join`
```
REQUEST:  { "preferred_language": "hi", "phone": "string|null" }
RESPONSE: { "success": true, "device_token": "string" }
```
Returns a long-lived `device_token` — frontend stores it, patient device skips PIN entry on future opens (send `device_token` to `/patients/verify-device` instead).

### GET `/patients/{id}` (caregiver or patient device)
```
RESPONSE: { "id": 1, "name": "Meera", "age": 68, "preferred_language": "hi",
            "photo_url": "string|null", "connection_status": "connected|pending" }
```

---

## Prescription Upload & AI Processing

### POST `/prescriptions/upload` (caregiver, auth required)
```
REQUEST: multipart/form-data — patient_id, file (image/pdf), OR { "voice_description": "audio blob" }
RESPONSE:
{
  "success": true,
  "prescription_id": 5,
  "doctor_name": "Dr. Sharma",
  "hospital_name": "City Hospital",
  "ai_confidence_overall": 94,
  "medications": [
    {
      "temp_id": "m1",
      "drug_name": "Metformin",
      "strength": "500mg",
      "dose_per_intake": 1,
      "form": "tablet",
      "frequency_per_day": 2,
      "timing_slots": ["08:30","20:30"],
      "food_instruction": "after_food",
      "duration_days": 30,
      "is_chronic": false,
      "is_prn": false,
      "special_instructions_en": "Take twice a day, after food, for 30 days.",
      "confidence": "high"
    }
  ],
  "interaction_flags": [
    {
      "medication_ids": ["m2","m3"],
      "severity": "moderate",
      "summary": "May increase bleeding risk when taken together.",
      "recommendation": "Please confirm this combination with a doctor or pharmacist."
    }
  ],
  "appointments": [
    { "purpose": "Follow-up review", "doctor_name": "Dr. Sharma", "appointment_datetime": "2026-08-27T11:00:00" }
  ]
}
ERRORS: AI_PROCESSING_FAILED
```
Full pipeline detail: `AI_PIPELINE.md`. Backend relays this shape as-is from AI service — it does not reformat it.

### PUT `/medications/{temp_id_or_id}/approve` (caregiver, auth required — the review/approval gate)
```
REQUEST: full (possibly edited) medication object
RESPONSE: { "success": true, "medication_id": 12 }
```
**Nothing activates automatically.** This is the required gate per `all_functionalities.docx §6`. Calling this on every medication in a prescription is what triggers scheduler job creation.

### POST `/interaction-flags/{id}/mark-reviewed`
```
RESPONSE: { "success": true }
```

---

## Medications (post-approval)

### GET `/patients/{id}/medications`
```
RESPONSE: { "medications": [ { "id":1,"drug_name":"string","strength":"string","status":"active|upcoming|completed|paused|expired", "stock_remaining": 6, "stock_status": "ok|refill_soon|course_completing" } ] }
```

### PUT `/medications/{id}` (edit) · DELETE `/medications/{id}` (remove) · PUT `/medications/{id}/pause`

### GET `/medications/{id}/audio?lang=hi`
```
RESPONSE: { "audio_url": "string" }
```
Decide Day 1 with AI dev whether this is pre-generated at approval time (cached) or generated on demand — document the choice here once decided.

---

## Today / Timetable (patient device)

### GET `/patients/{id}/today` (uses device_token)
```
RESPONSE:
{
  "current_reminder": { "dose_log_id": 9, "drug_name": "Metformin", "dose_per_intake": 1,
                          "form": "tablet", "food_instruction": "after_food",
                          "image_url": "string|null", "audio_url": "string" },
  "upcoming_today": [ /* same shape */ ],
  "progress": { "taken": 4, "total": 5 }
}
```

### POST `/dose_logs/{id}/confirm`
```
REQUEST:  { "confirmation_method": "button|voice" }
RESPONSE: { "success": true, "confirmed_at": "iso8601" }
```

### POST `/dose_logs/{id}/snooze`
```
RESPONSE: { "success": true, "new_reminder_at": "iso8601" }
```

---

## Caregiver Dashboard

### GET `/patients/{id}/dashboard`
```
RESPONSE:
{
  "adherence_today": { "taken": 4, "total": 5, "percent": 80 },
  "weekly_adherence": [ { "date":"2026-08-14","taken":3,"total":3 } ],
  "alerts": [ { "id":1,"type":"safety|missed_dose|repeated_miss|system","severity":"red|orange|yellow",
                 "message":"string","medicine":"string|null","time":"iso8601" } ],
  "upcoming_appointments": [ /* appointment objects */ ],
  "medications": [ /* see GET /patients/{id}/medications */ ],
  "recent_activity": [ { "type":"string","message":"string","time":"iso8601" } ]
}
```

### GET `/patients/{id}/history?range=today|week|month`
```
RESPONSE: { "logs": [ { "medicine":"string","scheduled_time":"iso8601","status":"taken|missed|delayed","confirmed_at":"iso8601|null" } ] }
```

---

## Alerts

### GET `/caregivers/{id}/alerts?status=active|resolved`
### POST `/alerts/{id}/review` → `{ "success": true }`
### POST `/alerts/{id}/resolve` → `{ "success": true }`

---

## Audit Log (read-only, both roles per scope)

### GET `/patients/{id}/audit-log`
```
RESPONSE: { "entries": [ { "action":"prescription_uploaded|plan_activated|dose_confirmed|dose_missed|alert_generated|alert_reviewed|patient_connected", "actor":"caregiver|patient|system", "time":"iso8601", "detail":"string" } ] }
```

---

## Admin (scoped-down per ARCHITECTURE.md §1 ASSUMPTION)

### GET `/admin/review-queue`
```
RESPONSE: { "items": [ { "prescription_id":1,"patient_name":"string","issue":"low_confidence|ocr_failed|missing_fields","time":"iso8601" } ] }
```
*If time allows only — not core demo path.*

---

## Field conventions
- IDs: integers. Booleans: `true`/`false`. All list responses wrap in a named key (`medications`, `alerts`, etc.), never a bare array — keeps future pagination additive, not breaking.
