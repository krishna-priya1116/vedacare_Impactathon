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

const initialState = loadState();

// ── Patients ──
let _patients = initialState ? initialState.patients : [];

// ── Connection codes
const _codes = initialState ? initialState.codes : new Map();

// ── Prescriptions per patient
const _prescriptions = initialState ? initialState.prescriptions : new Map();

// ── Medications per patient
const _medications = initialState ? initialState.medications : new Map();

// ── Dose logs per patient
const _doseLogs = initialState ? initialState.doseLogs : new Map();

// ── Alerts
let _alerts = initialState ? initialState.alerts : [];

// ── Next IDs
let _nextPatientId = initialState ? initialState.counters.p : 100;
let _nextPrescriptionId = initialState ? initialState.counters.pr : 100;
let _nextMedicationId = initialState ? initialState.counters.m : 100;
let _nextDoseLogId = initialState ? initialState.counters.d : 100;
let _nextAlertId = initialState ? initialState.counters.a : 100;

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
  return {
    logs: logs.map(l => ({
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

  // Generate 7-day adherence (mock-ish but based on actual logs)
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

  return {
    adherence_today: { taken, total, percent: total > 0 ? Math.round((taken / total) * 100) : 0 },
    weekly_adherence: weekly,
    alerts: _alerts.filter(a => a.patient_id === patientId || patientId === undefined),
    upcoming_appointments: [],
    medications: meds.filter(m => m.status === 'active'),
    recent_activity: [],
  };
}

// ═══════════════════════════════════════════════════
//  Alerts
// ═══════════════════════════════════════════════════

export function storeGetAlerts(status = 'active') {
  if (status === 'all') return [..._alerts];
  return _alerts.filter(a => a.status === status);
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
