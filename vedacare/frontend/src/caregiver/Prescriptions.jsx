import { useState, useEffect } from 'react';
import { getPrescriptions } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { Upload, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPrescriptions(1); // Mock patient ID
        setPrescriptions(data.prescriptions);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpload = () => {
    // Simulate upload and AI processing delay, then redirect to review screen
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      navigate('/caregiver/prescriptions/review');
    }, 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fade-in max-w-5xl mx-auto pb-8">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Prescriptions</h1>
          <p className="text-text-secondary">Upload and manage care plans.</p>
        </div>
      </div>

      {/* Upload Area */}
      <div className="card p-8 mb-10 border-dashed border-2 border-primary/40 bg-primary-50/20 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-primary-50 text-primary rounded-full flex items-center justify-center mb-4">
          <Upload size={28} />
        </div>
        <h2 className="text-xl font-bold text-text mb-2">Upload New Prescription</h2>
        <p className="text-text-secondary mb-6 max-w-md">
          Take a photo or upload a PDF. Our AI will automatically extract medications, check for interactions, and prepare a schedule for your review.
        </p>
        <button 
          onClick={handleUpload} 
          disabled={uploading}
          className="btn btn-xl btn-primary min-w-[200px]"
        >
          {uploading ? (
            <><Loader2 className="animate-spin" size={20} /> Processing AI...</>
          ) : (
            'Select File to Upload'
          )}
        </button>
      </div>

      {/* History */}
      <div>
        <h2 className="section-title mb-4">Prescription History</h2>
        
        <div className="card overflow-hidden">
          <div className="flex flex-col divide-y divide-border-light">
            {prescriptions.map(rx => (
              <div key={rx.id} className="p-4 md:p-5 hover:bg-bg transition-colors flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer group">
                <div className="w-12 h-12 bg-bg rounded-lg border border-border flex items-center justify-center shrink-0 text-text-secondary group-hover:text-primary transition-colors">
                  <FileText size={24} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <h3 className="font-semibold text-text truncate">
                      {rx.doctor_name} ({rx.hospital_name})
                    </h3>
                    <StatusBadge status={rx.status} />
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-text-secondary">
                    <span>{new Date(rx.uploaded_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{rx.patient_name}</span>
                    <span>•</span>
                    <span>{rx.medication_count} medications</span>
                  </div>
                </div>
                
                <div className="text-text-muted hidden sm:block">
                  <ChevronRight size={20} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
