import { useState, useEffect } from 'react';
import { getPatients, createPatient, generateCode } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { UserPlus, Copy, Check, Users } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'add' | 'pin'
  const [formData, setFormData] = useState({ name: '', age: '', gender: 'male', phone: '' });
  const [generatedPin, setGeneratedPin] = useState('');
  const [copied, setCopied] = useState(false);
  
  const location = useLocation();

  useEffect(() => {
    // If navigated here with ?action=add (e.g. from signup)
    if (location.search.includes('action=add')) {
      setView('add');
    }
    loadPatients();
  }, [location]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await getPatients();
      setPatients(data.patients);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      // 1. Create Patient
      const createRes = await createPatient(formData);
      if (createRes.success) {
        // 2. Generate PIN
        const pinRes = await generateCode(createRes.patient_id);
        if (pinRes.success) {
          setGeneratedPin(pinRes.code);
          setView('pin');
          loadPatients(); // Refresh list in background
        }
      }
    } catch (err) {
      console.error('Error adding patient', err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && view === 'list') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fade-in max-w-4xl mx-auto pb-8">
      {view === 'list' && (
        <>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text mb-2">Patients</h1>
              <p className="text-text-secondary">Manage your patients and their connections.</p>
            </div>
            <button onClick={() => setView('add')} className="btn btn-primary">
              <UserPlus size={18} /> Add Patient
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-col divide-y divide-border-light">
              {patients.map(p => (
                <div key={p.id} className="p-5 flex items-center justify-between hover:bg-bg transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-primary font-bold text-lg">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-text text-lg">{p.name}</h3>
                      <p className="text-sm text-text-secondary">Age {p.age} • {p.gender}</p>
                    </div>
                  </div>
                  <div>
                    <StatusBadge status={p.connection_status} />
                  </div>
                </div>
              ))}
              
              {patients.length === 0 && (
                <div className="p-12 flex flex-col items-center justify-center text-center text-text-secondary">
                  <Users size={48} className="mb-4 opacity-50" />
                  <p className="text-lg mb-4">No patients added yet.</p>
                  <button onClick={() => setView('add')} className="btn btn-outline">Add your first patient</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {view === 'add' && (
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-2">Add New Patient</h1>
            <p className="text-text-secondary">Enter patient details to generate a connection PIN.</p>
          </div>
          
          <form onSubmit={handleAddSubmit} className="card p-6 flex flex-col gap-5">
            <div>
              <label className="label">Patient Name</label>
              <input 
                type="text" 
                className="input" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Age</label>
                <input 
                  type="number" 
                  className="input" 
                  value={formData.age} 
                  onChange={e => setFormData({...formData, age: e.target.value})} 
                  required 
                />
              </div>
              <div>
                <label className="label">Gender</label>
                <select 
                  className="input"
                  value={formData.gender} 
                  onChange={e => setFormData({...formData, gender: e.target.value})}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Phone Number (Optional)</label>
              <input 
                type="tel" 
                className="input" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
            </div>

            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setView('list')} className="btn btn-ghost flex-1">Cancel</button>
              <button type="submit" className="btn btn-primary flex-1">Save & Generate PIN</button>
            </div>
          </form>
        </div>
      )}

      {view === 'pin' && (
        <div className="max-w-md mx-auto text-center fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-text mb-2">Connection Ready</h1>
            <p className="text-text-secondary">Share this 6-digit PIN with {formData.name}.</p>
          </div>
          
          <div className="card p-8 border-2 border-primary/30 bg-primary-50/20 mb-6">
            <p className="text-sm text-text-secondary mb-4 uppercase tracking-wider font-semibold">Patient Join Code</p>
            <div className="text-5xl font-bold tracking-[0.25em] text-primary mb-6">
              {generatedPin}
            </div>
            
            <button onClick={copyToClipboard} className="btn btn-outline w-full mb-2">
              {copied ? <><Check size={18}/> Copied!</> : <><Copy size={18}/> Copy PIN</>}
            </button>
          </div>
          
          <button onClick={() => { setView('list'); setFormData({ name: '', age: '', gender: 'male', phone: '' }); }} className="btn btn-primary w-full">
            Done
          </button>
        </div>
      )}
    </div>
  );
}
