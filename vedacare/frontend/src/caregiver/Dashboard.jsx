import { useState, useEffect } from 'react';
import { getDashboard, getPatients } from '../api/client';
import { useAuth } from '../context/AuthContext';
import SafetyAlertCard from '../components/SafetyAlertCard';
import StatusBadge from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import { Activity, Bell, Calendar, UserPlus, Upload, ShieldCheck, Users } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [patientsData] = await Promise.all([
          getPatients(),
        ]);
        setPatients(patientsData.patients);

        if (patientsData.patients.length > 0) {
          const dashData = await getDashboard(patientsData.patients[0].id);
          setData(dashData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // No patients yet — show onboarding prompt
  if (patients.length === 0) {
    return (
      <div className="fade-in pb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">Welcome, {user?.name}</h1>
          <p className="text-text-secondary">Let's get started by adding your first patient.</p>
        </div>

        <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-border max-w-lg mx-auto">
          <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mb-4">
            <Users size={40} className="text-primary opacity-60" />
          </div>
          <h2 className="text-2xl font-bold text-text mb-3">No Patients Yet</h2>
          <p className="text-text-secondary mb-8 max-w-sm">
            Add a patient to start managing their medications, schedules, and health alerts.
          </p>
          <Link to="/caregiver/patients?action=add" className="btn btn-primary btn-lg">
            <UserPlus size={20} /> Add Your First Patient
          </Link>
        </div>
      </div>
    );
  }

  const adherence_today = data?.adherence_today || { taken: 0, total: 0, percent: 0 };
  const weekly_adherence = data?.weekly_adherence || [];
  const alerts = data?.alerts || [];
  const recent_activity = data?.recent_activity || [];
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const safetyAlerts = activeAlerts.filter(a => a.type === 'safety');

  // Determine IST-based greeting
  const istHour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
  const h = parseInt(istHour, 10);
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';

  return (
    <div className="fade-in pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">{greeting}, {user?.name}</h1>
          <p className="text-text-secondary">Here's what's happening with your patients today.</p>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 md:overflow-visible">
          <Link to="/caregiver/prescriptions" className="btn btn-primary whitespace-nowrap shadow-sm">
            <Upload size={18} /> Upload Prescription
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Adherence Widget */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title flex items-center gap-2">
              <Activity size={20} className="text-primary" />
              Weekly Adherence Trend
            </h2>
            <div className="text-right">
              <p className="text-sm text-text-secondary">Today's Rate</p>
              <p className="text-2xl font-bold text-primary">{adherence_today.percent}%</p>
            </div>
          </div>
          
          {weekly_adherence.length > 0 && weekly_adherence.some(w => w.total > 0) ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekly_adherence} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTaken" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, { weekday: 'short' })} axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-secondary)'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--color-text-secondary)'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                  />
                  <Area type="monotone" dataKey="taken" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorTaken)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-text-secondary">
              <p>No adherence data yet. Upload a prescription to get started.</p>
            </div>
          )}
        </div>

        {/* Patients Overview */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">My Patients</h2>
            <Link to="/caregiver/patients" className="text-primary text-sm font-medium hover:underline">View All</Link>
          </div>
          
          <div className="flex-1 flex flex-col gap-4">
            {patients.map(patient => (
              <div key={patient.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-bg transition-colors border border-transparent hover:border-border-light cursor-pointer">
                <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-primary font-bold shrink-0">
                  {patient.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text truncate">{patient.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={patient.connection_status} />
                  </div>
                </div>
              </div>
            ))}
            
            <Link to="/caregiver/patients?action=add" className="mt-auto btn btn-outline w-full border-dashed border-2 text-text-secondary hover:text-primary hover:border-primary">
              <UserPlus size={18} /> Add Patient
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Needed (Alerts) */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title flex items-center gap-2">
              <Bell size={20} className={activeAlerts.length > 0 ? "text-warning" : "text-text-secondary"} />
              Action Needed
            </h2>
            {activeAlerts.length > 0 && (
              <span className="badge bg-danger-50 text-danger font-bold px-2 py-1">{activeAlerts.length}</span>
            )}
          </div>
          
          {activeAlerts.length > 0 ? (
            <div className="flex flex-col gap-4">
              {safetyAlerts.map(alert => (
                <SafetyAlertCard key={alert.id} flag={alert} />
              ))}
              
              {activeAlerts.filter(a => a.type !== 'safety').slice(0, 2).map(alert => (
                <div key={alert.id} className="card p-4 border-l-4 border-warning">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-text">{alert.patient_name}</h3>
                    <span className="text-xs text-text-secondary">{new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-text-secondary mb-3">{alert.message}</p>
                  <button className="text-sm text-primary font-medium hover:underline">Review Details</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center text-text-secondary h-48 border-dashed">
              <ShieldCheck size={32} className="text-success mb-3 opacity-50" />
              <p>All clear! No pending alerts.</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="section-title flex items-center gap-2 mb-4">
            <Calendar size={20} className="text-text-secondary" />
            Recent Activity
          </h2>
          
          {recent_activity.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="flex flex-col divide-y divide-border-light">
                {recent_activity.map((activity, index) => (
                  <div key={index} className="p-4 hover:bg-bg transition-colors flex gap-4">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text">{activity.message}</p>
                      <p className="text-xs text-text-muted mt-1">
                        {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center text-text-secondary h-48 border-dashed">
              <Calendar size={32} className="text-text-secondary mb-3 opacity-50" />
              <p>No activity yet. Start by uploading a prescription.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
