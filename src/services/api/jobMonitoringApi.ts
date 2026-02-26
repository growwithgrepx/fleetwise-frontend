import { Job } from '@/types/job';
import { api } from '@/lib/api';

export interface JobMonitoringAlert {
  id: number;
  job_id: number;
  driver_name: string;
  driver_mobile: string;
  passenger_name: string;
  passenger_mobile: string | null;
  pickup_time: string; // HH:MM format
  pickup_date: string; // YYYY-MM-DD format
  status: 'active' | 'dismissed' | 'resolved';
  reminder_count: number;
  created_at: string; // ISO string
  elapsed_minutes: number; // in minutes
  service_type: string;
  pickup_location: string;
  dropoff_location: string;
  job_data?: {
    id: number;
    customer?: {
      name: string | null;
      email: string | null;
      mobile: string | null;
      company_name: string | null;
    } | null;
    customer_name: string | null;
    passenger_name: string | null;
    passenger_mobile: string | null;
  };
}

export interface GetJobMonitoringAlertsResponse {
  alerts: JobMonitoringAlert[];
  active_count: number;
  total_count: number;
}

export interface UpdateJobMonitoringAlertStatusRequest {
  alert_id: number;
}

export interface UpdateJobMonitoringAlertStatusResponse {
  success: boolean;
  message: string;
}

// Get all active job monitoring alerts
export async function getJobMonitoringAlerts(includeUpcoming: boolean = false, windowHours: number = 24): Promise<GetJobMonitoringAlertsResponse> {
  console.log('[JobMonitoringApi] Making API call to /api/job-monitoring-alerts');
  
  try {
    const params = new URLSearchParams();
    if (includeUpcoming) {
      params.append('include_upcoming', 'true');
      params.append('window_hours', windowHours.toString());
    }
    
    const url = `/api/job-monitoring-alerts${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('[JobMonitoringApi] Request URL:', url);
    
    const response = await api.get<GetJobMonitoringAlertsResponse>(url);
    
    console.log('[JobMonitoringApi] API response status:', response.status);
    console.log('[JobMonitoringApi] Response data:', response.data);
    console.log('[JobMonitoringApi] Response data keys:', Object.keys(response.data));
    console.log('[JobMonitoringApi] Alerts count:', response.data.alerts?.length || 0);
    console.log('[JobMonitoringApi] Active count:', response.data.active_count);
    console.log('[JobMonitoringApi] Total count:', response.data.total_count);
    console.log('[JobMonitoringApi] Counts:', (response.data as any).counts);
    console.log('[JobMonitoringApi] Parameters:', (response.data as any).parameters);
    
    if (response.data.alerts && response.data.alerts.length > 0) {
      console.log('[JobMonitoringApi] First alert sample:', response.data.alerts[0]);
      console.log('[JobMonitoringApi] First alert status:', response.data.alerts[0].status);
    }
    
    return response.data;
  } catch (error: any) {
    console.error('[JobMonitoringApi] API call failed:', error);
    console.error('[JobMonitoringApi] Error response:', error.response?.data);
    console.error('[JobMonitoringApi] Error status:', error.response?.status);
    throw error;
  }
}

// Dismiss a specific alert
export async function dismissJobMonitoringAlert(alertId: number): Promise<{ message: string; alert_id: number }> {
  const response = await api.post<{ message: string; alert_id: number}>(
    `/api/job-monitoring-alerts/acknowledge`,
    { alert_id: alertId }
  );
  
  return response.data;
}

// Update job status to 'otw' (On The Way) which should clear the alert
export async function updateJobStatusToOtw(jobId: number): Promise<{ message: string; job_id: number; old_status: string; new_status: string }> {
  const response = await api.post<{ message: string; job_id: number; old_status: string; new_status: string}>(
    `/api/jobs/${jobId}/status/otw`,
    {}
  );
  
  return response.data;
}

// Get a single alert by ID
export async function getJobMonitoringAlertById(alertId: number): Promise<JobMonitoringAlert> {
  const response = await api.get<JobMonitoringAlert>(`/api/job-monitoring-alerts/${alertId}`);
  
  return response.data;
}



export async function getActiveJobMonitoringAlertCount(): Promise<{ active_count: number; total_count: number }> {
  const response = await api.get<{ active_count: number; total_count: number }>('/api/job-monitoring-alerts');
  
  return response.data;
}