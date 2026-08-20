import { useState, useEffect } from 'react';
import { getTodaySchedule, confirmDose } from '../api/client';
import { useAuth } from '../context/AuthContext';
import MedicationCard from '../components/MedicationCard';
import { Heart, Pill } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const data = await getTodaySchedule(user?.id);
      setSchedule(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkTaken = async (medication) => {
    try {
      await confirmDose(medication.dose_log_id, { confirmation_method: 'button' });
      setTimeout(loadSchedule, 1000); 
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const { current_reminder, progress, upcoming_today = [], completed_today = [] } = schedule || {};
  const hasMedications = progress && progress.total > 0;
  const percentComplete = hasMedications ? Math.round((progress.taken / progress.total) * 100) : 0;

  // Determine greeting based on IST (Asia/Kolkata)
  const istHour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
  const h = parseInt(istHour, 10);
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';

  return (
    <div className="fade-in max-w-lg mx-auto p-4">
      {/* Greeting */}
      <div className="mb-8 mt-2 text-center">
        <h1 className="text-3xl font-bold text-text mb-2">{greeting}, {user?.name || 'there'}</h1>
        {hasMedications ? (
          <p className="patient-text text-text-secondary">Here is your medication for today.</p>
        ) : (
          <p className="patient-text text-text-secondary">Welcome to VedaCare!</p>
        )}
      </div>

      {/* If no medications have been prescribed yet */}
      {!hasMedications && (
        <div className="card p-10 text-center flex flex-col items-center justify-center border-dashed border-2 border-border">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-4">
            <Pill size={40} className="text-primary opacity-60" />
          </div>
          <h2 className="text-xl font-bold text-text mb-3">No Medications Yet</h2>
          <p className="patient-text text-text-secondary leading-relaxed max-w-xs mx-auto">
            Your caregiver hasn't added any prescriptions yet. Once they do, your medication schedule will appear here.
          </p>
          <div className="flex items-center gap-2 mt-6 text-primary font-medium">
            <Heart size={18} />
            <span>We'll notify you when it's ready</span>
          </div>
        </div>
      )}

      {/* Progress Bar — only show when there are medications */}
      {hasMedications && (
        <>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-border-light mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-text">Today's Progress</span>
              <span className="text-primary font-bold">{progress.taken} / {progress.total}</span>
            </div>
            <div className="h-3 w-full bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-out"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>

          {/* Current/Next Medicine */}
          {current_reminder ? (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-text mb-4 pl-2 border-l-4 border-primary">Take Now</h2>
              <MedicationCard 
                medication={current_reminder} 
                size="large" 
                onMarkTaken={handleMarkTaken}
                className="border-2 border-primary shadow-md"
              />
            </div>
          ) : (
            <div className="card p-10 text-center flex flex-col items-center justify-center bg-success-50 border-success/20">
              <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mb-4 text-4xl">
                🎉
              </div>
              <h2 className="text-2xl font-bold text-text mb-2">All Done!</h2>
              <p className="patient-text text-text-secondary">You've taken all your medications for now. Great job!</p>
            </div>
          )}

          {/* Upcoming */}
          {upcoming_today.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-bold text-text mb-3 pl-2 border-l-4 border-border">Coming Up</h2>
              <div className="flex flex-col gap-3">
                {upcoming_today.map(item => {
                  const time = new Date(item.scheduled_time);
                  return (
                    <div key={item.dose_log_id} className="card p-4 flex items-center gap-4 bg-white/60">
                      <div className="w-12 text-center shrink-0">
                        <span className="font-bold text-text-secondary text-sm">
                          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-text truncate">{item.drug_name} {item.strength}</h3>
                        <p className="text-sm text-text-muted">{item.food_instruction?.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
