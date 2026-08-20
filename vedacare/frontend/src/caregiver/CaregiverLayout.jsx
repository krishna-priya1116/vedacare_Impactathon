import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  Pill
} from 'lucide-react';

const navItems = [
  { path: '/caregiver', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/caregiver/patients', label: 'Patients', icon: Users },
  { path: '/caregiver/prescriptions', label: 'Prescriptions', icon: FileText },
  { path: '/caregiver/medicines', label: 'Medicines', icon: Pill },
  { path: '/caregiver/alerts', label: 'Alerts', icon: AlertTriangle },
  { path: '/caregiver/timetable', label: 'Timetable', icon: Clock },
  { path: '/caregiver/adherence', label: 'Adherence', icon: TrendingUp },
];

export default function CaregiverLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-bg">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-border flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <h1 className="text-xl font-bold text-primary tracking-tight">VedaCare</h1>
          <button className="lg:hidden text-text-secondary" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => 
                `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-primary-50 text-primary font-medium' 
                    : 'text-text hover:bg-bg'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={isActive ? 'text-primary' : 'text-text-secondary'} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
              {user?.name?.charAt(0) || 'C'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">{user?.name || 'Caregiver'}</p>
              <p className="text-xs text-text-secondary truncate">Caregiver Account</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-danger hover:bg-danger-50 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-border flex items-center px-4 lg:px-8 shrink-0">
          <button 
            className="lg:hidden text-text-secondary mr-4 hover:text-primary"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1">
            {/* Header search or context can go here */}
          </div>
          
          <div className="flex items-center gap-4">
            <Link to="/caregiver/alerts" className="relative p-2 text-text-secondary hover:text-primary transition-colors">
              <AlertTriangle size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full border border-white"></span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
