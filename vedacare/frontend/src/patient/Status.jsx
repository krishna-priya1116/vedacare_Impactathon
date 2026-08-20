import { useState, useEffect } from 'react';
import { getTodaySchedule } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

export default function Status() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const data = await getTodaySchedule(user?.id);
        setSchedule(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const { progress } = schedule || {};
  const hasMedications = progress && progress.total > 0;
  const percentComplete = hasMedications ? Math.round((progress.taken / progress.total) * 100) : 0;

  return (
    <div className="fade-in max-w-lg mx-auto p-4">
      <h1 className="page-title mb-6">Today's Status</h1>

      {!hasMedications ? (
        <div className="card p-10 text-center flex flex-col items-center justify-center border-dashed border-2 border-border">
          <Activity size={48} className="text-text-secondary opacity-50 mb-4" />
          <h2 className="text-xl font-bold text-text mb-3">No Data</h2>
          <p className="patient-text text-text-secondary leading-relaxed">
            There's no status to show because you have no medications scheduled for today.
          </p>
        </div>
      ) : (
        <div className="card p-6 flex flex-col items-center justify-center text-center">
          <Activity size={48} className="text-primary mb-4" />
          <p className="text-lg text-text-secondary mb-2">You have completed</p>
          <p className="text-6xl font-bold text-primary mb-4">{percentComplete}%</p>
          <p className="patient-text text-text mb-6">
            of your medications today ({progress.taken} out of {progress.total})
          </p>
          
          <div className="h-4 w-full bg-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
