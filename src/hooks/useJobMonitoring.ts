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
import { getAlertSettings } from '@/services/api/settingsApi';
import { toast } from 'react-hot-toast';

// Convert API alert to store alert format
const convertApiAlertToStoreFormat = (apiAlert: ApiJobMonitoringAlert, maxAlertReminders: number = 3) => ({
  id: apiAlert.id,
  jobId: apiAlert.job_id,
  driverName: apiAlert.driver_name,
  driverContact: apiAlert.driver_mobile,
  pickupTime: `${apiAlert.pickup_date}T${apiAlert.pickup_time}:00`, // Combine date and time into ISO string
  passengerDetails: apiAlert.passenger_name,
  elapsedTime: apiAlert.elapsed_minutes,
  createdAt: apiAlert.created_at,
  dismissed: apiAlert.status !== 'active',
  maxRemindersReached: apiAlert.reminder_count >= maxAlertReminders,
  reminderCount: apiAlert.reminder_count,
  jobData: apiAlert.job_data, 
});

export const useJobMonitoring = () => {
  const queryClient = useQueryClient();
  const { alerts, dismissAlert, updateAlerts } = useJobMonitoringStore();

  // Fetch alerts from API
  const { data: apiAlertsData, isLoading, error, refetch } = useQuery({
    queryKey: ['job-monitoring-alerts'],
    queryFn: getJobMonitoringAlerts,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch alert settings
  const { data: alertSettingsData } = useQuery({
    queryKey: ['alert-settings'],
    queryFn: getAlertSettings,
    refetchInterval: 60000, // Refetch settings every minute
  });

  const maxAlertReminders = alertSettingsData?.alert_settings.max_alert_reminders ?? 3; // Default to 3 if not loaded

  // Handle success and update store when data arrives
  useEffect(() => {
    if (apiAlertsData) {
      // Convert API alerts to store format and update store
      const storeAlerts = apiAlertsData.alerts.map(alert => convertApiAlertToStoreFormat(alert, maxAlertReminders));
      
      // Play audio notification for new alerts before updating store
      const previousAlertIds = new Set(alerts.map(alert => alert.id));
      const newAlerts = storeAlerts.filter(storeAlert => 
        !previousAlertIds.has(storeAlert.id)
      );
      
      if (newAlerts.length > 0) {
        // Only play notification if we have actual new alerts
        playAudioNotification();
      }
      
      // Update store if alerts have changed
      // Compare alert IDs for efficiency instead of deep JSON comparison
      const currentAlertIds = new Set(alerts.map(alert => alert.id));
      const newAlertIds = new Set(storeAlerts.map(alert => alert.id));
      
      // Check if the sets of alert IDs are different
      const idsChanged = currentAlertIds.size !== newAlertIds.size || 
        ![...currentAlertIds].every(id => newAlertIds.has(id));
      
      if (idsChanged) {
        updateAlerts(storeAlerts);
      }
    }
  }, [apiAlertsData, alerts, updateAlerts, maxAlertReminders]);

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
    onMutate: (jobId) => {
      toast.loading(`Starting trip for Job #${jobId}...`, { id: `start-trip-${jobId}` });
    },
    onSuccess: (_, jobId) => {
      // Update local store to remove the alert
      const alert = alerts.find(a => a.jobId === jobId);
      if (alert) {
        dismissAlert(alert.id);
      }
      
      // Invalidate and refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['job-monitoring-alerts'] });
      
      // Show success toast
      toast.success(`Job #${jobId} is now on the way!`, { id: `start-trip-${jobId}` });
    },
    onError: (error, jobId) => {
      // Show error toast
      toast.error(`Failed to start trip for Job #${jobId}. Please try again.`, { id: `start-trip-${jobId}` });
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