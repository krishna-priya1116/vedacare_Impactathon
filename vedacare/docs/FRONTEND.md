# Frontend Spec — VedaCare

You own `frontend/`. Build against `API_CONTRACT.md` using mocked JSON until backend endpoints are live. Apply the theme tokens from `ARCHITECTURE.md §3` (UI theme table) via Tailwind config from Day 1 — don't retrofit styling later.

## Design principles (from `ui_theme.docx` and `interface.docx`)

- Overall feel: **calm, trustworthy, modern, human** — not clinical/corporate/hospital-blue.
- Minimal, spacious, rounded cards, soft shadows, thin borders, large typography, few gradients, simple line icons, large touch targets.
- **Patient UI**: very simple — large text, large buttons, voice, few options, one task at a time, no navigation clutter.
- **Caregiver UI**: informative — schedule, adherence, alerts, patient status, more data-dense, standard nav.
- Reserve red strictly for real safety alerts — never decorative.

## Two signature reusable components (build these first, reuse everywhere)

**MedicationCard** — 💊 name, strength, food timing, 🔊 instruction snippet, ✅ Mark as Taken.
**SafetyAlertCard** — ⚠ headline (e.g. "POTENTIAL INTERACTION"), the drug pair, plain-language risk summary, "Review with healthcare professional" line, [View Details] [Mark Reviewed] actions.

## Caregiver navigation (`interface.docx §1`)
Dashboard | Patients | Medicines | Timetable | Prescriptions | Alerts | Adherence | History | Caregivers | Settings

**Key screens:**
- **Dashboard**: greeting, per-patient adherence %, today's progress (taken/missed/upcoming counts), active safety alerts, recent activity, quick actions (Upload Prescription, Add Medicine, Add Patient, View Alerts, View Today's Timetable)
- **Patients**: list (name, age, photo, adherence, active alerts, connection status) → click into Patient Detail (Overview | Medicines | Timetable | Prescriptions | Alerts | Adherence | Logs tabs)
- **Medicines**: full CRUD list with status (Active/Upcoming/Completed/Paused/Expired), medicine detail view with 🔊 patient instruction preview
- **Timetable**: Today/Tomorrow/Week/Calendar views, filterable by time-of-day and status
- **Prescriptions**: upload + processing state (`Uploading → Processing → AI Extracted → Safety Checked → Reviewed → Active`), **ReviewExtractedPlan** screen — the critical one: editable medication list, `confidence: "needs_review"` items visually flagged, interaction flags shown as SafetyAlertCards inline, "Activate Care Plan" button calls approve for each item
- **Alerts**: categorized 🔴 Safety / 🟠 Medication / 🟡 System, each with patient/medicine/type/severity/time/explanation/recommended action, actions: View details, Mark reviewed, Resolve, Dismiss
- **Adherence**: overall %, today/weekly/monthly, taken/missed/delayed counts, charts (Recharts) — daily, weekly trend, per-medicine, missed-dose frequency
- **History/Logs**: chronological activity feed pulled from `/patients/{id}/audit-log`
- **Caregivers**: manage secondary caregivers *(roadmap — build only if Days 1–6 finish early, per `ARCHITECTURE.md` multi-caregiver note)*
- **Settings**: account info, patient settings (language, accessibility), notification preferences, security (connected devices, sessions)

## Patient navigation (`interface.docx §2`)
Home | Medicines | Timetable | Status | History | Profile

**Key screens:**
- **Home**: greeting, current/next medicine as a large MedicationCard, 🔊 Listen, [✓ I've Taken It], [Remind Me Later], today's progress bar
- **Medicines**: simple list, name/dosage/timing/food instruction/voice instruction per item — no interaction data or admin info shown here
- **Timetable**: Today/Tomorrow/Week, current/next item visually emphasized, simple ✅/⏳/❌ status icons
- **Status**: today's progress bar ("4/5 completed, 80%"), broken into Morning/Afternoon/Evening/Bedtime with status icons
- **History**: simple date/medicine/scheduled/taken-or-missed/confirmation-time list — no analytics
- **Profile**: name, age, photo, preferred language, caregiver info ("Your caregiver: Priya Shah — Connected ✅"), accessibility settings (text size, voice volume, voice language, reminder sound, high-contrast toggle)

## Auth & connection flow (`signup_login.docx`)

- **Landing/Signup**: "Sign up as Caregiver" vs. "Join as Patient" — two distinct paths, not a role dropdown
- **Caregiver signup**: Create Account (name/contact/password) → Verify (OTP, can be mocked) → Add Patient → Generate 6-digit PIN + QR (show expiry countdown, Copy/Share/Regenerate actions) → Caregiver Dashboard
- **Patient join**: "Join as Patient" → Enter 6-digit code (or scan QR) → validation → Confirmation screen ("You're joining VedaCare as Meera Shah") → [Join & Continue] → minimal profile setup (name confirm, language, phone optional) → Patient Home
- **Returning users**: single Login page (contact + password), backend auto-detects role and redirects — no role picker on login
- **Error states to build**: expired code ("This invitation code has expired. Ask your caregiver to generate a new code."), already-used code, wrong password, forgot-password flow (OTP → new password)
- Store `device_token` after first successful patient join; on subsequent app opens, check for it and skip straight to Home if valid (call `/patients/verify-device` — confirm this endpoint name with backend dev, it's an addition not in the original contract)

## Build order

**Day 1**: Vite + Tailwind (theme tokens applied), routing skeleton (`/caregiver/*`, `/patient/*`), landing/signup/login screens, mock data file matching `API_CONTRACT.md`
**Day 2**: PIN/QR generation + patient join flow, MedicationCard + SafetyAlertCard components, Patient Home wired to mocks
**Day 3**: Patient Timetable/Status/History/Profile, Caregiver Dashboard skeleton
**Day 4**: Caregiver Medicines/Timetable/Adherence (Recharts) wired to mocks
**Day 5**: Prescriptions upload + **ReviewExtractedPlan** screen (most important screen — this is where confidence flags and interaction warnings surface), Alerts screen
**Day 6**: Swap all mocks for real backend calls, integration testing
**Day 7**: Styling polish pass, accessibility check on patient view (test at 2x zoom), rehearse demo flow

## Confirm with backend dev before building
- Exact audio delivery shape for `/medications/{id}/audio` (direct stream vs. `audio_url` JSON)
- Whether `/patients/verify-device` exists as documented above (it's a frontend-driven addition to the original contract — flag it in `API_CONTRACT.md` once agreed)

