import { useState, useEffect } from 'react';
import { User, Bell, Shield, Globe, Lock, Save, Smartphone, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [saving, setSaving] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState({
    account: {
      name: user?.name || 'Caregiver',
      email: 'caregiver@example.com',
      phone: user?.phone || '+91 9876543210',
    },
    patient: {
      patientInfo: 'Meera (Patient ID: #101)',
      language: 'hi',
      timeZone: 'Asia/Kolkata',
      accessibility: 'large_text',
    },
    notifications: {
      missedDose: true,
      safetyAlerts: true,
      reminders: true,
      escalationTiming: '15_min',
    },
    security: {
      twoFactor: false,
    }
  });

  const handleSave = () => {
    setSaving(true);
    // Simulate API call to save settings
    setTimeout(() => {
      setSaving(false);
      // Optional: Add a toast notification here in the future
    }, 800);
  };

  const updateSetting = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'patient', label: 'Patient Settings', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="fade-in max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text mb-2">Settings</h1>
          <p className="text-text-secondary">Manage your account, notifications, and patient preferences.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 flex flex-col gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeTab === tab.id 
                  ? 'bg-primary-50 text-primary font-semibold' 
                  : 'text-text-secondary hover:bg-bg hover:text-text'
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-primary' : ''} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          <div className="card p-6">
            
            {activeTab === 'account' && (
              <div className="space-y-6 fade-in">
                <h2 className="text-xl font-bold border-b border-border-light pb-2 mb-4">Account Details</h2>
                
                <div className="grid gap-4 max-w-md">
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1">Full Name</label>
                    <input 
                      type="text" 
                      className="input" 
                      value={settings.account.name}
                      onChange={(e) => updateSetting('account', 'name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1">Email Address</label>
                    <input 
                      type="email" 
                      className="input" 
                      value={settings.account.email}
                      onChange={(e) => updateSetting('account', 'email', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      className="input" 
                      value={settings.account.phone}
                      onChange={(e) => updateSetting('account', 'phone', e.target.value)}
                    />
                  </div>
                  <div className="pt-2">
                    <button className="btn btn-outline">Change Password</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'patient' && (
              <div className="space-y-6 fade-in">
                <h2 className="text-xl font-bold border-b border-border-light pb-2 mb-4">Patient Settings</h2>
                
                <div className="grid gap-4 max-w-md">
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1">Active Patient</label>
                    <input 
                      type="text" 
                      className="input bg-bg text-text-secondary cursor-not-allowed" 
                      value={settings.patient.patientInfo}
                      disabled
                    />
                    <p className="text-xs text-text-muted mt-1">To switch patients, use the Patients tab.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1 flex items-center gap-2">
                      <Globe size={16} /> Patient Language
                    </label>
                    <select 
                      className="input"
                      value={settings.patient.language}
                      onChange={(e) => updateSetting('patient', 'language', e.target.value)}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi (हिंदी)</option>
                      <option value="gu">Gujarati (ગુજરાતી)</option>
                    </select>
                    <p className="text-xs text-text-muted mt-1">Audio instructions will be generated in this language.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1">Time Zone</label>
                    <select 
                      className="input"
                      value={settings.patient.timeZone}
                      onChange={(e) => updateSetting('patient', 'timeZone', e.target.value)}
                    >
                      <option value="Asia/Kolkata">India Standard Time (IST)</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1">Accessibility Mode</label>
                    <select 
                      className="input"
                      value={settings.patient.accessibility}
                      onChange={(e) => updateSetting('patient', 'accessibility', e.target.value)}
                    >
                      <option value="default">Standard</option>
                      <option value="large_text">Large Text & High Contrast</option>
                      <option value="voice_first">Voice-First Experience</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6 fade-in">
                <h2 className="text-xl font-bold border-b border-border-light pb-2 mb-4">Notification Preferences</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 border border-border-light rounded-lg hover:bg-bg transition-colors cursor-pointer">
                    <div>
                      <h4 className="font-semibold text-text">Missed Dose Alerts</h4>
                      <p className="text-sm text-text-secondary">Get notified immediately when a patient misses a scheduled dose.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-primary" 
                      checked={settings.notifications.missedDose}
                      onChange={(e) => updateSetting('notifications', 'missedDose', e.target.checked)}
                    />
                  </label>
                  
                  <label className="flex items-center justify-between p-3 border border-border-light rounded-lg hover:bg-bg transition-colors cursor-pointer">
                    <div>
                      <h4 className="font-semibold text-text">Safety & Interaction Alerts</h4>
                      <p className="text-sm text-text-secondary">Receive warnings about potentially dangerous medication interactions.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-primary" 
                      checked={settings.notifications.safetyAlerts}
                      onChange={(e) => updateSetting('notifications', 'safetyAlerts', e.target.checked)}
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 border border-border-light rounded-lg hover:bg-bg transition-colors cursor-pointer">
                    <div>
                      <h4 className="font-semibold text-text">Daily Reminders</h4>
                      <p className="text-sm text-text-secondary">Get a daily summary of upcoming medications.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-primary" 
                      checked={settings.notifications.reminders}
                      onChange={(e) => updateSetting('notifications', 'reminders', e.target.checked)}
                    />
                  </label>

                  <div className="mt-6 max-w-sm">
                    <label className="block text-sm font-semibold text-text-secondary mb-1">Escalation Timing</label>
                    <select 
                      className="input"
                      value={settings.notifications.escalationTiming}
                      onChange={(e) => updateSetting('notifications', 'escalationTiming', e.target.value)}
                    >
                      <option value="5_min">5 minutes after missed dose</option>
                      <option value="15_min">15 minutes after missed dose</option>
                      <option value="30_min">30 minutes after missed dose</option>
                      <option value="60_min">1 hour after missed dose</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 fade-in">
                <h2 className="text-xl font-bold border-b border-border-light pb-2 mb-4">Security Settings</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-bg rounded-lg border border-border-light">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full text-primary">
                        <Lock size={20} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-text">Two-Factor Authentication</h4>
                        <p className="text-sm text-text-secondary">Add an extra layer of security to your account.</p>
                      </div>
                    </div>
                    <button className="btn btn-outline">Enable</button>
                  </div>

                  <div>
                    <h3 className="font-bold text-text mb-3">Active Sessions</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border border-border-light rounded-lg">
                        <div className="flex items-center gap-3">
                          <Smartphone size={18} className="text-text-secondary" />
                          <div>
                            <p className="font-medium text-sm">Chrome on macOS (Current Session)</p>
                            <div className="flex items-center gap-1 text-xs text-text-muted">
                              <MapPin size={12} /> Mumbai, India
                            </div>
                          </div>
                        </div>
                        <span className="badge bg-success/10 text-success font-medium">Active</span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border border-border-light rounded-lg opacity-70">
                        <div className="flex items-center gap-3">
                          <Smartphone size={18} className="text-text-secondary" />
                          <div>
                            <p className="font-medium text-sm">Safari on iPhone</p>
                            <div className="flex items-center gap-1 text-xs text-text-muted">
                              <MapPin size={12} /> Mumbai, India
                            </div>
                          </div>
                        </div>
                        <button className="text-sm text-danger font-medium hover:underline">Revoke</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
