# VedaCare — Complete Technical Architecture & Development Plan

Source docs analyzed: `core_features`, `all_functionalities`, `interface`, `ui_theme`, `signup_login`, `tech_stack`, `new_suggestions`.

---

## 1. Project Understanding

**Objective**: Convert unstructured prescriptions/discharge summaries into a safe, structured medication plan delivered as voice-first, local-language reminders — for elderly and low-literacy patients — while giving caregivers a monitoring and safety-review layer.

**Target users**
- **Patient**: elderly / low-literacy, may not read English or operate a complex phone UI. Primary need: "What do I take right now?"
- **Caregiver**: manages the patient's care remotely. Uploads prescriptions, reviews AI output, monitors adherence, responds to alerts.
- **Admin** *(ASSUMPTION — see below)*: platform operator, reviews low-confidence extractions, monitors safety alerts system-wide.

**ASSUMPTION / NEEDS CONFIRMATION**: The docs describe a full Admin Dashboard (section 19 of `all_functionalities`) with patient management, prescription review queue, and safety center. Building this as a *third, separate role-based UI* in a 1-week hackathon is high risk. Recommend scoping Admin down to: a filtered view inside the caregiver app (or a simple internal-only page) that surfaces "AI Review Queue" and "Safety Center" — not a fully separate application. Confirm with team before committing dev days to a standalone admin app.

**Core user workflows**
1. Caregiver signs up → adds patient → generates 6-digit PIN/QR (7-day validity) → patient joins with code → devices connected.
2. Caregiver uploads prescription → AI extracts structured medication data + confidence score → interaction check runs → caregiver reviews/edits/approves → plan activates.
3. Patient receives voice-first reminders at scheduled times → confirms "Taken" or "Remind Later" → adherence logged.
4. Missed doses / safety flags / low-confidence extractions → generate caregiver alerts.
5. Caregiver monitors adherence, appointments, and stock via dashboard.

**Functional requirements** (from docs, consolidated): prescription capture (photo/PDF/voice), OCR + LLM structuring, abbreviation interpretation, medication plan generation, interaction checking with plain-language explanation, caregiver review/approval gate, PIN/QR patient connection, voice-first multilingual instructions (en/hi/gu), reminders, dose confirmation, missed-dose detection, caregiver alerts (safety/missed-dose/system), adherence tracking, timetable views, history/logs, AI confidence scoring + human review queue, audit log.

**Non-functional requirements**: accessibility (large text, high contrast, voice-first, minimal navigation for patient), responsible-AI framing (flag, don't diagnose; human-in-the-loop approval), data safety (medication data is sensitive), reasonable performance for a live demo (OCR+LLM pipeline should return in a few seconds, not minutes).

**External services needed**: OCR engine, LLM (Ollama local `gpt-oss-120b:cloud` or OpenRouter), Google Translate API, TTS (gTTS/Google Cloud TTS), SMS/WhatsApp for caregiver alerts *(optional — Twilio, not in new docs but consistent with alert requirements)*.

**Authentication requirements**: single login page with automatic role detection (caregiver vs. patient by account type) per `signup_login.docx`. Caregiver = standard email/mobile + password. Patient = no independent credentials; joins via time-limited PIN/QR tied to a caregiver-created profile.

**Edge cases identified**:
- OCR/LLM fails to confidently extract a medicine → must not silently activate; goes to review queue.
- PIN expires (7 days) or is already used → clear error states required (`signup_login.docx` section 8).
- Regenerating a PIN invalidates the previous one — must be enforced server-side, not just UI-side.
- Interaction checker must never imply diagnosis/prescription authority — output must always route to "confirm with doctor/pharmacist," never "stop taking X."
- Missed dose vs. course-completion (short antibiotic course ending) must be distinguished — don't false-alarm.

---

## 2. System Architecture

```
                ┌───────────────────────────┐
                │         FRONTEND          │
                │  Patient UI | Caregiver UI │
                │      (React + Vite)        │
                └─────────────┬──────────────┘
                              │ REST API / JSON (fetch/axios)
                              ▼
                ┌───────────────────────────┐
                │         BACKEND            │
                │  FastAPI                   │
                │  - Auth (JWT + PIN/QR)     │
                │  - Business logic          │
                │  - Scheduler (APScheduler) │
                │  - Alerts & audit log      │
                │  - Owns ALL DB access      │
                └──────┬──────────────┬───────┘
                       │              │
                       ▼              ▼
              ┌────────────────┐  ┌──────────────────────┐
              │    DATABASE     │  │      AI SERVICE       │
              │  SQLite via     │  │  OCR → LLM → Interact. │
              │  SQLAlchemy     │  │  Check → Translate →   │
              │                 │  │  TTS                    │
              └────────────────┘  └──────────────────────┘
```

**Communication rules**
- Frontend talks **only** to backend REST endpoints. Never touches the DB or the AI service directly.
- Backend is the **sole owner** of the database. All reads/writes go through backend models.
- Backend calls AI as a **black-box service** — either an in-process Python module (`backend/ai_pipeline/`) with a stable function signature, or a separate FastAPI microservice on its own port, depending on team preference (see AI_PIPELINE.md). Either way, backend never imports AI internals (model names, prompt text) directly into unrelated business logic — it calls one function: `extract_prescription(file) -> structured_dict`.
- AI service never touches the database and never calls the frontend. It receives an input, returns a structured output, and is stateless.
- Authentication happens entirely in backend (JWT issuance/verification, PIN validation). Frontend only stores and forwards the token.
- Validation happens in **two layers**: light validation (required fields, format) in frontend for UX; authoritative validation (business rules, DB constraints) in backend. Never trust frontend validation alone.

---

## 3. Technology Stack

| Layer | Tech | Notes |
|---|---|---|
| Backend framework | FastAPI | |
| Frontend framework | React (Vite) | not CRA — faster setup |
| Styling | Tailwind CSS | matches `ui_theme.docx` palette (see below) |
| Charts | Recharts | caregiver adherence charts |
| API calls | fetch / axios | |
| OCR | pytesseract / Marker (PDF) | |
| LLM | Ollama (`gpt-oss:120b-cloud`) or OpenRouter | one combined structuring + simplification prompt |
| Interaction data | Curated local CSV/JSON | not a live clinical API — scoped for hackathon |
| Translation | Google Translate API | |
| TTS | gTTS / Google Cloud TTS | en / hi / gu |
| DB | SQLite via SQLAlchemy | |
| Scheduler | APScheduler | in-process inside FastAPI |
| Auth | JWT (caregiver) + PIN/QR (patient) | |
| Dev servers | FastAPI `:8000`, React `:5173`, CORS enabled | |

**UI theme (from `ui_theme.docx`)** — apply as Tailwind config, both devs should use the same tokens:

| Token | Value |
|---|---|
| Primary | `#0F766E` (deep emerald) |
| Background | `#F7F7F3` (warm off-white) |
| Cards | `#FFFFFF` |
| Text primary | `#1C1C1C` (charcoal) |
| Text secondary | `#6B6B67` |
| Success | muted green |
| Warning | warm amber |
| Danger | muted red — reserved strictly for real safety alerts, never decorative |

Style: minimal, spacious, rounded cards, soft shadows, thin borders, large typography, few gradients, simple line icons. Patient UI = very simple, large touch targets, one task at a time. Caregiver UI = informative, schedule/adherence/alerts-dense. Avoid heavy glassmorphism, neon, dense tables on the patient side.

---

## 4–6. Frontend / Backend / AI Architecture

See `FRONTEND.md`, `BACKEND.md`, `AI_PIPELINE.md` respectively for full breakdowns of screens, routes, and pipeline stages.

---

## 7. Database Schema

Backend owns all tables. Full field-level detail lives in `BACKEND.md`; relationships summarized here.

```
caregivers ──< patients (1 caregiver : many patients, in v1)
patients ──< connection_codes        (PIN/QR history — supports regenerate/expire/one-time-use)
patients ──< prescriptions ──< medications ──< dose_logs
medications ──< interaction_flags     (many-to-many resolved via this join, see below)
patients ──< appointments
patients ──< care_instructions
caregivers ──< alerts >── patients
patients ──< audit_logs >── caregivers  (actor can be either role)
```

**Relationship notes**
- `caregivers` → `patients`: one-to-many. *(Multi-caregiver per patient is a documented roadmap item, not v1 — see FRONTEND/BACKEND for the join-table version if time allows.)*
- `medications` → `interaction_flags`: many-to-many. A flag references **two** medication IDs (the pair that conflicts) plus a severity and plain-language explanation. Model as its own table, not a self-referencing FK on `medications`.
- `dose_logs`: one row per **scheduled instance**, not per medication — this is what adherence % is calculated from.
- `audit_logs`: append-only, never updated/deleted — every state-changing action writes one row (prescription uploaded, plan activated, dose confirmed, alert generated, alert reviewed, patient connected, etc.) per `all_functionalities.docx` section 24.

**Indexes**: `patients.caregiver_id`, `medications.patient_id`, `dose_logs.medication_id`, `dose_logs.scheduled_time`, `alerts.patient_id`, `connection_codes.code` (unique).

**Constraints**: `connection_codes.code` unique + `expires_at` + `used` boolean; regenerating sets old code's `used = true` immediately (invalidation, not deletion — keep for audit trail).

---

## 8–9. API Architecture / Contracts

See `API_CONTRACT.md` for the full endpoint-by-endpoint spec (frontend↔backend) and `AI_PIPELINE.md` §"Backend ↔ AI Contract" for the AI interface. Both are the binding source of truth — do not deviate without updating the doc and notifying the team.

**Standard error format** (used everywhere):
```json
{ "success": false, "error": { "code": "INVALID_INPUT", "message": "human-readable message" } }
```
Common codes: `INVALID_INPUT`, `UNAUTHORIZED`, `NOT_FOUND`, `CODE_EXPIRED`, `CODE_ALREADY_USED`, `AI_PROCESSING_FAILED`, `SERVER_ERROR`.

---

## 11. Folder Structure

```
vedacare/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── patients.py
│   │   ├── prescriptions.py
│   │   ├── medications.py
│   │   ├── appointments.py
│   │   ├── alerts.py
│   │   └── admin.py
│   ├── scheduler.py
│   ├── audit.py
│   └── ai_pipeline/            # AI person's module — imported, not co-edited by backend dev
│       ├── ocr.py
│       ├── extraction.py
│       ├── interaction_check.py
│       ├── translation.py
│       └── tts.py
├── frontend/
│   ├── src/
│   │   ├── patient/
│   │   ├── caregiver/
│   │   ├── components/         # shared: MedicationCard, SafetyAlertCard, etc.
│   │   ├── theme/               # Tailwind tokens from ui_theme.docx
│   │   └── api/                  # fetch functions matching API_CONTRACT.md
│   └── package.json
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACT.md
│   ├── BACKEND.md
│   ├── FRONTEND.md
│   └── AI_PIPELINE.md
├── .env.example
├── README.md
└── .gitignore
```

**Why this minimizes conflicts**: each developer's primary edits stay inside one top-level folder. The only files touched by more than one person are the four `docs/*.md` contract files and `README.md` — and those are edited in short, communicated bursts (propose change → tell team → merge), not continuously during coding.

---

## 12. Git & Branching Strategy

```
main
 ├── backend-dev
 ├── frontend-dev
 └── ai-dev
```

- Each person works exclusively on their own branch, inside their own top-level folder.
- **Merge into `main` daily**, not just at the end — this is the single biggest conflict-preventer for a 3-person, 1-week build.
- Before merging: `git pull origin main` then rebase your branch on top, resolve locally, then push.
- Nobody edits another person's folder directly. If a change is needed there, message the owner or open a quick call — don't just push into it.
- `docs/API_CONTRACT.md` and `docs/AI_PIPELINE.md` changes must be announced in the team chat before merging, since both other members build against them.
- `.env` is never committed — only `.env.example` with empty/placeholder values is tracked.
- `README.md` changes: whoever finishes their section edits it, but don't let two people edit it in the same hour without checking.

| File/Folder | Owner | Others can modify? |
|---|---|---|
| `/frontend` | Frontend dev | No |
| `/backend` (excl. `ai_pipeline/`) | Backend dev | No |
| `/backend/ai_pipeline` | AI dev | No (backend only *imports* it) |
| `/docs/API_CONTRACT.md` | Backend dev | Coordinate — all 3 read it |
| `/docs/AI_PIPELINE.md` | AI dev | Coordinate |
| `.env.example` | Team | Coordinate |
| `README.md` | Team | Coordinate |

---

## 13. Feature-to-Developer Mapping

| Feature | Frontend | Backend | AI | Dependencies |
|---|---|---|---|---|
| Signup/Login + role detection | ✓ | ✓ | – | API_CONTRACT §Auth |
| PIN/QR patient connection | ✓ | ✓ | – | API_CONTRACT §Connection |
| Prescription upload (photo/PDF/voice) | ✓ | ✓ | ✓ | AI_PIPELINE §Extraction |
| AI extraction + abbreviation interpretation | – | ✓ (relay) | ✓ | AI_PIPELINE contract |
| Medication plan generator | – | ✓ | ✓ (structures data) | AI output shape |
| Interaction checker + risk explanation | – | ✓ (stores flags) | ✓ (detects + explains) | AI_PIPELINE §Interaction |
| Caregiver review & approval screen | ✓ | ✓ | – | API_CONTRACT §Medications |
| Voice-first reminders (multilingual) | ✓ (playback) | ✓ (scheduling) | ✓ (translate + TTS) | AI_PIPELINE §TTS |
| Dose confirmation + missed detection | ✓ | ✓ | – | Scheduler |
| Caregiver alerts (safety/missed/system) | ✓ | ✓ | – (safety alerts sourced from AI) | Alerts table |
| Adherence/status tracking | ✓ | ✓ | – | dose_logs |
| History/logs | ✓ | ✓ | – | audit_logs |
| AI confidence & review queue | ✓ | ✓ | ✓ (produces score) | confidence field |
| Admin review/safety center | ✓ (light) | ✓ | – | ASSUMPTION — scope down, see §1 |
| Audit log | – (display only) | ✓ | – | audit_logs table |

---

## 14. End-to-End Workflows

### Prescription → Active Plan
```
Caregiver → Frontend (upload) → Backend (/prescriptions/upload)
   → AI Service: OCR → LLM structuring → interaction check → confidence score
   → Backend stores prescription + medications (status=pending_review) + interaction_flags
   → Backend returns structured plan to Frontend
   → Caregiver reviews/edits in ReviewExtractedPlan screen
   → Frontend calls /medications/{id}/approve for each
   → Backend generates dose_logs via scheduler, writes audit_log entry
   → Plan now live on patient device
```

### Reminder → Confirmation → Adherence
```
Scheduler (backend, time-based) → marks dose_log as "due"
   → Backend prepares reminder payload (drug, dose, food instruction, audio_url)
   → Patient Frontend polls/fetches /patients/{id}/today
   → Patient taps 🔊 → plays TTS audio (pre-generated by AI service, cached by backend)
   → Patient taps "I've Taken It" → POST /dose_logs/{id}/confirm
   → Backend updates dose_log, recalculates adherence %, writes audit_log
   → If not confirmed within window → Backend marks "missed" → generates alert → Caregiver Frontend shows it
```

---

## 16. Mock Data Strategy

Each side builds against hardcoded JSON matching `API_CONTRACT.md` exactly, stored in:
- Frontend: `frontend/src/api/mocks.js`
- Backend (for AI, until AI module ready): a stub function in `backend/ai_pipeline/extraction.py` returning a fixed structured JSON with one `confidence: "needs_review"` item baked in, so backend's review-queue logic can be built and tested without waiting on the real AI.

Mock coverage needed: login/signup response, patient profile, PIN generation, prescription upload → extraction result (include one interaction flag + one low-confidence item so both safety paths are testable), today's schedule, dashboard summary, alerts list, error responses for each error code above.

---

## 17. Development Phases

**Phase 1 — Day 1: Architecture lock**
Finalize this document + API_CONTRACT.md + AI_PIPELINE.md as a team, together, before writing code. Confirm the Admin-scope-down ASSUMPTION.

**Phase 2 — Days 2–5: Parallel development**
- Backend: DB models → auth → prescription/medication CRUD → scheduler → alerts, using AI mocks throughout.
- Frontend: routing + landing/auth screens → patient view → caregiver dashboard, using API mocks throughout.
- AI: OCR pipeline on real sample prescriptions → LLM structuring/simplification prompt → interaction check against curated dataset → translation → TTS, tested independently via a CLI script before any integration.

**Phase 3 — Day 6: Integration**
Backend swaps AI mocks for real `ai_pipeline` calls. Frontend swaps API mocks for real backend URL. Fix contract mismatches immediately — don't let them accumulate.

**Phase 4 — Day 7: Testing + demo prep**
Full end-to-end run-throughs (see §18). Rehearse the live demo path specifically — it should be the one flow that's bulletproof even if edge cases elsewhere are rough.

**Phase 5 — Deployment (if needed for demo)**
Run everything locally on the presenting laptop — FastAPI + Vite dev servers + SQLite file. No need for cloud deployment for a hackathon demo unless explicitly required; keep this out of scope unless there's spare time on Day 7.

---

## 18. Integration Rules

1. Frontend never accesses the database directly.
2. AI never modifies frontend code or is called directly from it — always via backend.
3. Backend owns all database operations exclusively.
4. Backend calls AI only through the stable function/endpoint defined in `AI_PIPELINE.md`.
5. Frontend communicates with backend only through documented REST endpoints.
6. No one changes a response shape in `API_CONTRACT.md` or `AI_PIPELINE.md` without telling the other two and updating the doc first.
7. DB schema changes are announced before merging.
8. AI input/output JSON shape must stay stable — if the AI dev needs to change a model or prompt internally, that's invisible to backend as long as the contract shape doesn't change.
9. `.env` values are never hardcoded in source; always read via `os.environ`.
10. Don't touch another developer's folder without asking first.

---

## 19. Testing Strategy

**Frontend**: manual click-through of every screen state (loading, error, empty, success) against mocks before integration; verify patient view is usable at 2x zoom (accessibility check).

**Backend**: hit every endpoint with `curl`/Postman against both valid and invalid input; verify scheduler actually creates `dose_logs` rows on plan activation; verify PIN expiry/reuse rejection.

**AI**: run the pipeline standalone (no backend) on 3–5 real sample prescriptions of varying handwriting quality; verify at least one deliberately messy sample correctly returns `confidence: "needs_review"` rather than a wrong confident guess — this matters more than raw accuracy for your safety story.

**Integration**: one full run of Prescription → Active Plan → Reminder → Confirmation → Adherence Update, done together as a team before demo day, not left until the last hour.

---

## 20. Environment Configuration

`.env.example`:
```
DATABASE_URL=sqlite:///./vedacare.db
BACKEND_URL=http://localhost:8000
AI_SERVICE_URL=http://localhost:8000/ai        # or separate port if AI runs as its own service
OLLAMA_MODEL=gpt-oss:120b-cloud
OPENROUTER_API_KEY=
GOOGLE_TRANSLATE_API_KEY=
GOOGLE_TTS_API_KEY=
JWT_SECRET_KEY=
```

---

## 21. Definition of Done

**Frontend**: all documented patient + caregiver screens implemented per `interface.docx`; theme tokens from `ui_theme.docx` applied consistently; all API calls match the contract; loading/error/empty states present on every data-fetching screen; patient view tested for large-text/accessibility.

**Backend**: all `API_CONTRACT.md` endpoints implemented and return the documented shape; auth (JWT + PIN/QR with expiry/one-time-use) works; scheduler generates and updates `dose_logs` correctly; alerts fire for missed dose, safety interaction, and low-confidence extraction; audit log records every listed action type.

**AI**: OCR + LLM structuring returns the documented JSON shape including `confidence` per medication; interaction checker flags at least the curated dataset's known pairs with plain-language explanations (never diagnostic/prescriptive language); translation + TTS work for en/hi/gu on sample text; pipeline is callable independently of backend for testing.

---

## 22. Potential Integration Conflicts & How to Avoid Them

| Risk | Mitigation |
|---|---|
| AI output shape drifts from what backend expects | Lock `AI_PIPELINE.md` contract Day 1, AI dev tests output against it before backend integration |
| Frontend built against stale mocks that don't match real backend | Mocks live in one file, generated directly from `API_CONTRACT.md` examples — not invented separately |
| Two people editing `docs/API_CONTRACT.md` simultaneously | Announce before editing; keep edits small and immediate |
| Scheduler timing logic assumptions differ between backend and AI's TTS caching | Agree Day 1 whether audio is pre-generated at plan-activation time or generated on-demand at reminder time — pick one, document it |
| Admin dashboard scope balloons and eats frontend's week | Confirmed as scoped-down per §1 ASSUMPTION — revisit only if Days 1–6 finish early |
| Last-minute merge conflicts | Daily merges into `main`, never a single end-of-week merge |

---

## 23. Final Recommended Architecture

FastAPI backend as the single integration hub, owning auth, database, scheduling, and alerts; React frontend split into a deliberately minimal patient experience and an information-dense caregiver dashboard, sharing a component library and the `ui_theme.docx` design tokens; AI pipeline isolated as a callable module/service producing a stable, confidence-scored JSON contract that backend treats as a black box. Admin functionality is scoped down to a lightweight review queue inside the caregiver app rather than a fourth full application, given the 1-week timeline. All three developers build in parallel from Day 1 against the locked `API_CONTRACT.md` and `AI_PIPELINE.md` contracts and mock data, merging into `main` daily to keep integration risk low throughout the week rather than concentrated at the end.

