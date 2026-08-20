import { useState } from 'react';
import { useAlerts } from '../context/AlertsContext';
import SafetyAlertCard from '../components/SafetyAlertCard';
import { Bell, ShieldAlert, Clock, Info, CheckCircle2 } from 'lucide-react';

export default function Alerts() {
  const { alerts, loading, error, handleReviewAlert, handleResolveAlert, loadAlerts } = useAlerts();
  const [filter, setFilter] = useState('all'); // all, safety, missed_dose, system

  const handleReview = async (alert) => {
    // If it's a safety alert, mark as reviewed, else resolve
    if (alert.type === 'safety') {
      await handleReviewAlert(alert.id);
    } else {
      await handleResolveAlert(alert.id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 fade-in">
        <ShieldAlert size={48} className="text-danger mb-4" />
        <h3 className="text-xl font-bold text-text mb-2">Failed to load alerts</h3>
        <p className="text-text-secondary mb-4">{error}</p>
        <button onClick={loadAlerts} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);

  return (
    <div className="fade-in pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-2">Safety Center</h1>
        <p className="text-text-secondary">Monitor safety flags, missed doses, and system notifications.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button 
          onClick={() => setFilter('all')}
          className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline bg-white'}`}
        >
          All Alerts
        </button>
        <button 
          onClick={() => setFilter('safety')}
          className={`btn ${filter === 'safety' ? 'bg-danger text-white border-danger' : 'btn-outline bg-white'}`}
        >
          <ShieldAlert size={18} className={filter === 'safety' ? 'text-white' : 'text-danger'} />
          Safety
        </button>
        <button 
          onClick={() => setFilter('missed_dose')}
          className={`btn ${filter === 'missed_dose' ? 'bg-warning text-white border-warning' : 'btn-outline bg-white'}`}
        >
          <Clock size={18} className={filter === 'missed_dose' ? 'text-white' : 'text-warning'} />
          Missed Doses
        </button>
        <button 
          onClick={() => setFilter('system')}
          className={`btn ${filter === 'system' ? 'bg-primary text-white border-primary' : 'btn-outline bg-white'}`}
        >
          <Info size={18} className={filter === 'system' ? 'text-white' : 'text-primary'} />
          System
        </button>
      </div>

      {/* Alert List */}
      <div className="flex flex-col gap-4">
        {filteredAlerts.length === 0 ? (
          <div className="card p-12 flex flex-col items-center justify-center text-center text-text-secondary border-dashed">
            <CheckCircle2 size={48} className="text-success mb-4 opacity-50" />
            <h3 className="text-xl font-bold text-text mb-2">No active alerts</h3>
            <p>You're all caught up! There are no {filter !== 'all' ? filter.replace('_', ' ') : ''} alerts requiring your attention.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            if (alert.type === 'safety') {
              return (
                <SafetyAlertCard 
                  key={alert.id} 
                  flag={alert} 
                  onMarkReviewed={handleReview}
                />
              );
            }

            // Other alert types (missed dose, system)
            const style = alert.type === 'missed_dose' 
              ? { border: 'border-warning/30', bg: 'bg-warning-50/50', icon: <Clock size={22} className="text-warning" /> }
              : { border: 'border-primary/30', bg: 'bg-primary-50/50', icon: <Info size={22} className="text-primary" /> };

            return (
              <div key={alert.id} className={`card p-5 border ${style.border} ${style.bg} fade-in ${alert.status === 'reviewed' ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="mt-1 shrink-0">
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-text text-base">
                        {alert.type === 'missed_dose' ? 'Missed Dose' : 'System Notification'}
                      </h3>
                      <span className="text-xs text-text-muted bg-white px-2 py-0.5 rounded border border-border-light">
                        {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <p className="font-medium text-text mt-2">{alert.message}</p>
                    <p className="text-sm text-text-secondary mt-1 mb-3">{alert.explanation}</p>
                    
                    <div className="bg-white/60 p-3 rounded-lg border border-border-light/50 inline-block w-full sm:w-auto">
                      <p className="text-sm text-text-secondary">
                        <span className="font-semibold text-text">Recommended Action:</span> {alert.recommended_action}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border-light/50 flex gap-3">
                  <button 
                    onClick={() => handleReview(alert)}
                    disabled={alert.status === 'reviewed' || alert.status === 'resolved'}
                    className={`btn text-sm ${alert.status === 'reviewed' || alert.status === 'resolved' ? 'bg-success/10 text-success border border-success/20' : 'btn-outline bg-white'}`}
                  >
                    <CheckCircle2 size={16} />
                    {alert.status === 'reviewed' || alert.status === 'resolved' ? 'Resolved ✓' : 'Mark Resolved'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
