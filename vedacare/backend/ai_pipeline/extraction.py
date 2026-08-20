"""
Stage 4 + 5 — LLM Structuring & Confidence Scoring (+ Full Pipeline Orchestrator)

This is the main orchestrator module. It chains all pipeline stages:
  OCR → Language Detect → Translate to EN → LLM Structuring → Confidence Scoring → Translate to Target

Exposes the stable entry point: extract_prescription(file_path, target_lang) -> dict
"""

import json
import logging
import re
import time

import requests

from .config import (
    KNOWN_DRUGS,
    LLM_MAX_RETRIES,
    LLM_TIMEOUT_SECONDS,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
)
from .ocr import extract_text
from .prompts import ABBREVIATION_TABLE, EXTRACTION_SYSTEM_PROMPT, EXTRACTION_USER_PROMPT
from .translation import (
    detect_language,
    translate_medications_instructions,
    translate_to_english,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Stage 4 — LLM Structuring
# ---------------------------------------------------------------------------

def _call_ollama(system_prompt: str, user_prompt: str) -> str:
    """
    Call Ollama's chat API and return the raw response text.

    Uses the chat completions endpoint for structured conversation.
    """
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "stream": False,
        "options": {
            "temperature": 0.1,  # Low temp for structured extraction
            "num_predict": 4096,  # Enough for a multi-medication prescription
        },
    }

    logger.info(f"Calling Ollama ({OLLAMA_MODEL}) at {url}")
    start = time.time()

    response = requests.post(url, json=payload, timeout=LLM_TIMEOUT_SECONDS)
    response.raise_for_status()

    elapsed = time.time() - start
    logger.info(f"Ollama responded in {elapsed:.1f}s")

    result = response.json()
    return result.get("message", {}).get("content", "")


def _parse_llm_json(raw_text: str) -> dict:
    """
    Parse the LLM's response as JSON, handling common issues:
    - Strip markdown code fences
    - Strip preamble text before/after JSON
    - Handle trailing commas
    """
    text = raw_text.strip()

    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    text = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```\s*$", "", text)
    text = text.strip()

    # Try to find JSON object boundaries
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1:
        text = text[first_brace : last_brace + 1]

    # Remove trailing commas before closing braces/brackets (common LLM mistake)
    text = re.sub(r",\s*([}\]])", r"\1", text)

    return json.loads(text)


def _structure_with_llm(english_text: str) -> dict:
    """
    Stage 4 — Send English prescription text to Ollama for structured extraction.

    Includes the abbreviation reference table in the system prompt.
    Retries once on malformed JSON.
    """
    system_prompt = EXTRACTION_SYSTEM_PROMPT.format(
        abbreviation_table=ABBREVIATION_TABLE
    )
    user_prompt = EXTRACTION_USER_PROMPT.format(prescription_text=english_text)

    last_error = None

    for attempt in range(1 + LLM_MAX_RETRIES):
        try:
            raw_response = _call_ollama(system_prompt, user_prompt)
            logger.debug(f"LLM raw response (attempt {attempt + 1}): {raw_response[:500]}")

            parsed = _parse_llm_json(raw_response)

            # Basic validation — must have medications list
            if "medications" not in parsed:
                raise ValueError("LLM response missing 'medications' key")

            if not isinstance(parsed["medications"], list):
                raise ValueError("'medications' must be a list")

            logger.info(
                f"LLM structuring successful: "
                f"{len(parsed['medications'])} medications extracted"
            )
            return parsed

        except (json.JSONDecodeError, ValueError) as e:
            last_error = e
            logger.warning(
                f"LLM response parse failed (attempt {attempt + 1}): {e}"
            )
            if attempt < LLM_MAX_RETRIES:
                logger.info("Retrying LLM call...")
                # Add hint to user prompt for retry
                user_prompt = (
                    "IMPORTANT: Your previous response was not valid JSON. "
                    "Respond with ONLY the JSON object, no other text.\n\n"
                    + user_prompt
                )

        except requests.RequestException as e:
            last_error = e
            logger.error(f"Ollama API call failed: {e}")
            break

    raise RuntimeError(f"LLM structuring failed after retries: {last_error}")


# ---------------------------------------------------------------------------
# Stage 5 — Confidence Scoring
# ---------------------------------------------------------------------------

def _score_confidence(medication: dict, raw_ocr_text: str) -> str:
    """
    Stage 5 — Score confidence for a single medication.

    Returns "high" or "needs_review" based on:
    - Drug name recognizability
    - Missing required fields
    - Unusual dosage patterns
    - OCR text quality indicators
    """
    reasons = []

    drug_name = (medication.get("drug_name") or "").strip()
    strength = (medication.get("strength") or "").strip()
    frequency = medication.get("frequency_per_day")
    dose = medication.get("dose_per_intake")
    duration = medication.get("duration_days")

    # 1. Check if drug name is recognizable
    if not drug_name:
        reasons.append("missing drug name")
    elif drug_name.lower() not in KNOWN_DRUGS:
        # Check if it's garbled (lots of special chars, very short, etc.)
        if len(drug_name) < 3:
            reasons.append(f"drug name too short: '{drug_name}'")
        elif re.search(r"[^a-zA-Z0-9\s\-/]", drug_name):
            reasons.append(f"drug name contains unusual characters: '{drug_name}'")
        # Unknown but well-formed name is fine — might just not be in our list

    # 2. Check required fields
    if not strength:
        reasons.append("missing strength/dosage")

    if frequency is None or frequency == 0:
        reasons.append("missing or zero frequency")

    if dose is None or dose == 0:
        reasons.append("missing or zero dose_per_intake")

    # 3. Check for unusual patterns
    if frequency is not None and frequency > 6:
        reasons.append(f"unusually high frequency: {frequency}/day")

    if dose is not None and dose > 10:
        reasons.append(f"unusually high dose per intake: {dose}")

    if duration is not None and duration > 365:
        reasons.append(f"unusually long duration: {duration} days")

    # 4. Check OCR text quality for this drug (if the drug name appears garbled in OCR)
    if drug_name and raw_ocr_text:
        # If the drug name doesn't appear in the OCR text at all,
        # the LLM might have hallucinated it
        if drug_name.lower() not in raw_ocr_text.lower():
            # Check with fuzzy match — first 4 chars
            if len(drug_name) >= 4:
                prefix = drug_name[:4].lower()
                if prefix not in raw_ocr_text.lower():
                    reasons.append(
                        "drug name not found in OCR text (possible hallucination)"
                    )

    if reasons:
        logger.info(
            f"Medication '{drug_name}' flagged needs_review: {', '.join(reasons)}"
        )
        return "needs_review"

    return "high"


def _normalize_medication(med: dict) -> dict:
    """Normalize a single medication dict to ensure all required fields exist."""
    return {
        "drug_name": med.get("drug_name", "Unknown"),
        "strength": med.get("strength", ""),
        "dose_per_intake": med.get("dose_per_intake", 1),
        "form": med.get("form", "tablet"),
        "frequency_per_day": med.get("frequency_per_day", 1),
        "timing_slots": med.get("timing_slots", ["09:00"]),
        "food_instruction": med.get("food_instruction", "after_food"),
        "duration_days": med.get("duration_days", 30),
        "is_chronic": med.get("is_chronic", False),
        "is_prn": med.get("is_prn", False),
        "special_instructions_en": med.get("special_instructions_en", ""),
        "confidence": med.get("confidence", "needs_review"),
    }


# ---------------------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------------------

def extract_prescription(file_path: str, target_lang: str = "en") -> dict:
    """
    Main entry point — runs the full AI pipeline.

    Stages:
        1. OCR (MarkerPDF) → raw text
        2. Language detect → source language
        3. Translate to English (if needed)
        4. LLM structuring → structured JSON
        5. Confidence scoring → per-medication confidence
        6. Translate instructions to target language

    Args:
        file_path: Path to prescription image or PDF.
        target_lang: Patient's preferred language ("en", "hi", "gu").

    Returns:
        dict matching API_CONTRACT.md shape:
        {
            "doctor_name": str|None,
            "hospital_name": str|None,
            "source_language_detected": "en"|"hi"|"gu",
            "ai_confidence_overall": 0-100,
            "medications": [...]
        }

    Raises:
        Returns error dict on failure:
        {"success": False, "error": {"code": "AI_PROCESSING_FAILED", "message": str}}
    """
    try:
        logger.info(f"=== Starting AI Pipeline for: {file_path} ===")
        logger.info(f"Target language: {target_lang}")

        # --- Stage 1: OCR ---
        logger.info("Stage 1: OCR extraction...")
        raw_text = extract_text(file_path)
        if not raw_text:
            return _error_response("OCR failed to extract any text from the file.")

        logger.info(f"OCR extracted {len(raw_text)} characters")

        # --- Stage 2: Language Detection ---
        logger.info("Stage 2: Language detection...")
        source_lang = detect_language(raw_text)
        logger.info(f"Detected source language: {source_lang}")

        # --- Stage 3: Translate to English ---
        logger.info("Stage 3: Translate to English...")
        english_text = translate_to_english(raw_text, source_lang)

        # --- Stage 4: LLM Structuring ---
        logger.info("Stage 4: LLM structuring...")
        structured = _structure_with_llm(english_text)

        # --- Stage 5: Confidence Scoring ---
        logger.info("Stage 5: Confidence scoring...")
        medications = []
        for med in structured.get("medications", []):
            normalized = _normalize_medication(med)
            normalized["confidence"] = _score_confidence(normalized, raw_text)
            medications.append(normalized)

        # Calculate overall confidence
        if medications:
            high_count = sum(
                1 for m in medications if m["confidence"] == "high"
            )
            overall_confidence = int((high_count / len(medications)) * 100)
        else:
            overall_confidence = 0

        # --- Stage 6: Translate to Target Language ---
        logger.info("Stage 6: Translate instructions to target language...")
        medications = translate_medications_instructions(medications, target_lang)

        # --- Assemble Final Output ---
        result = {
            "doctor_name": structured.get("doctor_name"),
            "hospital_name": structured.get("hospital_name"),
            "source_language_detected": source_lang,
            "ai_confidence_overall": overall_confidence,
            "medications": medications,
        }

        logger.info(
            f"=== Pipeline complete: {len(medications)} medications, "
            f"confidence={overall_confidence}%, source={source_lang} ==="
        )

        return result

    except Exception as e:
        logger.exception(f"AI Pipeline failed: {e}")
        return _error_response(str(e))


def _error_response(message: str) -> dict:
    """Create a standard error response matching API_CONTRACT.md."""
    return {
        "success": False,
        "error": {
            "code": "AI_PROCESSING_FAILED",
            "message": message,
        },
    }
