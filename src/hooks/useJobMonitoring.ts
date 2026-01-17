import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useJobMonitoringStore } from '@/store/useJobMonitoringStore';
import { playAudioNotification } from '@/utils/audioNotification';
import { 
  getJobMonitoringAlerts, 
  dismissJobMonitoringAlert, 
  updateJobStatusToOtw,
  getActiveJobMonitoringAlertCount
} from '@/services/api/jobMonitoringApi';
import { JobMonitoringAlert as ApiJobMonitoringAlert } from '@/services/api/jobMonitoringApi';

// Convert API alert to store alert format
const convertApiAlertToStoreFormat = (apiAlert: ApiJobMonitoringAlert) => ({
  id: apiAlert.id,
  jobId: apiAlert.job_id,
  driverName: apiAlert.driver_name,
  driverContact: apiAlert.driver_mobile,
  pickupTime: `${apiAlert.pickup_date}T${apiAlert.pickup_time}:00`, // Combine date and time into ISO string
  passengerDetails: apiAlert.passenger_name,
  elapsedTime: apiAlert.elapsed_minutes,
  createdAt: apiAlert.created_at,
  dismissed: apiAlert.status !== 'active',
  maxRemindersReached: apiAlert.reminder_count >= 3, // Assuming 3 is the max
  reminderCount: apiAlert.reminder_count,
});

export const useJobMonitoring = () => {
  const queryClient = useQueryClient();
  const { alerts, addAlert, dismissAlert, startTrip, updateAlerts } = useJobMonitoringStore();

  // Fetch alerts from API
  const { data: apiAlertsData, isLoading, error, refetch } = useQuery({
    queryKey: ['job-monitoring-alerts'],
    queryFn: getJobMonitoringAlerts,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Handle success and update store when data arrives
  useEffect(() => {
    if (apiAlertsData) {
      // Convert API alerts to store format and update store
      const storeAlerts = apiAlertsData.alerts.map(convertApiAlertToStoreFormat);
      
      // Only update if the alerts have actually changed
      if (JSON.stringify(alerts) !== JSON.stringify(storeAlerts)) {
        updateAlerts(storeAlerts);
        
        // Play audio notification if new alerts appeared
        const newAlerts = storeAlerts.filter(storeAlert => 
          !alerts.some(existingAlert => existingAlert.id === storeAlert.id)
        );
        
        if (newAlerts.length > 0) {
          playAudioNotification();
        }
      }
    }
  }, [apiAlertsData, alerts, updateAlerts]);

  // Mutation to dismiss an alert
  const dismissAlertMutation = useMutation({
    mutationFn: (alertId: number) => dismissJobMonitoringAlert(alertId),
    onSuccess: (_, alertId) => {
      // Update local store
      dismissAlert(alertId);
      
      // Invalidate and refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['job-monitoring-alerts'] });
    },
  });

  // Mutation to start a trip (update job status to OTW)
  const startTripMutation = useMutation({
    mutationFn: (jobId: number) => updateJobStatusToOtw(jobId),
    onSuccess: (_, jobId) => {
      // Update local store to remove the alert
      const alert = alerts.find(a => a.jobId === jobId);
      if (alert) {
        dismissAlert(alert.id);
      }
      
      // Invalidate and refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['job-monitoring-alerts'] });
    },
  });

  // Get active alert count
  const { data: alertCountData } = useQuery({
    queryKey: ['job-monitoring-alert-count'],
    queryFn: getActiveJobMonitoringAlertCount,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    alerts,
    isLoading,
    error,
    alertCount: alertCountData?.active_count || 0,
    refetch,
    dismissAlert: (alertId: number) => dismissAlertMutation.mutate(alertId),
    startTrip: (jobId: number) => startTripMutation.mutate(jobId),
    isDismissing: dismissAlertMutation.isPending,
    isStartingTrip: startTripMutation.isPending,
  };
};