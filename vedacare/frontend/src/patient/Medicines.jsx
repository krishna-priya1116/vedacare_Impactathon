import { useState, useEffect } from 'react';
import { getPatientMedications } from '../api/client';
import { useAuth } from '../context/AuthContext';
import MedicationCard from '../components/MedicationCard';
import { Pill } from 'lucide-react';

export default function Medicines() {
  const { user } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMeds() {
      try {
        const data = await getPatientMedications(user?.id);
        setMedications(data.medications);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMeds();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fade-in max-w-lg mx-auto p-4">
      <h1 className="page-title mb-6">My Medicines</h1>

      {medications.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center justify-center border-dashed border-2 border-border">
          <Pill size={48} className="text-text-secondary opacity-50 mb-4" />
          <h2 className="text-xl font-bold text-text mb-3">No Medicines Yet</h2>
          <p className="patient-text text-text-secondary leading-relaxed">
            Your prescribed medicines will appear here once your caregiver adds them.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {medications.map(med => (
            <MedicationCard 
              key={med.id}
              medication={med}
              showActions={false} 
              size="normal"
            />
          ))}
        </div>
      )}
    </div>
  );
}
