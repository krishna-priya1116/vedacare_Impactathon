"""
Stage 7 — Text-to-Speech using gTTS

Generates audio files for medication instructions.
Supports en, hi, gu languages directly via gTTS.
"""

import hashlib
import logging
from pathlib import Path

from .config import AUDIO_OUTPUT_DIR, SUPPORTED_LANGUAGES

logger = logging.getLogger(__name__)


def generate_audio(text: str, target_lang: str = "en") -> str:
    """
    Generate a TTS audio file from text using gTTS.

    Args:
        text: The text to convert to speech.
        target_lang: Language code ("en", "hi", "gu").

    Returns:
        Absolute file path to the generated .mp3 file.
        Empty string on failure.
    """
    if not text or not text.strip():
        logger.warning("Empty text passed to TTS, skipping.")
        return ""

    if target_lang not in SUPPORTED_LANGUAGES:
        logger.warning(
            f"Unsupported TTS language '{target_lang}', falling back to 'en'"
        )
        target_lang = "en"

    # Generate a deterministic filename based on content + language
    # This provides built-in caching — same text+lang = same file
    content_hash = hashlib.md5(
        f"{text}:{target_lang}".encode("utf-8")
    ).hexdigest()[:12]
    filename = f"tts_{target_lang}_{content_hash}.mp3"
    output_path = AUDIO_OUTPUT_DIR / filename

    # Return cached file if it exists
    if output_path.exists():
        logger.info(f"TTS cache hit: {filename}")
        return str(output_path)

    try:
        from gtts import gTTS

        # Map our language codes to gTTS language codes
        lang_map = {
            "en": "en",
            "hi": "hi",
            "gu": "gu",
        }
        gtts_lang = lang_map.get(target_lang, "en")

        logger.info(f"Generating TTS audio ({gtts_lang}): '{text[:60]}...'")

        tts = gTTS(text=text, lang=gtts_lang, slow=False)
        tts.save(str(output_path))

        logger.info(f"TTS saved: {output_path} ({output_path.stat().st_size} bytes)")
        return str(output_path)

    except ImportError:
        logger.error("gTTS not installed. Install with: pip install gTTS")
        return ""

    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        # Clean up partial file if it exists
        if output_path.exists():
            output_path.unlink()
        return ""


def generate_medication_audio(medication: dict, target_lang: str = "en") -> str:
    """
    Generate TTS audio for a single medication's instructions.

    Uses translated instructions if available, falls back to English.
    Prepends the drug name to ensure the patient knows which medication to take.

    Args:
        medication: Medication dict with special_instructions fields.
        target_lang: Target language code.

    Returns:
        File path to generated audio.
    """
    drug_name = medication.get("drug_name", "Medication")
    
    # Prefer translated instructions, fall back to English
    instruction = medication.get(
        "special_instructions_translated",
        medication.get("special_instructions_en", ""),
    )

    if not instruction:
        dose = medication.get("dose_per_intake", 1)
        form = medication.get("form", "tablet")
        freq = medication.get("frequency_per_day", 1)
        food = medication.get("food_instruction", "after_food").replace("_", " ")

        # Build a basic instruction if none provided
        instruction = f"Take {dose} {form}, {freq} times a day, {food}."

    # Prepend the drug name so it's always spoken
    text = f"{drug_name}. {instruction}"

    return generate_audio(text, target_lang)


def generate_all_medication_audio(
    medications: list[dict], target_lang: str = "en"
) -> list[dict]:
    """
    Generate TTS audio for all medications in the list.
    Adds 'audio_url' field to each medication dict.

    Args:
        medications: List of medication dicts.
        target_lang: Target language code.

    Returns:
        Same list with 'audio_url' added to each item.
    """
    for med in medications:
        audio_path = generate_medication_audio(med, target_lang)
        med["audio_url"] = audio_path

    generated_count = sum(1 for m in medications if m.get("audio_url"))
    logger.info(
        f"Generated audio for {generated_count}/{len(medications)} medications"
    )

    return medications
