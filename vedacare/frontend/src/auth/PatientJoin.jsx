import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { joinWithCode, confirmJoin } from '../api/client';
import { ArrowLeft } from 'lucide-react';

export default function PatientJoin() {
  const [code, setCode] = useState('');
  const [step, setStep] = useState(1); // 1: Enter code, 2: Confirm
  const [patientData, setPatientData] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { loginPatientDevice } = useAuth();
  const navigate = useNavigate();

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const response = await joinWithCode(code);
      if (response.success) {
        setPatientData(response);
        setStep(2);
      } else {
        setError(response.error?.message || 'Invalid code.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    setError('');
    setLoading(true);

    try {
      // Send confirmation to get device_token
      const response = await confirmJoin(patientData.patient_id, {
        preferred_language: 'en', // Default for now
        phone: null
      });
      
      if (response.success) {
        loginPatientDevice(response.device_token, patientData.patient_id, patientData.patient_name);
        navigate('/patient');
      } else {
        setError('Failed to complete setup.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg p-6 fade-in flex flex-col">
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center text-text-secondary hover:text-primary patient-text">
          <ArrowLeft size={24} className="mr-2" /> Back to start
        </Link>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md w-full card p-8 sm:p-10">
          
          {step === 1 && (
            <div className="fade-in">
              <div className="text-center mb-10">
                <h1 className="page-title text-3xl mb-3">Join as Patient</h1>
                <p className="patient-text text-text-secondary">
                  Enter the 6-digit code provided by your caregiver.
                </p>
              </div>

              {error && (
                <div className="bg-danger-50 text-danger p-4 rounded-xl patient-text mb-8 border border-danger/20">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="flex flex-col gap-8">
                <div>
                  <input
                    type="text"
                    className="input text-center text-4xl tracking-[0.5em] font-bold py-6 rounded-xl"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="------"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary patient-btn w-full"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? 'Checking...' : 'Continue'}
                </button>
              </form>
            </div>
          )}

          {step === 2 && (
            <div className="fade-in text-center">
              <div className="w-20 h-20 bg-primary-50 text-primary rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-bold">
                {patientData.patient_name.charAt(0)}
              </div>
              
              <h1 className="page-title text-3xl mb-4">
                Hello, {patientData.patient_name}
              </h1>
              
              <p className="patient-text text-text-secondary mb-10">
                You are connecting to VedaCare with your caregiver <strong>{patientData.caregiver_name}</strong>.
              </p>

              {error && (
                <div className="bg-danger-50 text-danger p-4 rounded-xl patient-text mb-8 border border-danger/20">
                  {error}
                </div>
              )}

              <button 
                onClick={handleConfirmJoin}
                className="btn btn-primary patient-btn w-full mb-4"
                disabled={loading}
              >
                {loading ? 'Connecting...' : 'Join & Continue'}
              </button>
              
              <button 
                onClick={() => setStep(1)}
                className="btn btn-ghost patient-btn w-full text-text-secondary"
                disabled={loading}
              >
                Not you? Go back
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
