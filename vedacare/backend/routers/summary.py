import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from ai_pipeline.tts import generate_audio
from ai_pipeline.translation import translate_to_target

router = APIRouter(tags=["Prescription Summary"])

class MedicationInput(BaseModel):
    drug_name: str
    strength: Optional[str] = None
    dose_per_intake: Optional[int] = 1
    frequency_per_day: Optional[int] = 1
    timing_slots: List[str] = []
    food_instruction: Optional[str] = "after_food"

class SummaryRequest(BaseModel):
    patient_name: str
    language: str = "en"
    medications: List[MedicationInput]

class SummaryResponse(BaseModel):
    summary_text: str
    audio_url: str

def format_timing(slots: List[str]) -> str:
    if not slots:
        return ""
    # Map common slots to friendly text
    times = []
    for slot in slots:
        h = int(slot.split(':')[0])
        if 5 <= h < 11:
            times.append("morning")
        elif 11 <= h < 16:
            times.append("afternoon")
        elif 16 <= h < 20:
            times.append("evening")
        else:
            times.append("night")
    return " and ".join(times)

@router.post("/prescriptions/summary", response_model=SummaryResponse)
def generate_summary(req: SummaryRequest):
    meds = req.medications
    if not meds:
        raise HTTPException(status_code=400, detail="No medications provided")

    text_parts = []
    text_parts.append(f"{req.patient_name} has {len(meds)} medicines today.")
    
    for med in meds:
        freq = ""
        if med.frequency_per_day == 1:
            freq = "once a day"
        elif med.frequency_per_day == 2:
            freq = "twice a day"
        elif med.frequency_per_day == 3:
            freq = "three times a day"
        else:
            freq = f"{med.frequency_per_day} times a day"

        timing = format_timing(med.timing_slots)
        food = med.food_instruction.replace('_', ' ') if med.food_instruction else "after food"

        sentence = f"{med.drug_name} should be taken {freq}"
        if timing:
            sentence += f" in the {timing}"
        sentence += f", {food}."
        text_parts.append(sentence)

    english_summary = " ".join(text_parts)
    
    # Translate to target language
    drug_names = [m.drug_name for m in meds]
    translated_summary = translate_to_target(english_summary, req.language, drug_names=drug_names)

    # Generate TTS
    audio_path = generate_audio(translated_summary, target_lang=req.language)
    
    if not audio_path:
        raise HTTPException(status_code=500, detail="Failed to generate audio")

    # Assuming audio_path is absolute, we need to return the filename
    filename = os.path.basename(audio_path)
    audio_url = f"/audio/{filename}"

    return SummaryResponse(
        summary_text=translated_summary,
        audio_url=audio_url
    )
