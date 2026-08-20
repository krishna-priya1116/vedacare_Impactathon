import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth on mount
    const stored = localStorage.getItem('vedacare_auth');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('vedacare_auth');
      }
    }
    setLoading(false);
  }, []);

  const loginUser = (userData) => {
    const authData = {
      token: userData.token,
      role: userData.role,
      redirect: userData.redirect,
      name: userData.name || '',
      id: userData.caregiver_id || userData.patient_id || null,
    };
    setUser(authData);
    localStorage.setItem('vedacare_auth', JSON.stringify(authData));
    return authData;
  };

  const loginPatientDevice = (deviceToken, patientId, patientName) => {
    const authData = {
      token: deviceToken,
      role: 'patient',
      redirect: '/patient',
      name: patientName,
      id: patientId,
      device_token: deviceToken,
    };
    setUser(authData);
    localStorage.setItem('vedacare_auth', JSON.stringify(authData));
    localStorage.setItem('vedacare_device_token', deviceToken);
    return authData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vedacare_auth');
    // Don't remove device_token — patient devices keep it for auto-login
  };

  const isAuthenticated = !!user?.token;
  const isCaregiver = user?.role === 'caregiver';
  const isPatient = user?.role === 'patient';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isCaregiver,
        isPatient,
        loginUser,
        loginPatientDevice,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected route wrapper
export function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!loading && role && user?.role !== role) {
      navigate(user?.redirect || '/', { replace: true });
    }
  }, [loading, isAuthenticated, role, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-text-secondary text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (role && user?.role !== role)) {
    return null;
  }

  return children;
}
