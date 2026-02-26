import { useEffect, useRef } from 'react';
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
import { convertUtcToDisplayTime } from '@/utils/timezoneUtils';

// Convert API alert to store alert format
const convertApiAlertToStoreFormat = (apiAlert: ApiJobMonitoringAlert, maxAlertReminders: number = 3) => ({
  id: apiAlert.id,
  jobId: apiAlert.job_id,
  driverName: apiAlert.driver_name,
  driverContact: apiAlert.driver_mobile,
  pickupTime: `${apiAlert.pickup_date}T${apiAlert.pickup_time}`, // Keep as UTC ISO string for proper timezone handling
  passengerDetails: apiAlert.passenger_name || apiAlert.job_data?.customer?.name || apiAlert.job_data?.customer_name || 'Not assigned',
  elapsedTime: apiAlert.elapsed_minutes,
  createdAt: apiAlert.created_at,
  dismissed: apiAlert.status !== 'active', // Only 'active' alerts are not dismissed
  maxRemindersReached: apiAlert.reminder_count >= maxAlertReminders,
  reminderCount: apiAlert.reminder_count,
  jobData: apiAlert.job_data, 
});

// Debug logging for alert conversion
const debugConvertApiAlert = (apiAlert: ApiJobMonitoringAlert) => {
  const result = convertApiAlertToStoreFormat(apiAlert);
  console.log('[useJobMonitoring] Converting API alert:', {
    id: apiAlert.id,
    status: apiAlert.status,
    dismissed: result.dismissed,
    pickup_time: apiAlert.pickup_time,
    pickup_date: apiAlert.pickup_date
  });
  return result;
};

export const useJobMonitoring = () => {
  const queryClient = useQueryClient();
  const { alerts, dismissAlert, updateAlerts } = useJobMonitoringStore();
  const previousAlertsRef = useRef<typeof alerts>([]);

  // Fetch alerts from API
  const { data: apiAlertsData, isLoading, error, refetch } = useQuery({
    queryKey: ['job-monitoring-alerts'],
    queryFn: async () => {
      console.log('[useJobMonitoring] Starting API call to getJobMonitoringAlerts');
      try {
        const result = await getJobMonitoringAlerts(true, 24); // Include upcoming jobs for 24 hours
        console.log('[useJobMonitoring] API call successful, result:', result);
        return result;
      } catch (err) {
        console.error('[useJobMonitoring] API call failed:', err);
        throw err;
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
  
  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useJobMonitoring] Query state:', { 
        isLoading, 
        error, 
        hasData: !!apiAlertsData,
        data: apiAlertsData
      });
    }
  }, [isLoading, error, apiAlertsData]);

  // Fetch alert settings
  const { data: alertSettingsData } = useQuery({
    queryKey: ['alert-settings'],
    queryFn: getAlertSettings,
    refetchInterval: 60000, // Refetch settings every minute
  });

  const maxAlertReminders = alertSettingsData?.alert_settings.max_alert_reminders ?? 3; // Default to 3 if not loaded

  // Handle success and update store when data arrives
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[useJobMonitoring] useEffect triggered, apiAlertsData:', !!apiAlertsData, 'alertSettingsData:', !!alertSettingsData);
    }
    
    if (apiAlertsData) {
      // Debug logging to see what the API is returning
      if (process.env.NODE_ENV === 'development') {
        console.debug('[useJobMonitoring] API alerts status distribution:', 
          apiAlertsData.alerts.map(a => ({ id: a.id, status: a.status, job_id: a.job_id }))
        );
      }
      
      // Convert API alerts to store format and update store
      const storeAlerts = apiAlertsData.alerts.map(alert => debugConvertApiAlert(alert));
      
      // Debug logging for converted alerts
      if (process.env.NODE_ENV === 'development') {
        console.debug('[useJobMonitoring] Converted alerts dismissed values:', 
          storeAlerts.map(a => ({ id: a.id, dismissed: a.dismissed, jobId: a.jobId }))
        );
      }
      
      // Play audio notification for new alerts before updating store
      const previousAlertIds = new Set(previousAlertsRef.current.map(alert => alert.id));
      const newAlerts = storeAlerts.filter(storeAlert => 
        !previousAlertIds.has(storeAlert.id)
      );
      
      // Update the ref with current alerts
      previousAlertsRef.current = storeAlerts;
      
      if (newAlerts.length > 0) {
        // Only play notification if we have actual new alerts
        // Check if audio notifications are enabled in settings
        if (alertSettingsData?.alert_settings?.enable_audio_notifications ?? true) {
          playAudioNotification(alertSettingsData?.alert_settings);
        }
      }
      
      // Update store with the latest alerts from API
      // This ensures the store always reflects the current state from the backend
      updateAlerts(storeAlerts);
    }
  }, [apiAlertsData, maxAlertReminders, alertSettingsData]);

  // Mutation to dismiss an alert
  const dismissAlertMutation = useMutation({
    mutationFn: (alertId: number) => dismissJobMonitoringAlert(alertId),
    onSuccess: (_, alertId) => {
      // Update local store immediately for better UX
      dismissAlert(alertId);
      
      // Invalidate and refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['job-monitoring-alerts'] });
    },
    onError: (error, alertId) => {
      console.error('Failed to dismiss alert:', error);
      // Still try to invalidate queries to refresh from server
      queryClient.invalidateQueries({ queryKey: ['job-monitoring-alerts'] });
    }
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