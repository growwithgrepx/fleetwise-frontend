import { useEffect, useRef } from 'react';
import { useJobMonitoring } from '@/hooks/useJobMonitoring';
import { playAudioNotification } from '@/utils/audioNotification';

const GlobalAlertMonitor = () => {
  const { alerts } = useJobMonitoring();
  const previousAlertsRef = useRef<number[]>([]);

  useEffect(() => {
    // Get current alert IDs
    const currentAlertIds = alerts.map(alert => alert.id);
    
    // Find new alerts by comparing with previous state
    const newAlerts = currentAlertIds.filter(
      id => !previousAlertsRef.current.includes(id)
    );
    
    // Play notification for new alerts
    if (newAlerts.length > 0) {
      playAudioNotification();
    }
    
    // Update the ref with current alert IDs
    previousAlertsRef.current = currentAlertIds;
  }, [alerts]);

  return null; // This component doesn't render anything
};

export default GlobalAlertMonitor;