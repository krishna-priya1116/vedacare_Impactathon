// Shared in-memory state store for mock data
// This simulates a backend database for the frontend-only dev phase.
// When caregivers add patients / generate PINs, and patients join,
// this store keeps the state consistent across components.

import { mockMedications, mockInteractionFlags } from './mocks';

// ── LocalStorage Persistence ──
const STORAGE_KEY = 'vedacare_mock_store';

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Map arrays back to Maps
      return {
        patients: parsed.patients || [],
        codes: new Map(parsed.codes || []),
        prescriptions: new Map(parsed.prescriptions || []),
        medications: new Map(parsed.medications || []),
        doseLogs: new Map(parsed.doseLogs || []),
        alerts: parsed.alerts || [],
        counters: parsed.counters || { p: 100, pr: 100, m: 100, d: 100, a: 100 }
      };
    }
  } catch (e) {
    console.error('Failed to load mock state', e);
  }
  return null;
}

function saveState() {
  const state = {
    patients: _patients,
    codes: Array.from(_codes.entries()),
    prescriptions: Array.from(_prescriptions.entries()),
    medications: Array.from(_medications.entries()),
    doseLogs: Array.from(_doseLogs.entries()),
    alerts: _alerts,
    counters: { p: _nextPatientId, pr: _nextPrescriptionId, m: _nextMedicationId, d: _nextDoseLogId, a: _nextAlertId }
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ═══════════════════════════════════════════════════
//  Demo data seeding (Impactathon demo only)
// ═══════════════════════════════════════════════════

function seedDemoData() {
  const DEMO_PATIENT_ID = 1;
  const today = new Date().toISOString().split('T')[0];

  // Helper to get date string N days ago
  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  };

  // ── Patient ──
  const patients = [
    {
      id: DEMO_PATIENT_ID,
      name: 'Meera Shah',
      age: 68,
      gender: 'female',
      phone: '+91 98765 43210',
      preferred_language: 'hi',
      photo_url: null,
      connection_status: 'connected',
      accessibility_prefs: { text_size: 'large', voice_volume: 80 },
    },
  ];

  // ── Fixed connection code 219540 ──
  const codes = new Map();
  codes.set('219540', {
    patient_id: DEMO_PATIENT_ID,
    patient_name: 'Meera Shah',
    caregiver_name: 'Parthiv',
    used: false,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // ── Medications ──
  const demoMeds = [
    { id: 1, temp_id: 'm1', drug_name: 'Metformin', strength: '500mg', dose_per_intake: 1, form: 'tablet', frequency_per_day: 2, timing_slots: ['08:30', '20:30'], food_instruction: 'after_food', duration_days: 30, is_chronic: false, is_prn: false, special_instructions_en: 'Take twice a day, after food, for 30 days.', confidence: 'high', status: 'active', stock_remaining: 48, stock_status: 'ok', patient_id: DEMO_PATIENT_ID },
    { id: 2, temp_id: 'm2', drug_name: 'Amlodipine', strength: '5mg', dose_per_intake: 1, form: 'tablet', frequency_per_day: 1, timing_slots: ['08:30'], food_instruction: 'before_food', duration_days: 90, is_chronic: true, is_prn: false, special_instructions_en: 'Take once daily in the morning, before breakfast.', confidence: 'high', status: 'active', stock_remaining: 82, stock_status: 'ok', patient_id: DEMO_PATIENT_ID },
    { id: 3, temp_id: 'm3', drug_name: 'Aspirin', strength: '75mg', dose_per_intake: 1, form: 'tablet', frequency_per_day: 1, timing_slots: ['13:00'], food_instruction: 'after_food', duration_days: 90, is_chronic: true, is_prn: false, special_instructions_en: 'Take once daily after lunch.', confidence: 'high', status: 'active', stock_remaining: 6, stock_status: 'refill_soon', patient_id: DEMO_PATIENT_ID },
    { id: 4, temp_id: 'm4', drug_name: 'Pantoprazole', strength: '40mg', dose_per_intake: 1, form: 'tablet', frequency_per_day: 1, timing_slots: ['07:30'], food_instruction: 'before_food', duration_days: 14, is_chronic: false, is_prn: false, special_instructions_en: 'Take 30 minutes before breakfast on an empty stomach.', confidence: 'needs_review', status: 'active', stock_remaining: 10, stock_status: 'ok', patient_id: DEMO_PATIENT_ID },
    { id: 5, temp_id: 'm5', drug_name: 'Clopidogrel', strength: '75mg', dose_per_intake: 1, form: 'tablet', frequency_per_day: 1, timing_slots: ['20:30'], food_instruction: 'with_food', duration_days: 30, is_chronic: false, is_prn: false, special_instructions_en: 'Take once daily with dinner.', confidence: 'high', status: 'active', stock_remaining: 30, stock_status: 'ok', patient_id: DEMO_PATIENT_ID },
  ];
  const medications = new Map();
  medications.set(DEMO_PATIENT_ID, demoMeds);

  // ── Prescriptions ──
  const prescriptions = new Map();
  prescriptions.set(DEMO_PATIENT_ID, [
    { id: 5, doctor_name: 'Dr. Sharma', hospital_name: 'City Hospital', ai_confidence_overall: 94, status: 'active', uploaded_at: '2026-08-20T10:30:00', medication_count: 4, patient_id: DEMO_PATIENT_ID, patient_name: 'Meera Shah' },
    { id: 4, doctor_name: 'Dr. Patel', hospital_name: 'Gujarat Medical', ai_confidence_overall: 87, status: 'reviewed', uploaded_at: '2026-08-15T09:00:00', medication_count: 3, patient_id: DEMO_PATIENT_ID, patient_name: 'Meera Shah' },
  ]);

  // ── Dose Logs — 7 days of history + today ──
  const doseLogs = [];
  let doseLogId = 1;

  // Define daily schedule template
  const dailyTemplate = [
    { drug_name: 'Pantoprazole', strength: '40mg', dose_per_intake: 1, form: 'tablet', food_instruction: 'before_food', time: '07:30', medication_id: 4 },
    { drug_name: 'Metformin', strength: '500mg', dose_per_intake: 1, form: 'tablet', food_instruction: 'after_food', time: '08:30', medication_id: 1 },
    { drug_name: 'Amlodipine', strength: '5mg', dose_per_intake: 1, form: 'tablet', food_instruction: 'before_food', time: '08:30', medication_id: 2 },
    { drug_name: 'Aspirin', strength: '75mg', dose_per_intake: 1, form: 'tablet', food_instruction: 'after_food', time: '13:00', medication_id: 3 },
    { drug_name: 'Metformin', strength: '500mg', dose_per_intake: 1, form: 'tablet', food_instruction: 'after_food', time: '20:30', medication_id: 1 },
    { drug_name: 'Clopidogrel', strength: '75mg', dose_per_intake: 1, form: 'tablet', food_instruction: 'with_food', time: '20:30', medication_id: 5 },
  ];

  // Past 6 days: generate varied statuses
  const pastPatterns = [
    // day -6: all taken
    ['taken', 'taken', 'taken', 'taken', 'taken', 'taken'],
    // day -5: 1 delayed
    ['taken', 'taken', 'delayed', 'taken', 'taken', 'taken'],
    // day -4: all taken
    ['taken', 'taken', 'taken', 'taken', 'taken', 'taken'],
    // day -3: 1 missed
    ['taken', 'taken', 'taken', 'taken', 'missed', 'taken'],
    // day -2: all taken
    ['taken', 'taken', 'taken', 'taken', 'taken', 'taken'],
    // day -1 (yesterday): 1 missed (evening Metformin), 1 delayed
    ['taken', 'taken', 'delayed', 'taken', 'missed', 'taken'],
  ];

  for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
    const dateStr = daysAgo(dayOffset);
    const patternIdx = 6 - dayOffset;
    const pattern = pastPatterns[patternIdx];

    dailyTemplate.forEach((template, i) => {
      const status = pattern[i];
      let confirmed_at = null;
      if (status === 'taken') {
        // Taken ~5-10 min after scheduled
        const mins = 3 + Math.floor(Math.random() * 7);
        const [h, m] = template.time.split(':').map(Number);
        const cm = m + mins;
        confirmed_at = `${dateStr}T${String(h).padStart(2, '0')}:${String(cm % 60).padStart(2, '0')}:00`;
      } else if (status === 'delayed') {
        // Delayed ~30-45 min
        const mins = 30 + Math.floor(Math.random() * 15);
        const [h, m] = template.time.split(':').map(Number);
        const totalMins = h * 60 + m + mins;
        const ch = Math.floor(totalMins / 60);
        const cm = totalMins % 60;
        confirmed_at = `${dateStr}T${String(ch).padStart(2, '0')}:${String(cm).padStart(2, '0')}:00`;
      }

      doseLogs.push({
        dose_log_id: doseLogId++,
        drug_name: template.drug_name,
        strength: template.strength,
        dose_per_intake: template.dose_per_intake,
        form: template.form,
        food_instruction: template.food_instruction,
        image_url: null,
        audio_url: '/mock-audio.mp3',
        scheduled_time: `${dateStr}T${template.time}:00`,
        status: status,
        confirmed_at: confirmed_at,
        medication_id: template.medication_id,
      });
    });
  }

  // Today: Pantoprazole taken, Amlodipine taken, Metformin morning taken, rest upcoming
  const todayPatterns = ['taken', 'taken', 'taken', 'upcoming', 'upcoming', 'upcoming'];
  dailyTemplate.forEach((template, i) => {
    const status = todayPatterns[i];
    let confirmed_at = null;
    if (status === 'taken') {
      const mins = 3 + Math.floor(Math.random() * 7);
      const [h, m] = template.time.split(':').map(Number);
      const cm = m + mins;
      confirmed_at = `${today}T${String(h).padStart(2, '0')}:${String(cm % 60).padStart(2, '0')}:00`;
    }

    doseLogs.push({
      dose_log_id: doseLogId++,
      drug_name: template.drug_name,
      strength: template.strength,
      dose_per_intake: template.dose_per_intake,
      form: template.form,
      food_instruction: template.food_instruction,
      image_url: null,
      audio_url: '/mock-audio.mp3',
      scheduled_time: `${today}T${template.time}:00`,
      status: status,
      confirmed_at: confirmed_at,
      medication_id: template.medication_id,
    });
  });

  const doseLogsMap = new Map();
  doseLogsMap.set(DEMO_PATIENT_ID, doseLogs);

  // ── Alerts ──
  const alerts = [
    {
      id: 1,
      type: 'safety',
      severity: 'red',
      message: 'Potential interaction between Aspirin and Clopidogrel — increased bleeding risk.',
      medicine: 'Aspirin 75mg + Clopidogrel 75mg',
      time: '2026-08-20T10:30:00',
      patient_id: DEMO_PATIENT_ID,
      patient_name: 'Meera Shah',
      explanation: 'Both medications affect blood clotting. Taking them together may increase the risk of bleeding.',
      recommended_action: 'Confirm this combination with the prescribing doctor.',
      status: 'active',
    },
    {
      id: 2,
      type: 'missed_dose',
      severity: 'orange',
      message: 'Meera missed Metformin 500mg (evening dose) yesterday.',
      medicine: 'Metformin 500mg',
      time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      patient_id: DEMO_PATIENT_ID,
      patient_name: 'Meera Shah',
      explanation: 'The evening dose was not confirmed within the scheduled window.',
      recommended_action: 'Check with Meera about the missed dose and ensure she resumes the schedule.',
      status: 'active',
    },
    {
      id: 3,
      type: 'system',
      severity: 'yellow',
      message: 'Aspirin 75mg — only 6 tablets remaining. Refill soon.',
      medicine: 'Aspirin 75mg',
      time: new Date().toISOString(),
      patient_id: DEMO_PATIENT_ID,
      patient_name: 'Meera Shah',
      explanation: 'At current dosing, the remaining stock will last approximately 6 days.',
      recommended_action: 'Arrange for a refill before stock runs out.',
      status: 'active',
    },
  ];

  return {
    patients,
    codes,
    prescriptions,
    medications,
    doseLogs: doseLogsMap,
    alerts,
    counters: { p: 10, pr: 10, m: 10, d: doseLogId, a: 10 },
  };
}

// ── Initialize state ──
const initialState = loadState();

// If no saved state, seed demo data for the Impactathon demo
const _seed = initialState || seedDemoData();

// ── Patients ──
let _patients = _seed.patients;

// ── Connection codes
const _codes = _seed.codes;

// ── Prescriptions per patient
const _prescriptions = _seed.prescriptions;

// ── Medications per patient
const _medications = _seed.medications;

// ── Dose logs per patient
const _doseLogs = _seed.doseLogs;

// ── Alerts
let _alerts = _seed.alerts;

// ── Next IDs
let _nextPatientId = _seed.counters.p;
let _nextPrescriptionId = _seed.counters.pr;
let _nextMedicationId = _seed.counters.m;
let _nextDoseLogId = _seed.counters.d;
let _nextAlertId = _seed.counters.a;

// Persist initial seed if it was just generated
if (!initialState) {
  saveState();
}

// ═══════════════════════════════════════════════════
//  Patient CRUD
// ═══════════════════════════════════════════════════

export function storeAddPatient({ name, age, gender, phone }) {
  const id = _nextPatientId++;
  const patient = {
    id,
    name,
    age: parseInt(age) || 0,
    gender: gender || 'male',
    phone: phone || null,
    preferred_language: 'en',
    photo_url: null,
    connection_status: 'pending',
    accessibility_prefs: { text_size: 'large', voice_volume: 80 },
  };
  _patients.push(patient);
  _medications.set(id, []);
  _prescriptions.set(id, []);
  _doseLogs.set(id, []);
  saveState();
  return patient;
}

export function storeGetPatients() {
  return [..._patients];
}

export function storeGetPatient(patientId) {
  return _patients.find(p => p.id === patientId) || null;
}

export function storeConnectPatient(patientId) {
  const p = _patients.find(p => p.id === patientId);
  if (p) {
    p.connection_status = 'connected';
    saveState();
  }
}

// ═══════════════════════════════════════════════════
//  Connection codes
// ═══════════════════════════════════════════════════

export function storeGenerateCode(patientId) {
  const patient = _patients.find(p => p.id === patientId);
  if (!patient) return null;

  // Invalidate any previous codes for this patient
  for (const [code, data] of _codes.entries()) {
    if (data.patient_id === patientId) {
      data.used = true;
    }
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const codeData = {
    patient_id: patientId,
    patient_name: patient.name,
    caregiver_name: 'Caregiver', // Will be overridden from auth context
    used: false,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  _codes.set(code, codeData);
  saveState();
  return { success: true, code, expires_at: codeData.expires_at };
}

export function storeJoinWithCode(code) {
  const data = _codes.get(code);
  if (!data) {
    return { success: false, error: { code: 'NOT_FOUND', message: 'Invalid code. Please check and try again.' } };
  }
  if (data.used) {
    return { success: false, error: { code: 'CODE_ALREADY_USED', message: 'This code has already been used.' } };
  }
  if (new Date(data.expires_at) < new Date()) {
    return { success: false, error: { code: 'CODE_EXPIRED', message: 'This invitation code has expired. Ask your caregiver to generate a new code.' } };
  }
  // Don't mark used yet — that happens on confirm
  return {
    success: true,
    patient_id: data.patient_id,
    patient_name: data.patient_name,
    caregiver_name: data.caregiver_name,
  };
}

export function storeConfirmJoin(patientId, code) {
  // Mark code as used
  for (const [c, data] of _codes.entries()) {
    if (data.patient_id === patientId && !data.used) {
      data.used = true;
      break;
    }
  }
  // Mark patient as connected
  storeConnectPatient(patientId);
  return { success: true, device_token: 'mock-device-token-' + patientId };
}

// ═══════════════════════════════════════════════════
//  Prescriptions & Medications
// ═══════════════════════════════════════════════════

export function storeGetPatientMedications(patientId) {
  return _medications.get(patientId) || [];
}

export function storeGetAllMedications() {
  const all = [];
  for (const meds of _medications.values()) {
    all.push(...meds);
  }
  return all;
}

export function storeAddPrescription(patientId, prescription) {
  const list = _prescriptions.get(patientId) || [];
  list.push(prescription);
  _prescriptions.set(patientId, list);
  saveState();
}

export function storeGetPrescriptions(patientId) {
  return _prescriptions.get(patientId) || [];
}

export function storeActivateMedication(patientId, medication) {
  const id = _nextMedicationId++;
  const med = { ...medication, id, patient_id: patientId, status: 'active' };
  const list = _medications.get(patientId) || [];
  list.push(med);
  _medications.set(patientId, list);

  // Generate dose logs for today
  if (med.timing_slots) {
    const today = new Date().toISOString().split('T')[0];
    const logs = _doseLogs.get(patientId) || [];
    med.timing_slots.forEach(slot => {
      logs.push({
        dose_log_id: _nextDoseLogId++,
        drug_name: med.drug_name,
        strength: med.strength,
        dose_per_intake: med.dose_per_intake,
        form: med.form,
        food_instruction: med.food_instruction,
        image_url: null,
        audio_url: '/mock-audio.mp3',
        scheduled_time: `${today}T${slot}:00`,
        status: 'upcoming',
        confirmed_at: null,
        medication_id: id,
      });
    });
    _doseLogs.set(patientId, logs);
  }

  saveState();
  return med;
}

// ═══════════════════════════════════════════════════
//  Dose Logs / Today Schedule
// ═══════════════════════════════════════════════════

export function storeGetTodaySchedule(patientId) {
  const logs = _doseLogs.get(patientId) || [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const todayLogs = logs.filter(l => l.scheduled_time.startsWith(todayStr));

  const completed = todayLogs.filter(l => l.status === 'taken');
  const pending = todayLogs.filter(l => l.status !== 'taken');

  // Sort pending by time
  pending.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));

  const current_reminder = pending.length > 0 ? { ...pending[0], status: 'pending' } : null;
  const upcoming_today = pending.slice(1);

  return {
    current_reminder,
    upcoming_today,
    completed_today: completed,
    progress: { taken: completed.length, total: todayLogs.length },
  };
}

export function storeConfirmDose(doseLogId) {
  for (const logs of _doseLogs.values()) {
    const log = logs.find(l => l.dose_log_id === doseLogId);
    if (log) {
      log.status = 'taken';
      log.confirmed_at = new Date().toISOString();
      saveState();
      return { success: true, confirmed_at: log.confirmed_at };
    }
  }
  return { success: false };
}

// ═══════════════════════════════════════════════════
//  Schedule editing (caregiver)
// ═══════════════════════════════════════════════════

export function storeUpdateMedicationSchedule(medicationId, patientId, newTimingSlots) {
  const meds = _medications.get(patientId) || [];
  const med = meds.find(m => m.id === medicationId);
  if (!med) return false;

  med.timing_slots = newTimingSlots;

  // Regenerate dose logs for today with new times
  const logs = _doseLogs.get(patientId) || [];
  const today = new Date().toISOString().split('T')[0];

  // Remove today's unconfirmed logs for this medication
  const filtered = logs.filter(l => !(l.medication_id === medicationId && l.scheduled_time.startsWith(today) && l.status !== 'taken'));

  // Add new logs with updated times
  newTimingSlots.forEach(slot => {
    // Check if there's already a confirmed log at this time
    const alreadyTaken = logs.find(l => l.medication_id === medicationId && l.scheduled_time === `${today}T${slot}:00` && l.status === 'taken');
    if (!alreadyTaken) {
      filtered.push({
        dose_log_id: _nextDoseLogId++,
        drug_name: med.drug_name,
        strength: med.strength,
        dose_per_intake: med.dose_per_intake,
        form: med.form,
        food_instruction: med.food_instruction,
        image_url: null,
        audio_url: '/mock-audio.mp3',
        scheduled_time: `${today}T${slot}:00`,
        status: 'upcoming',
        confirmed_at: null,
        medication_id: medicationId,
      });
    }
  });

  _doseLogs.set(patientId, filtered);
  saveState();
  return true;
}

// ═══════════════════════════════════════════════════
//  History
// ═══════════════════════════════════════════════════

export function storeGetHistory(patientId) {
  const logs = _doseLogs.get(patientId) || [];
  // Sort most recent first
  const sorted = [...logs].sort((a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time));
  return {
    logs: sorted.map(l => ({
      medicine: `${l.drug_name} ${l.strength}`,
      scheduled_time: l.scheduled_time,
      status: l.status,
      confirmed_at: l.confirmed_at,
    })),
  };
}

// ═══════════════════════════════════════════════════
//  Dashboard
// ═══════════════════════════════════════════════════

export function storeGetDashboard(patientId) {
  const meds = _medications.get(patientId) || [];
  const logs = _doseLogs.get(patientId) || [];
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter(l => l.scheduled_time.startsWith(todayStr));
  const taken = todayLogs.filter(l => l.status === 'taken').length;
  const total = todayLogs.length;

  // Generate 7-day adherence based on actual logs
  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLogs = logs.filter(l => l.scheduled_time.startsWith(dateStr));
    weekly.push({
      date: dateStr,
      taken: dayLogs.filter(l => l.status === 'taken').length,
      total: dayLogs.length || (meds.length > 0 ? meds.reduce((sum, m) => sum + (m.frequency_per_day || 1), 0) : 0),
    });
  }

  // Build recent activity from logs + alerts
  const recent_activity = [];
  // Add dose events from today
  const todayCompletedLogs = todayLogs
    .filter(l => l.status === 'taken' && l.confirmed_at)
    .sort((a, b) => new Date(b.confirmed_at) - new Date(a.confirmed_at));
  todayCompletedLogs.forEach(l => {
    recent_activity.push({
      type: 'dose_confirmed',
      message: `Meera confirmed ${l.drug_name} ${l.strength}`,
      time: l.confirmed_at,
    });
  });
  // Add alert events
  _alerts.filter(a => a.patient_id === patientId || patientId === undefined).forEach(a => {
    recent_activity.push({
      type: 'alert_generated',
      message: a.message,
      time: a.time,
    });
  });
  // Sort by time desc
  recent_activity.sort((a, b) => new Date(b.time) - new Date(a.time));

  return {
    adherence_today: { taken, total, percent: total > 0 ? Math.round((taken / total) * 100) : 0 },
    weekly_adherence: weekly,
    alerts: _alerts.filter(a => a.patient_id === patientId || patientId === undefined),
    upcoming_appointments: [
      { purpose: 'Follow-up review', doctor_name: 'Dr. Sharma', appointment_datetime: '2026-08-27T11:00:00' },
    ],
    medications: meds.filter(m => m.status === 'active'),
    recent_activity: recent_activity.slice(0, 10),
  };
}

// ═══════════════════════════════════════════════════
//  Alerts
// ═══════════════════════════════════════════════════

export function storeGetAlerts(status = 'active') {
  if (status === 'all') return [..._alerts];
  return _alerts.filter(a => a.status === status);
}

export function storeReviewAlert(alertId) {
  const alert = _alerts.find(a => a.id === alertId);
  if (alert) {
    alert.status = 'reviewed';
    saveState();
  }
}

export function storeResolveAlert(alertId) {
  const alert = _alerts.find(a => a.id === alertId);
  if (alert) {
    alert.status = 'resolved';
    saveState();
  }
}

// ═══════════════════════════════════════════════════
//  Set caregiver name on codes (called from auth context)
// ═══════════════════════════════════════════════════

export function storeSetCaregiverName(name) {
  let changed = false;
  for (const data of _codes.values()) {
    if (data.caregiver_name === 'Caregiver') {
      data.caregiver_name = name;
      changed = true;
    }
  }
  if (changed) saveState();
}
