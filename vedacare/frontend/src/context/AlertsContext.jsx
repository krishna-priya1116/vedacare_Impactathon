import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAlerts, reviewAlert, resolveAlert } from '../api/client';
import { useAuth } from './AuthContext';

const AlertsContext = createContext(null);

export function AlertsProvider({ children }) {
  const { user, role } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAlerts = useCallback(async () => {
    // Only load alerts for caregiver
    if (role !== 'caregiver') {
      setAlerts([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Pass user.id or mock id
      const data = await getAlerts(user?.id || 1, 'active');
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setError('Failed to load alerts. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleReviewAlert = async (alertId) => {
    try {
      await reviewAlert(alertId);
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, status: 'reviewed' } : a
      ));
    } catch (err) {
      console.error('Failed to review alert:', err);
      throw err;
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await resolveAlert(alertId);
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, status: 'resolved' } : a
      ));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
      throw err;
    }
  };

  const activeAlerts = alerts.filter(a => a.status === 'active' || !a.status || a.status === 'pending');
  const unreadCount = activeAlerts.length;

  return (
    <AlertsContext.Provider value={{ 
      alerts, 
      loading, 
      error,
      unreadCount,
      activeAlerts,
      loadAlerts, 
      handleReviewAlert,
      handleResolveAlert
    }}>
      {children}
    </AlertsContext.Provider>
  );
}

export const useAlerts = () => {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
};
