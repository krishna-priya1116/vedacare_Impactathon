"""
VedaCare AI Pipeline
====================

Two stable entry points for the backend developer:

1. extract_prescription(file_path, target_lang) -> dict
   Full OCR → structuring pipeline. Returns medication data matching API_CONTRACT.md.

2. generate_audio(text, target_lang) -> str
   TTS audio generation. Returns file path to .mp3.

Backend imports ONLY these two functions. Internal modules (ocr, translation,
prompts, config) are implementation details — never import them directly
from outside this package.

Usage:
    from ai_pipeline import extract_prescription, generate_audio

    result = extract_prescription("path/to/prescription.pdf", target_lang="hi")
    audio_path = generate_audio("Take 1 tablet after food", target_lang="hi")
"""

from .extraction import extract_prescription
from .tts import generate_audio, generate_all_medication_audio
from .interaction_check import check_interactions

__all__ = [
    "extract_prescription",
    "generate_audio",
    "generate_all_medication_audio",
    "check_interactions",
]
