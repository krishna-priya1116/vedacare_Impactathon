import { useAuth } from '../context/AuthContext';
import { User, Volume2, Type, Globe, Bell, ShieldCheck } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();

  return (
    <div className="fade-in max-w-lg mx-auto pb-8">
      <h1 className="page-title mb-6">Profile & Settings</h1>

      {/* User Info */}
      <div className="card p-6 flex flex-col items-center text-center mb-6">
        <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center text-primary text-4xl font-bold mb-4">
          {user?.name?.charAt(0) || 'P'}
        </div>
        <h2 className="text-2xl font-bold text-text mb-1">{user?.name}</h2>
        
        <div className="flex items-center gap-2 mt-4 inline-flex bg-success-50 text-success px-4 py-2 rounded-full font-medium">
          <ShieldCheck size={20} />
          <span>Connected to Caregiver</span>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-text-secondary uppercase tracking-wider text-sm px-2 mt-8 mb-2">Accessibility Settings</h3>
        
        <button className="card p-5 w-full flex items-center justify-between card-interactive text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-primary">
              <Type size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text">Text Size</h3>
              <p className="text-text-secondary">Extra Large</p>
            </div>
          </div>
        </button>

        <button className="card p-5 w-full flex items-center justify-between card-interactive text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-primary">
              <Volume2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text">Voice Volume</h3>
              <p className="text-text-secondary">Loud</p>
            </div>
          </div>
        </button>

        <button className="card p-5 w-full flex items-center justify-between card-interactive text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-primary">
              <Globe size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text">Language</h3>
              <p className="text-text-secondary">English</p>
            </div>
          </div>
        </button>

        <button className="card p-5 w-full flex items-center justify-between card-interactive text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center text-primary">
              <Bell size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text">Reminder Sound</h3>
              <p className="text-text-secondary">Gentle Chime</p>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-12 px-2">
        <button 
          onClick={logout}
          className="btn btn-outline text-danger border-danger/30 hover:bg-danger-50 w-full py-4 text-lg font-bold rounded-xl"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
