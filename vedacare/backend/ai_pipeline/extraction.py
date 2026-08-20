"""
VedaCare — AI extraction stub.
Returns fixed JSON matching the API_CONTRACT.md shape so downstream backend
logic (review queue, approval gate, interaction flags) can be built and tested
immediately without the real AI pipeline.
"""


def extract_prescription(file_bytes: bytes, filename: str = "") -> dict:
    """
    Stub implementation.
    Returns a canned result with:
      - 2 medications (1 high-confidence, 1 needs_review)
      - 1 interaction_flag
      - 1 extracted appointment
    """
    return {
        "doctor_name": "Dr. Sharma",
        "hospital_name": "City Hospital",
        "ai_confidence_overall": 87,
        "medications": [
            {
                "temp_id": "m1",
                "drug_name": "Metformin",
                "strength": "500mg",
                "dose_per_intake": 1,
                "form": "tablet",
                "frequency_per_day": 2,
                "timing_slots": ["08:30", "20:30"],
                "food_instruction": "after_food",
                "duration_days": 30,
                "is_chronic": False,
                "is_prn": False,
                "special_instructions_en": "Take twice a day, after food, for 30 days.",
                "confidence": "high",
            },
            {
                "temp_id": "m2",
                "drug_name": "Aspirin",
                "strength": "75mg",
                "dose_per_intake": 1,
                "form": "tablet",
                "frequency_per_day": 1,
                "timing_slots": ["09:00"],
                "food_instruction": "after_food",
                "duration_days": 90,
                "is_chronic": True,
                "is_prn": False,
                "special_instructions_en": "Take once daily. Long-term use.",
                "confidence": "needs_review",
            },
        ],
        "interaction_flags": [
            {
                "medication_ids": ["m1", "m2"],
                "severity": "moderate",
                "summary": "May increase bleeding risk when taken together.",
                "recommendation": "Please confirm this combination with a doctor or pharmacist.",
            }
        ],
        "appointments": [
            {
                "purpose": "Follow-up review",
                "doctor_name": "Dr. Sharma",
                "appointment_datetime": "2026-08-27T11:00:00",
            }
        ],
    }
