import { useState, useEffect } from 'react';
import { getPatients, getHistory, getPatientMedications, updateMedicationSchedule } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { Clock, Calendar as CalendarIcon, Edit2, Check, X, Pill } from 'lucide-react';

export default function Timetable() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [history, setHistory] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingMed, setEditingMed] = useState(null); // { id, timing_slots }
  const [editSlots, setEditSlots] = useState([]);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data.patients);
      if (data.patients.length > 0) {
        selectPatient(data.patients[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const selectPatient = async (patientId) => {
    setSelectedPatient(patientId);
    setLoading(true);
    setEditingMed(null);
    try {
      const [historyData, medsData] = await Promise.all([
        getHistory(patientId, 'today'),
        getPatientMedications(patientId),
      ]);
      setHistory(historyData);
      setMedications(medsData.medications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (med) => {
    setEditingMed(med.id);
    setEditSlots([...(med.timing_slots || [])]);
  };

  const cancelEdit = () => {
    setEditingMed(null);
    setEditSlots([]);
  };

  const handleSlotChange = (index, value) => {
    const updated = [...editSlots];
    updated[index] = value;
    setEditSlots(updated);
  };

  const addSlot = () => {
    setEditSlots([...editSlots, '12:00']);
  };

  const removeSlot = (index) => {
    setEditSlots(editSlots.filter((_, i) => i !== index));
  };

  const saveSchedule = async (med) => {
    try {
      await updateMedicationSchedule(med.id, selectedPatient, editSlots);
      // Refresh data
      const [historyData, medsData] = await Promise.all([
        getHistory(selectedPatient, 'today'),
        getPatientMedications(selectedPatient),
      ]);
      setHistory(historyData);
      setMedications(medsData.medications);
      setEditingMed(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fade-in max-w-5xl mx-auto pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Timetable</h1>
          <p className="text-text-secondary">View dose logs and edit medication schedules.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-64 shrink-0">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Select Patient</h2>
          <div className="flex flex-col gap-2">
            {patients.map(p => (
              <button
                key={p.id}
                onClick={() => selectPatient(p.id)}
                className={`p-3 text-left rounded-lg transition-colors border ${
                  selectedPatient === p.id 
                    ? 'bg-primary-50 border-primary-200' 
                    : 'bg-white border-border-light hover:border-border'
                }`}
              >
                <div className="font-semibold text-text">{p.name}</div>
              </button>
            ))}
            {patients.length === 0 && (
              <p className="text-text-secondary text-sm p-3">No patients added yet.</p>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Schedule Editor */}
              {medications.length > 0 && (
                <div className="card p-6">
                  <h3 className="font-bold text-text text-lg mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-primary" />
                    Medication Schedules
                  </h3>
                  <p className="text-sm text-text-secondary mb-4">Click "Edit" to change when a patient should take their medication.</p>
                  <div className="flex flex-col gap-3">
                    {medications.map(med => (
                      <div key={med.id} className="p-4 bg-bg rounded-lg border border-border-light">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Pill size={20} className="text-primary shrink-0" />
                            <div className="min-w-0">
                              <h4 className="font-bold text-text truncate">{med.drug_name} {med.strength}</h4>
                              {editingMed !== med.id && (
                                <p className="text-sm text-text-secondary mt-1">
                                  {med.timing_slots?.join(', ') || 'No schedule set'}
                                </p>
                              )}
                            </div>
                          </div>
                          {editingMed !== med.id ? (
                            <button onClick={() => startEdit(med)} className="btn btn-outline text-sm py-1.5">
                              <Edit2 size={14} /> Edit
                            </button>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => saveSchedule(med)} className="btn btn-primary text-sm py-1.5">
                                <Check size={14} /> Save
                              </button>
                              <button onClick={cancelEdit} className="btn btn-ghost text-sm py-1.5 text-text-secondary">
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {editingMed === med.id && (
                          <div className="mt-4 pt-4 border-t border-border-light fade-in">
                            <label className="text-sm font-medium text-text-secondary block mb-2">Timing Slots</label>
                            <div className="flex flex-col gap-2">
                              {editSlots.map((slot, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <input
                                    type="time"
                                    className="input flex-1"
                                    value={slot}
                                    onChange={(e) => handleSlotChange(idx, e.target.value)}
                                  />
                                  {editSlots.length > 1 && (
                                    <button onClick={() => removeSlot(idx)} className="text-danger hover:bg-danger-50 p-2 rounded-md transition-colors">
                                      <X size={16} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button onClick={addSlot} className="btn btn-ghost text-sm text-primary border-dashed border border-primary/30 mt-1">
                                + Add Time Slot
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dose History */}
              {history?.logs?.length > 0 ? (
                <div className="card overflow-hidden">
                  <div className="bg-bg px-5 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-text flex items-center gap-2">
                      <CalendarIcon size={18} className="text-text-secondary" />
                      Dose Logs
                    </h3>
                  </div>
                  <div className="flex flex-col divide-y divide-border-light">
                    {history.logs.map((log, idx) => {
                      const scheduledTime = new Date(log.scheduled_time);
                      const confirmedTime = log.confirmed_at ? new Date(log.confirmed_at) : null;
                      
                      return (
                        <div key={idx} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-bg/50 transition-colors">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary-50 rounded-full flex flex-col items-center justify-center text-primary shrink-0">
                              <span className="text-xs font-bold">
                                {scheduledTime.getHours().toString().padStart(2, '0')}:{scheduledTime.getMinutes().toString().padStart(2, '0')}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-bold text-text text-lg">{log.medicine}</h4>
                              {confirmedTime ? (
                                <p className="text-sm text-text-secondary mt-1 flex items-center gap-1">
                                  <Clock size={14} /> Confirmed at {confirmedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              ) : (
                                <p className="text-sm text-text-secondary mt-1 flex items-center gap-1">
                                  <Clock size={14} /> Scheduled
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <StatusBadge status={log.status} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="card p-12 text-center flex flex-col items-center justify-center">
                  <Clock size={48} className="text-text-secondary opacity-50 mb-4" />
                  <h3 className="text-xl font-bold text-text mb-2">No Dose Logs</h3>
                  <p className="text-text-secondary mb-6">
                    {medications.length === 0 
                      ? 'Add prescriptions to generate a medication schedule.' 
                      : 'No dose logs recorded for this patient yet.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
