// API client — uses the dynamic in-memory store for now.
// On Day 6, replace store calls with real fetch() calls to backend.
// Each function matches an API_CONTRACT.md endpoint.

import {
  storeAddPatient,
  storeGetPatients,
  storeGetPatient,
  storeGenerateCode,
  storeJoinWithCode,
  storeConfirmJoin,
  storeGetPatientMedications,
  storeGetAllMedications,
  storeAddPrescription,
  storeGetPrescriptions,
  storeActivateMedication,
  storeGetTodaySchedule,
  storeConfirmDose,
  storeGetDashboard,
  storeGetHistory,
  storeGetAlerts,
  storeSetCaregiverName,
  storeUpdateMedicationSchedule,
} from './store';

import {
  mockAuthResponses,
  mockPrescription,
  mockInteractionFlags,
} from './mocks';

const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

// ===== Auth & Onboarding =====

export async function signup({ name, contact, password }) {
  await delay();
  storeSetCaregiverName(name);
  return mockAuthResponses.signup;
}

export async function login({ contact, password }) {
  await delay();
  if (contact.toLowerCase().includes('patient')) {
    return mockAuthResponses.login_patient;
  }
  return mockAuthResponses.login_caregiver;
}

export async function forgotPassword({ contact }) {
  await delay();
  return mockAuthResponses.forgot_password;
}

export async function resetPassword({ contact, otp, new_password }) {
  await delay();
  return mockAuthResponses.reset_password;
}

// ===== Patient & Connection =====

export async function createPatient(patientData) {
  await delay();
  const patient = storeAddPatient(patientData);
  return { success: true, patient_id: patient.id };
}

export async function generateCode(patientId) {
  await delay();
  return storeGenerateCode(patientId);
}

export async function joinWithCode(code) {
  await delay(600);
  return storeJoinWithCode(code);
}

export async function confirmJoin(patientId, { preferred_language, phone }) {
  await delay();
  return storeConfirmJoin(patientId);
}

export async function getPatient(patientId) {
  await delay(200);
  return storeGetPatient(patientId);
}

export async function getPatients() {
  await delay(300);
  return { patients: storeGetPatients() };
}

// ===== Prescriptions =====

export async function uploadPrescription(formData) {
  await delay(2000); // Simulate AI processing time
  return mockPrescription;
}

export async function getPrescriptions(patientId) {
  await delay(300);
  const prescriptions = storeGetPrescriptions(patientId);
  return { prescriptions };
}

export async function approveMedication(tempIdOrId, medicationData, patientId) {
  await delay();
  if (patientId) {
    const med = storeActivateMedication(patientId, medicationData);
    return { success: true, medication_id: med.id };
  }
  return { success: true, medication_id: typeof tempIdOrId === 'string' ? Date.now() : tempIdOrId };
}

export async function markInteractionReviewed(flagId) {
  await delay();
  return { success: true };
}

// ===== Medications =====

export async function getPatientMedications(patientId) {
  await delay(300);
  const meds = patientId ? storeGetPatientMedications(patientId) : storeGetAllMedications();
  return { medications: meds };
}

export async function getMedicationAudio(medicationId, lang = 'en') {
  await delay(200);
  return { audio_url: '/mock-audio.mp3' };
}

export async function updateMedication(id, data) {
  await delay();
  return { success: true };
}

export async function deleteMedication(id) {
  await delay();
  return { success: true };
}

export async function pauseMedication(id) {
  await delay();
  return { success: true };
}

// ===== Today / Timetable =====

export async function getTodaySchedule(patientId) {
  await delay(300);
  return storeGetTodaySchedule(patientId);
}

export async function confirmDose(doseLogId, { confirmation_method }) {
  await delay();
  return storeConfirmDose(doseLogId);
}

export async function snoozeDose(doseLogId) {
  await delay();
  return { success: true, new_reminder_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() };
}

// ===== Caregiver Dashboard =====

export async function getDashboard(patientId) {
  await delay(400);
  return storeGetDashboard(patientId);
}

export async function getHistory(patientId, range = 'today') {
  await delay(300);
  return storeGetHistory(patientId);
}

// ===== Alerts =====

export async function getAlerts(caregiverId, status = 'active') {
  await delay(300);
  return { alerts: storeGetAlerts(status) };
}

export async function reviewAlert(alertId) {
  await delay();
  return { success: true };
}

export async function resolveAlert(alertId) {
  await delay();
  return { success: true };
}

// ===== Audit Log =====

export async function getAuditLog(patientId) {
  await delay(300);
  return { entries: [] };
}

// ===== Schedule editing =====

export async function updateMedicationSchedule(medicationId, patientId, newTimingSlots) {
  await delay();
  const success = storeUpdateMedicationSchedule(medicationId, patientId, newTimingSlots);
  return { success };
}
