import { Routes, Route, Link, Outlet } from 'react-router-dom';
import { ProtectedRoute, useAuth } from './context/AuthContext';
import { AlertsProvider } from './context/AlertsContext';

import Landing from './auth/Landing';
import CaregiverSignup from './auth/CaregiverSignup';
import Login from './auth/Login';
import PatientJoin from './auth/PatientJoin';

import CaregiverLayout from './caregiver/CaregiverLayout';
import PatientLayout from './patient/PatientLayout';

import CaregiverDashboard from './caregiver/Dashboard';
import CaregiverPatients from './caregiver/Patients';
import CaregiverPrescriptions from './caregiver/Prescriptions';
import CaregiverMedicines from './caregiver/Medicines';
import CaregiverTimetable from './caregiver/Timetable';
import CaregiverAdherence from './caregiver/Adherence';
import ReviewExtractedPlan from './caregiver/ReviewExtractedPlan';
import CaregiverAlerts from './caregiver/Alerts';
import CaregiverSettings from './caregiver/Settings';
import PatientHome from './patient/Home';
import PatientMedicines from './patient/Medicines';
import PatientTimetable from './patient/Timetable';
import PatientStatus from './patient/Status';
import PatientHistory from './patient/History';
import PatientProfile from './patient/Profile';

export default function App() {
  return (
    <Routes>
      {/* Public / Auth Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<CaregiverSignup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<PatientJoin />} />

      {/* Caregiver Routes */}
      <Route path="/caregiver" element={
        <ProtectedRoute role="caregiver">
          <AlertsProvider>
            <CaregiverLayout />
          </AlertsProvider>
        </ProtectedRoute>
      }>
        <Route index element={<CaregiverDashboard />} />
        <Route path="patients" element={<CaregiverPatients />} />
        <Route path="medicines" element={<CaregiverMedicines />} />
        <Route path="timetable" element={<CaregiverTimetable />} />
        <Route path="adherence" element={<CaregiverAdherence />} />
        <Route path="prescriptions" element={<CaregiverPrescriptions />} />
        <Route path="prescriptions/review" element={<ReviewExtractedPlan />} />
        <Route path="alerts" element={<CaregiverAlerts />} />
        <Route path="settings" element={<CaregiverSettings />} />
      </Route>

      {/* Patient Routes */}
      <Route path="/patient" element={
        <ProtectedRoute role="patient">
          <PatientLayout />
        </ProtectedRoute>
      }>
        <Route index element={<PatientHome />} />
        <Route path="medicines" element={<PatientMedicines />} />
        <Route path="timetable" element={<PatientTimetable />} />
        <Route path="status" element={<PatientStatus />} />
        <Route path="history" element={<PatientHistory />} />
        <Route path="profile" element={<PatientProfile />} />
      </Route>
    </Routes>
  );
}
