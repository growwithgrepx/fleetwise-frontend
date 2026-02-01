import { useEffect, useRef } from 'react';
import { useJobMonitoring } from '@/hooks/useJobMonitoring';

const GlobalAlertMonitor = () => {
  const { alerts, isLoading } = useJobMonitoring();
  const previousAlertsRef = useRef<number[]>([]);

  useEffect(() => {
    // Skip if still loading
    if (isLoading) return;

    // Update the ref with current alert IDs
    previousAlertsRef.current = alerts.map(alert => alert.id);
  }, [alerts, isLoading]);

  return null; // This component doesn't render anything
};

export default GlobalAlertMonitor;