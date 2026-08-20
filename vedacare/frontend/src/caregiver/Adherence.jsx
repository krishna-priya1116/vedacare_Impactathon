import { useState, useEffect } from 'react';
import { getPatients, getDashboard } from '../api/client';
import { TrendingUp, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Adherence() {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const res = await getPatients();
      setPatients(res.patients);
      if (res.patients.length > 0) {
        selectPatient(res.patients[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const selectPatient = async (patientId) => {
    setSelectedPatient(patientId);
    setLoading(true);
    try {
      // In a real app we'd have a specific adherence endpoint,
      // here we reuse the dashboard mock which contains adherence metrics
      const dashData = await getDashboard(patientId);
      setData(dashData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in max-w-5xl mx-auto pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Adherence Reports</h1>
          <p className="text-text-secondary">Track how well patients are following their treatment plans.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-64 shrink-0">
          <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Select Patient</h2>
          <div className="flex flex-col gap-2">
            {patients.map(p => (
              <button
                key={p.id}
                onClick={() => selectPatient(p.id)}
                className={`p-3 text-left rounded-lg transition-colors border ${
                  selectedPatient === p.id 
                    ? 'bg-primary-50 border-primary-200' 
                    : 'bg-white border-border-light hover:border-border'
                }`}
              >
                <div className="font-semibold text-text">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : data ? (
            <div className="flex flex-col gap-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-6 flex flex-col items-center justify-center text-center">
                  <Activity size={32} className="text-primary mb-2" />
                  <p className="text-sm text-text-secondary">Today's Rate</p>
                  <p className="text-4xl font-bold text-primary mt-1">{data.adherence_today.percent}%</p>
                  <p className="text-sm text-text-secondary mt-2">
                    {data.adherence_today.taken} of {data.adherence_today.total} doses taken
                  </p>
                </div>
                
                <div className="card p-6 flex flex-col items-center justify-center text-center">
                  <TrendingUp size={32} className="text-success mb-2" />
                  <p className="text-sm text-text-secondary">Weekly Average</p>
                  <p className="text-4xl font-bold text-success mt-1">
                    {Math.round(data.weekly_adherence.reduce((acc, curr) => acc + (curr.taken/curr.total), 0) / data.weekly_adherence.length * 100)}%
                  </p>
                  <p className="text-sm text-success mt-2">
                    +4% from last week
                  </p>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="section-title">Weekly Adherence Trend</h2>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.weekly_adherence} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              </div>

            </div>
          ) : (
             <div className="card p-12 text-center flex flex-col items-center justify-center">
               <TrendingUp size={48} className="text-text-secondary opacity-50 mb-4" />
               <h3 className="text-xl font-bold text-text mb-2">No Data</h3>
               <p className="text-text-secondary mb-6">No adherence data is available for this patient yet.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
