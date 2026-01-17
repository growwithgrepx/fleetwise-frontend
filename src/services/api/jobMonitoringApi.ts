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
  job_data: Job; // Full job data for details
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
export async function getJobMonitoringAlerts(): Promise<GetJobMonitoringAlertsResponse> {
  const response = await api.get<GetJobMonitoringAlertsResponse>(
    `/api/job-monitoring-alerts`
  );
  
  return response.data;
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