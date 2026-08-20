"""
AI Pipeline — Standalone Test Script
=====================================

Run this to test the full pipeline on sample prescriptions BEFORE integration
with backend. This is independent of backend's endpoints.

Usage:
    python -m ai_pipeline.test_pipeline
    python backend/ai_pipeline/test_pipeline.py

Tests:
    1. Clean, typed English prescription
    2. Hindi/Gujarati sample
    3. Messy/handwritten sample (should flag needs_review)
"""

import json
import logging
import os
import sys
import tempfile
from pathlib import Path

# Ensure the parent directory is in the path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from ai_pipeline.extraction import extract_prescription
from ai_pipeline.tts import generate_audio
from ai_pipeline.translation import detect_language, translate_to_english
from ai_pipeline.ocr import extract_text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("test_pipeline")


# ---------------------------------------------------------------------------
# Sample prescription texts (for testing without actual image files)
# ---------------------------------------------------------------------------

SAMPLE_ENGLISH_PRESCRIPTION = """
Dr. Rajesh Sharma, MD
City General Hospital, Ahmedabad
Date: 20/08/2026

Patient: Mr. Ramesh Patel, Age: 72, M

Rx:
1. Tab Metformin 500mg — 1 tab BD PC x 30 days
2. Tab Amlodipine 5mg — 1 tab OD morning x 30 days
3. Tab Atorvastatin 10mg — 1 tab HS x 30 days
4. Tab Aspirin 75mg — 1 tab OD after breakfast (continue)
5. Syr Lactulose 15ml — HS PRN

Follow-up: 27th Aug 2026
"""

SAMPLE_HINDI_PRESCRIPTION = """
डॉ. सुनीता गुप्ता, MBBS
जिला अस्पताल, अहमदाबाद
दिनांक: 20/08/2026

रोगी: श्रीमती कमला देवी, आयु: 68, महिला

दवाइयाँ:
1. Tab Metformin 500mg — 1 गोली दिन में दो बार खाने के बाद 30 दिन
2. Tab Amlodipine 5mg — 1 गोली सुबह 30 दिन
3. Cap Omeprazole 20mg — 1 कैप्सूल खाली पेट सुबह 14 दिन

अगली मुलाकात: 3 सितंबर 2026
"""

SAMPLE_MESSY_PRESCRIPTION = """
Dr. ???  (illegible)
Hosp: C_ty H0sp

Pt: M. Ptel, 75/M

Rx
1. Tab M3tf0rmin 500 - 1 BD PC
2. Tab Amlo... 5mg OD
3. ??? 10mg - 1 tab OD
4. Inj Insulin - 10 units SC BD AC
"""


def create_temp_text_file(content: str, suffix: str = ".txt") -> str:
    """Create a temporary file with the given text content."""
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(content)
    return path


def print_result(label: str, result: dict):
    """Pretty-print a pipeline result."""
    print(f"\n{'='*70}")
    print(f"  {label}")
    print(f"{'='*70}")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print(f"{'='*70}\n")


def test_language_detection():
    """Test language detection independently."""
    print("\n--- Testing Language Detection ---")

    tests = [
        ("English text: Take 1 tablet twice daily after food.", "en"),
        ("हिंदी पाठ: दिन में दो बार खाने के बाद एक गोली लें।", "hi"),
        ("ગુજરાતી ટેક્સ્ટ: ખોરાક પછી દિવસમાં બે વખત 1 ગોળી લો.", "gu"),
    ]

    for text, expected in tests:
        detected = detect_language(text)
        status = "✓" if detected == expected else "✗"
        print(f"  {status} Expected={expected}, Got={detected}: '{text[:50]}...'")


def test_translation():
    """Test translation independently."""
    print("\n--- Testing Translation ---")

    # Hindi to English
    hindi_text = "दिन में दो बार खाने के बाद एक गोली लें"
    english = translate_to_english(hindi_text, "hi")
    print(f"  Hindi -> English: '{english}'")


def test_tts():
    """Test TTS independently."""
    print("\n--- Testing TTS ---")

    tests = [
        ("Take one tablet twice a day after food.", "en"),
        ("खाने के बाद दिन में दो बार एक गोली लें।", "hi"),
        ("ખોરાક પછી દિવસમાં બે વખત 1 ગોળી લો.", "gu"),
    ]

    for text, lang in tests:
        path = generate_audio(text, lang)
        if path:
            size = Path(path).stat().st_size
            print(f"  ✓ [{lang}] Audio generated: {path} ({size} bytes)")
        else:
            print(f"  ✗ [{lang}] Audio generation failed")


def test_full_pipeline_english():
    """Test full pipeline on clean English prescription."""
    print("\n--- Test: Clean English Prescription ---")

    temp_file = create_temp_text_file(SAMPLE_ENGLISH_PRESCRIPTION)
    try:
        result = extract_prescription(temp_file, target_lang="en")
        print_result("English Prescription Result", result)

        if "error" not in result:
            meds = result.get("medications", [])
            print(f"  Medications found: {len(meds)}")
            print(f"  Source language: {result.get('source_language_detected')}")
            print(f"  Overall confidence: {result.get('ai_confidence_overall')}%")
            for m in meds:
                print(
                    f"    - {m['drug_name']} {m['strength']} "
                    f"({m['confidence']})"
                )
    finally:
        os.unlink(temp_file)


def test_full_pipeline_hindi():
    """Test full pipeline on Hindi prescription."""
    print("\n--- Test: Hindi Prescription ---")

    temp_file = create_temp_text_file(SAMPLE_HINDI_PRESCRIPTION)
    try:
        result = extract_prescription(temp_file, target_lang="hi")
        print_result("Hindi Prescription Result", result)

        if "error" not in result:
            meds = result.get("medications", [])
            print(f"  Source language: {result.get('source_language_detected')}")
            print(f"  Medications found: {len(meds)}")
            for m in meds:
                print(
                    f"    - {m['drug_name']} "
                    f"(EN: {m.get('special_instructions_en', '')[:40]}...)"
                )
                if m.get("special_instructions_translated"):
                    print(
                        f"      (HI: {m['special_instructions_translated'][:40]}...)"
                    )
    finally:
        os.unlink(temp_file)


def test_full_pipeline_messy():
    """Test full pipeline on messy/handwritten-like prescription."""
    print("\n--- Test: Messy/Handwritten Prescription ---")

    temp_file = create_temp_text_file(SAMPLE_MESSY_PRESCRIPTION)
    try:
        result = extract_prescription(temp_file, target_lang="en")
        print_result("Messy Prescription Result", result)

        if "error" not in result:
            meds = result.get("medications", [])
            needs_review = sum(
                1 for m in meds if m["confidence"] == "needs_review"
            )
            print(f"  Medications found: {len(meds)}")
            print(f"  Flagged needs_review: {needs_review}")
            print(
                f"  ✓ At least one needs_review: "
                f"{'YES' if needs_review > 0 else 'NO (should have been flagged!)'}"
            )
    finally:
        os.unlink(temp_file)


def test_with_real_file(file_path: str, target_lang: str = "en"):
    """Test with a real prescription file (image or PDF)."""
    print(f"\n--- Test: Real File ({file_path}) ---")

    if not Path(file_path).exists():
        print(f"  ✗ File not found: {file_path}")
        return

    result = extract_prescription(file_path, target_lang=target_lang)
    print_result(f"Real File Result ({Path(file_path).name})", result)


def main():
    """Run all tests."""
    print("=" * 70)
    print("  VedaCare AI Pipeline — Test Suite")
    print("=" * 70)

    # Independent stage tests
    test_language_detection()
    test_translation()
    test_tts()

    # Full pipeline tests
    test_full_pipeline_english()
    test_full_pipeline_hindi()
    test_full_pipeline_messy()

    # Test with real file if provided as CLI argument
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        target_lang = sys.argv[2] if len(sys.argv) > 2 else "en"
        test_with_real_file(file_path, target_lang)

    print("\n" + "=" * 70)
    print("  All tests complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
