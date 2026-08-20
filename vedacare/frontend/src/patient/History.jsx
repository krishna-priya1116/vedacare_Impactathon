import { useState, useEffect } from 'react';
import { getHistory } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Calendar } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function History() {
  const { user } = useAuth();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await getHistory(user?.id);
        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const logs = history?.logs || [];

  return (
    <div className="fade-in max-w-lg mx-auto p-4">
      <h1 className="page-title mb-6">History</h1>

      {logs.length === 0 ? (
        <div className="card p-10 text-center flex flex-col items-center justify-center border-dashed border-2 border-border">
          <Calendar size={48} className="text-text-secondary opacity-50 mb-4" />
          <h2 className="text-xl font-bold text-text mb-3">No History Yet</h2>
          <p className="patient-text text-text-secondary leading-relaxed">
            Your past medication logs will appear here.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex flex-col divide-y divide-border-light">
            {logs.map((log, index) => {
              const scheduledTime = new Date(log.scheduled_time);
              return (
                <div key={index} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-text text-lg">{log.medicine}</h3>
                    <p className="text-sm text-text-secondary mt-1">
                      {scheduledTime.toLocaleDateString()} at {scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <StatusBadge status={log.status} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
