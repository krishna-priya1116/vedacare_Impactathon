# AI Pipeline Spec — VedaCare

You own `backend/ai_pipeline/`. Expose **one stable entry point** the backend dev calls — they should never need to know your internal prompts, model choice, or intermediate steps.

**Scope today: Caregiver + Patient only. No interaction checker, no admin panel.**

## Interface contract (Backend ↔ AI)

```
AI SERVICE: Prescription extraction
CALL: extract_prescription(file_path: str, target_lang: str) -> dict
   (or, if run as a separate microservice: POST /ai/extract, multipart file + target_lang)

OUTPUT (must match API_CONTRACT.md exactly):
{
  "doctor_name": "string|null",
  "hospital_name": "string|null",
  "source_language_detected": "en|hi|gu",
  "ai_confidence_overall": 0-100,
  "medications": [
    {
      "drug_name": "string", "strength": "string", "dose_per_intake": 1,
      "form": "tablet|capsule|syrup", "frequency_per_day": 2,
      "timing_slots": ["08:30","20:30"], "food_instruction": "after_food|before_food|empty_stomach",
      "duration_days": 30, "is_chronic": false, "is_prn": false,
      "special_instructions_en": "string",
      "confidence": "high|needs_review"
    }
  ]
}

ERROR RESPONSE:
{ "success": false, "error": { "code": "AI_PROCESSING_FAILED", "message": "string" } }
```

```
AI SERVICE: Voice generation
CALL: generate_audio(text: str, target_lang: str) -> str (file path or URL)
```

Backend never imports your OCR/LLM/prompt code into unrelated modules — it only calls these two functions. You can swap models, rewrite prompts, or change OCR libraries internally without breaking backend's code, as long as this input/output shape stays stable.

---

## Pipeline stages you own

```
1. OCR              → raw text from image/PDF using MarkerPDF (best for handwritten prescriptions)
2. Language detect   → is the OCR text English, Hindi, or Gujarati source?
3. Translate to EN   → only runs if stage 2 says non-English; skip if already English
4. LLM structuring   → English text → structured medications[] JSON
                        (single combined prompt: extract + interpret abbreviations + simplify)
5. Confidence scoring → per-medication "high" vs "needs_review"
6. Translate to output lang → simplified instruction text → patient's CHOSEN language (independent of source language)
7. TTS                → translated text → audio file
```

**Important**: stage 2 (what language the prescription itself was written in) and stage 6 (what language the patient wants to hear) are two separate, independent variables. A Gujarati-written prescription can still need Hindi audio output, or an English prescription can need Gujarati audio. Never assume they're the same — always take `target_lang` as an explicit parameter to the pipeline, never infer it from the source document.

### Stage 1 — OCR
- Tool: **MarkerPDF**, not pytesseract — meaningfully better on handwritten/messy prescriptions, which is your real-world input, not clean typed text
- Works on both image and PDF uploads — one code path for both instead of branching
- Output: raw extracted text, whatever script/language it came in

### Stage 2 — Language detection
- Tool: `langdetect` (Python) — run on raw OCR text before any other processing
- Prescriptions can genuinely be written in Gujarati or Hindi, not just English — test this on an actual Gujarati/Hindi sample today, not just English ones, since it's doing real work in your demo, not just a safety net
- Cheap, single function call, feeds directly into stage 3's conditional

### Stage 3 — Translate to English (conditional)
- Only invoke Google Translate API if stage 2 detected non-English
- Output feeds directly into stage 4 — LLM always sees English regardless of source

### Stage 4 — LLM structuring prompt requirements
- Input: English text (either the original OCR, or the stage-3 translation)
- Must interpret standard abbreviations (`BD` = twice daily, `PC` = after food, `OD` = once daily, `HS` = at bedtime, `PRN` = as needed) — build a reference table, don't rely on the LLM guessing every time
- Output strict JSON only, no preamble — validate/parse defensively, retry once on malformed JSON before failing
- Always output `special_instructions_en` in plain English regardless of patient's target language — translation happens in stage 6, keeps this prompt simpler and reusable

### Stage 5 — Confidence scoring
Mark a medication `"needs_review"` when: OCR text for that line was low-confidence/garbled, drug name doesn't match a known reference list, dosage/frequency pattern is ambiguous or unusual, or required fields (dose, frequency) couldn't be extracted at all. Otherwise `"high"`. This drives whether the caregiver's review screen shows a warning flag on that item — still requires the same explicit approval either way, just visually flagged when uncertain.

### Stage 6 — Translation to output language
Use Google Translate API. Translate only `special_instructions_en` — never translate drug names; keep them in Latin/English script even mid-sentence in Hindi/Gujarati output, since TTS engines pronounce them fine and mistranslating a drug name is a real risk.

### Stage 7 — TTS
gTTS (or Google Cloud TTS for better quality) — supports `hi`, `gu`, `en` directly. Decide with backend dev whether audio is generated once at plan-approval time and cached (recommended — faster, fewer live API calls during the actual demo) or generated on-demand per reminder. Recommend caching for today given the time pressure.

---

## ⏱ Only 1 day left — see `ONE_DAY_PLAN.md`

Build order today, in this exact sequence, hour by hour:
1. OCR (MarkerPDF) working on real samples — including at least one genuinely Gujarati or Hindi handwritten/typed sample, not just English
2. Language detect + conditional translate-to-English
3. LLM structuring (English in, structured JSON out)
4. Translate to output language + TTS

Do not start stage 4 (translate/TTS) until stages 1-3 are proven working end to end on a real non-English sample — that's the part of your pitch that's actually novel, don't leave it untested.

## Testing (do before integration)

Build a small CLI script (`ai_pipeline/test_pipeline.py`) that runs the full flow on 3-4 sample prescription images and prints the JSON output. Include at minimum:
- One clean, typed English prescription (should return all `confidence: "high"`, `source_language_detected: "en"`)
- One Gujarati or Hindi sample (should correctly detect source language and translate before structuring)
- One messy/handwritten sample (should correctly flag `"needs_review"` on the unclear line — more important to demo than perfect accuracy on the clean one)

Test standalone, independent of backend, before waiting for backend's endpoints to exist.

## What NOT to build today
- No interaction checker — fully cut, not a bonus item
- No admin panel — fully cut
- No live/paid clinical APIs of any kind
- Don't over-engineer language detection beyond `langdetect` + one conditional branch
