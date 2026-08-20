import { useState, useEffect } from 'react';
import { getTodaySchedule } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Clock, CheckCircle2, CircleDashed, Pill } from 'lucide-react';

export default function Timetable() {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const { completed_today = [], current_reminder, upcoming_today = [], progress } = schedule || {};
  const hasMedications = progress && progress.total > 0;

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fade-in max-w-lg mx-auto p-4">
      <h1 className="page-title mb-6">Today's Schedule</h1>

      {!hasMedications ? (
        <div className="card p-10 text-center flex flex-col items-center justify-center border-dashed border-2 border-border">
          <Pill size={48} className="text-text-secondary opacity-50 mb-4" />
          <h2 className="text-xl font-bold text-text mb-3">No Schedule Yet</h2>
          <p className="patient-text text-text-secondary leading-relaxed max-w-xs mx-auto">
            Your caregiver hasn't set up your medication schedule yet. It will appear here once they add your prescriptions.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Completed */}
          {completed_today.map(item => (
            <div key={item.dose_log_id} className="card p-4 flex items-center gap-4 opacity-70 bg-success-50/50">
              <div className="w-12 flex flex-col items-center justify-center shrink-0">
                <span className="font-bold text-text-secondary">{formatTime(item.scheduled_time)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-text truncate">{item.drug_name} {item.strength}</h3>
                <p className="text-sm text-text-secondary">Taken at {formatTime(item.confirmed_at)}</p>
              </div>
              <div className="text-success">
                <CheckCircle2 size={28} />
              </div>
            </div>
          ))}

          {/* Current (Now) */}
          {current_reminder && (
            <div className="card p-5 flex items-center gap-4 border-2 border-primary bg-primary-50/30 shadow-md transform scale-[1.02]">
              <div className="w-12 flex flex-col items-center justify-center shrink-0">
                <span className="font-bold text-primary text-lg">{formatTime(current_reminder.scheduled_time)}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Now</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-text text-xl truncate">{current_reminder.drug_name}</h3>
                <p className="text-primary font-medium">{current_reminder.strength}</p>
              </div>
              <div className="text-warning animate-pulse">
                <Clock size={32} />
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcoming_today.map(item => (
            <div key={item.dose_log_id} className="card p-4 flex items-center gap-4 bg-white/60">
              <div className="w-12 flex flex-col items-center justify-center shrink-0">
                <span className="font-bold text-text-secondary">{formatTime(item.scheduled_time)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-text truncate">{item.drug_name} {item.strength}</h3>
                <p className="text-sm text-text-muted">{item.food_instruction?.replace(/_/g, ' ')}</p>
              </div>
              <div className="text-border">
                <CircleDashed size={28} />
              </div>
            </div>
          ))}

          {completed_today.length === 0 && !current_reminder && upcoming_today.length === 0 && (
            <div className="text-center p-8 text-text-secondary">
              No medications scheduled for today.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
