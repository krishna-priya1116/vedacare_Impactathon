import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPrescriptions, approveMedication, generatePrescriptionSummary } from '../api/client';
import { mockPrescription } from '../api/mocks';
import { ShieldAlert, Check, Edit2, AlertCircle, Volume2, FileText } from 'lucide-react';
import SafetyAlertCard from '../components/SafetyAlertCard';

export default function ReviewExtractedPlan() {
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  
  // Summary State
  const [summary, setSummary] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [generatingSummary, setGeneratingSummary] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    // In a real app, we'd fetch the specific prescription by ID from URL params.
    // Here we use the mock full prescription directly to simulate the state after upload.
    setTimeout(() => {
      setPrescription(mockPrescription);
      setLoading(false);
      fetchSummary(mockPrescription.medications);
    }, 500);
  }, []);

  const fetchSummary = async (medications) => {
    // We pass a mock patient name and default language (en) since settings are mocked right now
    const data = await generatePrescriptionSummary("Meera", "en", medications);
    if (data) {
      setSummary(data.summary_text);
      setAudioUrl(`http://localhost:8000${data.audio_url}`);
    }
    setGeneratingSummary(false);
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      // Call approve for each medication
      for (const med of prescription.medications) {
        await approveMedication(med.temp_id, med);
      }
      // Navigate to dashboard
      navigate('/caregiver');
    } catch (err) {
      console.error("Activation failed", err);
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-text-secondary">Extracting data from prescription...</p>
      </div>
    );
  }

  const lowConfidenceItems = prescription.medications.filter(m => m.confidence === 'needs_review');

  return (
    <div className="fade-in max-w-4xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-text">Review Care Plan</h1>
            <span className="badge bg-primary-50 text-primary font-bold">AI Extracted</span>
          </div>
          <p className="text-text-secondary">
            Prescription from {prescription.doctor_name} ({prescription.hospital_name})
          </p>
        </div>
        
        <button 
          onClick={handleActivate}
          disabled={activating}
          className="btn btn-xl btn-primary shadow-md"
        >
          {activating ? 'Activating...' : 'Activate Care Plan'}
        </button>
      </div>

      {/* Patient-Friendly Summary */}
      <div className="card p-6 mb-8 border-l-4 border-primary">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-text">
            <FileText className="text-primary" size={24} />
            Patient Summary
          </h2>
          <button 
            onClick={playAudio} 
            disabled={!audioUrl || generatingSummary}
            className="btn btn-outline flex items-center gap-2 hover:bg-primary/10"
          >
            <Volume2 size={20} className={audioUrl ? "text-primary" : "text-text-muted"} />
            Read Aloud
          </button>
        </div>
        
        {generatingSummary ? (
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-3 py-1">
              <div className="h-2 bg-text-muted rounded"></div>
              <div className="h-2 bg-text-muted rounded w-5/6"></div>
              <div className="h-2 bg-text-muted rounded w-4/6"></div>
            </div>
          </div>
        ) : (
          <p className="text-text font-medium leading-relaxed text-lg">
            {summary || "Summary could not be generated."}
          </p>
        )}
      </div>

      {/* Safety & Confidence Header */}
      {(prescription.interaction_flags.length > 0 || lowConfidenceItems.length > 0) && (
        <div className="card border-l-4 border-warning bg-warning-50/30 p-5 mb-8">
          <h3 className="font-bold text-text flex items-center gap-2 mb-2">
            <AlertCircle size={20} className="text-warning" />
            Review Required Before Activation
          </h3>
          <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
            {prescription.interaction_flags.length > 0 && (
              <li>{prescription.interaction_flags.length} potential interaction(s) detected.</li>
            )}
            {lowConfidenceItems.length > 0 && (
              <li>{lowConfidenceItems.length} medication(s) had low extraction confidence and need manual verification.</li>
            )}
          </ul>
        </div>
      )}

      {/* Interaction Flags */}
      {prescription.interaction_flags.length > 0 && (
        <div className="mb-10">
          <h2 className="section-title mb-4 flex items-center gap-2">
            <ShieldAlert size={20} className="text-danger" />
            Safety Alerts
          </h2>
          <div className="flex flex-col gap-4">
            {prescription.interaction_flags.map((flag, index) => (
              <SafetyAlertCard key={index} flag={flag} />
            ))}
          </div>
        </div>
      )}

      {/* Extracted Medications */}
      <div>
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Check size={20} className="text-primary" />
          Extracted Medications ({prescription.medications.length})
        </h2>
        
        <div className="flex flex-col gap-4">
          {prescription.medications.map((med, index) => (
            <div 
              key={index} 
              className={`card p-5 border-l-4 transition-all ${
                med.confidence === 'needs_review' 
                  ? 'border-warning shadow-md relative overflow-hidden' 
                  : 'border-success/60'
              }`}
            >
              {med.confidence === 'needs_review' && (
                <div className="absolute top-0 right-0 bg-warning text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  Needs Review
                </div>
              )}
              
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-bold text-lg text-text">{med.drug_name}</h3>
                    <span className="text-text-secondary font-medium">{med.strength}</span>
                    <span className="badge bg-bg text-text-secondary">{med.form}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Dose</p>
                      <p className="font-medium text-sm">{med.dose_per_intake} per intake</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Frequency</p>
                      <p className="font-medium text-sm">{med.frequency_per_day}x daily</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Timing</p>
                      <p className="font-medium text-sm">{med.timing_slots.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Food</p>
                      <p className="font-medium text-sm">{med.food_instruction.replace('_', ' ')}</p>
                    </div>
                  </div>
                  
                  <div className="bg-bg p-3 rounded-md border border-border-light">
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Patient Instructions (English)</p>
                    <p className="text-sm font-medium">{med.special_instructions_en}</p>
                  </div>
                </div>
                
                <div className="ml-4 mt-2">
                  <button className="btn btn-ghost text-primary hover:bg-primary-50">
                    <Edit2 size={18} /> Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
