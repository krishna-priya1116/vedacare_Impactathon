"""
Stages 2, 3, 6 — Language Detection & Translation

Stage 2: Detect source language of OCR text (en/hi/gu)
Stage 3: Translate non-English OCR text to English for LLM processing
Stage 6: Translate special_instructions_en to patient's target language
         (never translates drug names)

Uses deep-translator (Google Translate wrapper) — no API key needed.
"""

import logging
import re

logger = logging.getLogger(__name__)


def detect_language(text: str) -> str:
    """
    Stage 2 — Detect the language of raw OCR text.

    Args:
        text: Raw OCR text from the prescription.

    Returns:
        Language code: "en", "hi", or "gu". Defaults to "en" on failure.
    """
    if not text or not text.strip():
        logger.warning("Empty text passed to language detection, defaulting to 'en'")
        return "en"

    try:
        from langdetect import detect, DetectorFactory

        # Make detection deterministic
        DetectorFactory.seed = 0

        detected = detect(text)
        logger.info(f"Language detected: {detected}")

        # Map langdetect codes to our supported set
        lang_map = {
            "en": "en",
            "hi": "hi",
            "gu": "gu",
            # Common misdetections
            "mr": "hi",  # Marathi sometimes confused with Hindi (Devanagari)
        }

        result = lang_map.get(detected, "en")
        logger.info(f"Mapped language: {detected} -> {result}")
        return result

    except Exception as e:
        logger.error(f"Language detection failed: {e}. Defaulting to 'en'")
        return "en"


def translate_to_english(text: str, source_lang: str) -> str:
    """
    Stage 3 — Translate OCR text to English (conditional).
    Only runs if source_lang is not English. Skip if already English.

    Args:
        text: Raw OCR text (possibly in Hindi/Gujarati).
        source_lang: Detected source language code ("en", "hi", "gu").

    Returns:
        English text. Original text returned if already English or on failure.
    """
    if source_lang == "en":
        logger.info("Source is already English, skipping translation to EN")
        return text

    if not text or not text.strip():
        return text

    try:
        from deep_translator import GoogleTranslator

        translator = GoogleTranslator(source=source_lang, target="en")

        # deep-translator has a 5000 char limit per call — chunk if needed
        if len(text) > 4500:
            chunks = _chunk_text(text, max_len=4500)
            translated_chunks = [translator.translate(chunk) for chunk in chunks]
            translated = " ".join(translated_chunks)
        else:
            translated = translator.translate(text)

        logger.info(
            f"Translated {len(text)} chars from {source_lang} to en "
            f"({len(translated)} chars output)"
        )
        return translated

    except Exception as e:
        logger.error(
            f"Translation to English failed: {e}. Using original text."
        )
        return text


def translate_to_target(
    text: str,
    target_lang: str,
    drug_names: list[str] | None = None,
) -> str:
    """
    Stage 6 — Translate special_instructions_en to patient's chosen language.

    IMPORTANT: Never translates drug names. Drug names are preserved in
    English/Latin script even in Hindi/Gujarati output to avoid
    mistranslation risks.

    Args:
        text: English instruction text (special_instructions_en).
        target_lang: Patient's preferred language ("en", "hi", "gu").
        drug_names: Optional list of drug names to protect from translation.

    Returns:
        Translated text in target language. Original if target is English.
    """
    if target_lang == "en":
        logger.info("Target is English, skipping translation")
        return text

    if not text or not text.strip():
        return text

    try:
        from deep_translator import GoogleTranslator

        translator = GoogleTranslator(source="en", target=target_lang)

        # Protect drug names from translation by replacing them with placeholders
        protected = {}
        processed_text = text
        if drug_names:
            for i, drug in enumerate(drug_names):
                placeholder = f"DRUGPLACEHOLDER{i}ENDPLACEHOLDER"
                protected[placeholder] = drug
                # Case-insensitive replacement
                processed_text = re.sub(
                    re.escape(drug), placeholder, processed_text, flags=re.IGNORECASE
                )

        # Translate the processed text
        translated = translator.translate(processed_text)

        # Restore drug names from placeholders
        for placeholder, drug in protected.items():
            translated = translated.replace(placeholder, drug)

        logger.info(
            f"Translated instruction to {target_lang}: "
            f"'{text[:50]}...' -> '{translated[:50]}...'"
        )
        return translated

    except Exception as e:
        logger.error(
            f"Translation to {target_lang} failed: {e}. Using English text."
        )
        return text


def translate_medications_instructions(
    medications: list[dict], target_lang: str
) -> list[dict]:
    """
    Convenience function: translate special_instructions_en for all medications
    in the list, adding a `special_instructions_translated` field.

    Drug names are protected from translation.

    Args:
        medications: List of medication dicts (must have special_instructions_en).
        target_lang: Patient's preferred language.

    Returns:
        Same list with `special_instructions_translated` added to each item.
    """
    if target_lang == "en":
        for med in medications:
            med["special_instructions_translated"] = med.get(
                "special_instructions_en", ""
            )
        return medications

    # Collect all drug names for protection
    all_drug_names = [
        med["drug_name"] for med in medications if med.get("drug_name")
    ]

    for med in medications:
        instruction = med.get("special_instructions_en", "")
        if instruction:
            med["special_instructions_translated"] = translate_to_target(
                instruction, target_lang, drug_names=all_drug_names
            )
        else:
            med["special_instructions_translated"] = ""

    return medications


def _chunk_text(text: str, max_len: int = 4500) -> list[str]:
    """Split text into chunks respecting sentence boundaries."""
    sentences = re.split(r'(?<=[.!?\n])\s+', text)
    chunks = []
    current_chunk = ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) + 1 > max_len:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += " " + sentence if current_chunk else sentence

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks if chunks else [text[:max_len]]
