"""
AI Pipeline Configuration
Centralizes all config: Ollama URL, model name, audio output dir, etc.
Reads from environment variables with sensible defaults.
"""

import os
from pathlib import Path


# --- Ollama LLM Configuration ---
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "gpt-oss:120b-cloud")

# --- Audio Output ---
# Default: backend/ai_pipeline/audio_cache/
AUDIO_OUTPUT_DIR = Path(
    os.environ.get(
        "AI_AUDIO_OUTPUT_DIR",
        str(Path(__file__).parent / "audio_cache"),
    )
)
AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# --- Supported Languages ---
SUPPORTED_LANGUAGES = {"en", "hi", "gu"}
DEFAULT_LANGUAGE = "en"

# --- OCR Configuration ---
# MarkerPDF output directory for intermediate files
OCR_TEMP_DIR = Path(
    os.environ.get(
        "AI_OCR_TEMP_DIR",
        str(Path(__file__).parent / "ocr_temp"),
    )
)
OCR_TEMP_DIR.mkdir(parents=True, exist_ok=True)

# --- LLM Retry Settings ---
LLM_MAX_RETRIES = int(os.environ.get("AI_LLM_MAX_RETRIES", "1"))
LLM_TIMEOUT_SECONDS = int(os.environ.get("AI_LLM_TIMEOUT", "120"))

# --- Confidence Scoring ---
# Known drug names list for confidence scoring (basic set for hackathon)
KNOWN_DRUGS = {
    "metformin", "amlodipine", "atorvastatin", "omeprazole", "pantoprazole",
    "aspirin", "clopidogrel", "metoprolol", "losartan", "telmisartan",
    "paracetamol", "ibuprofen", "ciprofloxacin", "amoxicillin", "azithromycin",
    "cetirizine", "montelukast", "salbutamol", "insulin", "glimepiride",
    "sitagliptin", "empagliflozin", "rosuvastatin", "enalapril", "ramipril",
    "furosemide", "spironolactone", "warfarin", "digoxin", "levothyroxine",
    "prednisone", "prednisolone", "dexamethasone", "ranitidine", "domperidone",
    "ondansetron", "diclofenac", "gabapentin", "pregabalin", "tramadol",
    "hydrochlorothiazide", "valsartan", "carvedilol", "diltiazem", "nifedipine",
    "ceftriaxone", "doxycycline", "levofloxacin", "fluconazole", "acyclovir",
    "calcium", "vitamin d", "vitamin b12", "folic acid", "iron", "zinc",
    "multivitamin", "rabeprazole", "esomeprazole", "lansoprazole",
    "glipizide", "pioglitazone", "vildagliptin", "canagliflozin",
    "lisinopril", "perindopril", "olmesartan", "irbesartan",
    "atenolol", "bisoprolol", "propranolol", "nebivolol",
    "cephalexin", "clindamycin", "metronidazole", "nitrofurantoin",
}
