import { useEffect, useRef } from 'react';
import { useJobMonitoring } from '@/hooks/useJobMonitoring';
import { useUser } from '@/context/UserContext';

const GlobalAlertMonitor = () => {
  const { alerts, isLoading } = useJobMonitoring();
  const { isLoggedIn, isLoading: userLoading } = useUser();
  const previousAlertsRef = useRef<number[]>([]);

  useEffect(() => {
    // Skip if still loading or not authenticated
    if (userLoading || !isLoggedIn || isLoading) return;

    // Update the ref with current alert IDs
    previousAlertsRef.current = alerts.map(alert => alert.id);
  }, [alerts, isLoading, userLoading, isLoggedIn]);

  return null; // This component doesn't render anything
};

export default GlobalAlertMonitor;