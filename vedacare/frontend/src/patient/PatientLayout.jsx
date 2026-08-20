import { Outlet, NavLink } from 'react-router-dom';
import { Home, CalendarClock, User, LogOut, Pill, Activity, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PatientLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="h-[100dvh] flex flex-col bg-bg">
      {/* Header */}
      <header className="p-4 bg-white border-b border-border flex justify-between items-center shadow-sm z-10">
        <h2 className="font-bold text-xl text-primary tracking-tight">VedaCare</h2>
        
        <div className="flex items-center gap-3">
          <button onClick={logout} className="p-2 text-text-secondary hover:text-danger rounded-full transition-colors">
            <LogOut size={20} />
          </button>
          <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center text-primary font-bold border border-primary-100">
            {user?.name?.charAt(0) || 'P'}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pb-6 relative">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-border flex justify-around items-center h-16 sm:h-20 pb-safe z-10">
        <NavLink 
          to="/patient" 
          end
          className={({ isActive }) => 
            `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text'}`
          }
        >
          <Home size={20} />
          <span className="text-[10px] sm:text-xs font-medium">Home</span>
        </NavLink>

        <NavLink 
          to="/patient/timetable" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text'}`
          }
        >
          <CalendarClock size={20} />
          <span className="text-[10px] sm:text-xs font-medium">Timetable</span>
        </NavLink>

        <NavLink 
          to="/patient/medicines" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text'}`
          }
        >
          <Pill size={20} />
          <span className="text-[10px] sm:text-xs font-medium">Meds</span>
        </NavLink>

        <NavLink 
          to="/patient/status" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text'}`
          }
        >
          <Activity size={20} />
          <span className="text-[10px] sm:text-xs font-medium">Status</span>
        </NavLink>

        <NavLink 
          to="/patient/history" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text'}`
          }
        >
          <History size={20} />
          <span className="text-[10px] sm:text-xs font-medium">History</span>
        </NavLink>

        <NavLink 
          to="/patient/profile" 
          className={({ isActive }) => 
            `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${isActive ? 'text-primary' : 'text-text-secondary hover:text-text'}`
          }
        >
          <User size={20} />
          <span className="text-[10px] sm:text-xs font-medium">Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
