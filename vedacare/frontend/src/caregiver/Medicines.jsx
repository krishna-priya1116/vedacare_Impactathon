import { useState, useEffect } from 'react';
import { getPatients, getPatientMedications } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { Pill, AlertTriangle, Settings, Plus } from 'lucide-react';

export default function Medicines() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

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
    try {
      const data = await getPatientMedications(patientId);
      setMedications(data.medications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in max-w-5xl mx-auto pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Medicines</h1>
          <p className="text-text-secondary">View and manage active medications for your patients.</p>
        </div>
        <button className="btn btn-primary whitespace-nowrap">
          <Plus size={18} /> Add Medication
        </button>
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
                <div className="text-xs text-text-secondary mt-1">Age {p.age}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : medications.length > 0 ? (
            <div className="flex flex-col gap-4">
              {medications.map(med => (
                <div key={med.id} className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary shrink-0 mt-1">
                      <Pill size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-text flex items-center gap-2">
                        {med.drug_name} {med.strength}
                        {med.stock_status === 'refill_soon' && (
                          <span title="Refill Soon" className="text-warning"><AlertTriangle size={16} /></span>
                        )}
                      </h3>
                      <p className="text-text-secondary text-sm mt-1">
                        Take {med.dose_per_intake} {med.form}, {med.frequency_per_day}x a day
                      </p>
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <StatusBadge status={med.status} />
                        <span className="badge bg-bg text-text-secondary text-xs">
                          {med.stock_remaining} left
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex md:flex-col gap-2 shrink-0 self-start md:self-auto w-full md:w-auto">
                    <button className="btn btn-outline text-sm py-2 flex-1 md:flex-none">
                      <Settings size={16} /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center flex flex-col items-center justify-center">
              <Pill size={48} className="text-text-secondary opacity-50 mb-4" />
              <h3 className="text-xl font-bold text-text mb-2">No Active Medications</h3>
              <p className="text-text-secondary mb-6">This patient has no active medications right now.</p>
              <button className="btn btn-primary">Upload Prescription</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
