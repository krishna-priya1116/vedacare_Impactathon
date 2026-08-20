import sys, io, json, tempfile, os, logging
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, 'backend')
logging.basicConfig(level=logging.INFO, format='%(name)s: %(message)s')
from ai_pipeline.tts import generate_all_medication_audio
from ai_pipeline.translation import translate_medications_instructions

# Mock LLM extraction output for the AIIMS prescription
structured_data = {
  'doctor_name': None,
  'hospital_name': 'A.I.I.M.S. HOSPITAL',
  'medications': [
    {
      'drug_name': 'Thyroxine',
      'strength': '75 mcg',
      'dose_per_intake': 1,
      'form': 'tablet',
      'frequency_per_day': 1,
      'timing_slots': ['07:00'],
      'food_instruction': 'empty_stomach',
      'duration_days': 120,
      'is_chronic': True,
      'is_prn': False,
      'special_instructions_en': 'Take 1 tablet once daily before breakfast (empty stomach).'
    },
    {
      'drug_name': 'Metformin SR',
      'strength': '500 mg',
      'dose_per_intake': 1,
      'form': 'tablet',
      'frequency_per_day': 1,
      'timing_slots': ['09:00'],
      'food_instruction': 'after_food',
      'duration_days': 120,
      'is_chronic': True,
      'is_prn': False,
      'special_instructions_en': 'Take 1 tablet once daily.'
    },
    {
      'drug_name': 'Evidofe Forte',
      'strength': '',
      'dose_per_intake': 1,
      'form': 'capsule',
      'frequency_per_day': 1,
      'timing_slots': ['09:00'],
      'food_instruction': 'after_food',
      'duration_days': 120,
      'is_chronic': True,
      'is_prn': False,
      'special_instructions_en': 'Take 1 capsule once daily.'
    },
    {
      'drug_name': 'Cremaffin',
      'strength': '2 tsf',
      'dose_per_intake': 10,  # roughly 10ml for 2 tsf
      'form': 'syrup',
      'frequency_per_day': 1,
      'timing_slots': ['22:00'],
      'food_instruction': 'after_food',
      'duration_days': 120,
      'is_chronic': False,
      'is_prn': False,
      'special_instructions_en': 'Take 2 teaspoons at bedtime.'
    }
  ]
}

print('Stage 6: Translating English structured instructions to Hindi (Target Language)...')
translated_meds = translate_medications_instructions(structured_data['medications'], 'hi')

print('\nStage 7: Generating TTS Audio...')
meds_with_audio = generate_all_medication_audio(translated_meds, 'hi')

print('\n--- Results ---')
for med in meds_with_audio:
    print(f"{med['drug_name']}:")
    print(f"  English:  {med['special_instructions_en']}")
    print(f"  Hindi:    {med['special_instructions_translated']}")
    print(f"  Audio:    {med['audio_url']}\n")
