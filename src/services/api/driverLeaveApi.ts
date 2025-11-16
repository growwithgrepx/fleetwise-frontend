import { api } from '@/lib/api';
import {
  DriverLeave,
  DriverLeaveCreateResponse,
  DriverLeaveFilters,
  AffectedJobsResponse,
  ReassignJobsRequest,
  ReassignJobsResponse,
  JobReassignmentRequest
} from '@/types/driverLeave';
import { ApiJob } from '@/types/job';

// Get all driver leaves with optional filtering
export async function getDriverLeaves(filters?: DriverLeaveFilters): Promise<DriverLeave[]> {
  const params = new URLSearchParams();
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }
  
  const response = await api.get<DriverLeave[]>(`/api/driver-leaves?${params.toString()}`);
  return response.data;
}

// Get a specific driver leave by ID
export async function getDriverLeave(leaveId: number): Promise<DriverLeave> {
  const response = await api.get<DriverLeave>(`/api/driver-leaves/${leaveId}`);
  return response.data;
}

// Create a new driver leave
export async function createDriverLeave(data: {
  driver_id: number;
  leave_type: 'sick_leave' | 'vacation' | 'personal' | 'emergency';
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason?: string;
  status?: 'approved' | 'pending' | 'rejected' | 'cancelled';
}): Promise<DriverLeaveCreateResponse> {
  const response = await api.post<DriverLeaveCreateResponse>('/api/driver-leaves', data);
  return response.data;
}

// Update an existing driver leave
export async function updateDriverLeave(
  leaveId: number, 
  data: Partial<{
    leave_type: 'sick_leave' | 'vacation' | 'personal' | 'emergency';
    start_date: string; // YYYY-MM-DD
    end_date: string; // YYYY-MM-DD
    status: 'approved' | 'pending' | 'rejected' | 'cancelled';
    reason: string;
  }>
): Promise<DriverLeave> {
  const response = await api.put<DriverLeave>(`/api/driver-leaves/${leaveId}`, data);
  return response.data;
}

// Delete a driver leave (soft delete)
export async function deleteDriverLeave(leaveId: number): Promise<void> {
  await api.delete(`/api/driver-leaves/${leaveId}`);
}

// Get all jobs affected by a specific leave
export async function getAffectedJobs(leaveId: number): Promise<AffectedJobsResponse> {
  const response = await api.get<AffectedJobsResponse>(`/api/driver-leaves/${leaveId}/affected-jobs`);
  return response.data;
}

// Reassign jobs for a driver on leave
export async function reassignJobs(
  leaveId: number, 
  reassignments: JobReassignmentRequest[]
): Promise<ReassignJobsResponse> {
  const data: ReassignJobsRequest = {
    job_reassignments: reassignments
  };
  
  const response = await api.post<ReassignJobsResponse>(
    `/api/driver-leaves/${leaveId}/reassign-jobs`,
    data
  );
  return response.data;
}

// Get leave history for a specific driver
export async function getDriverLeaveHistory(driverId: number): Promise<{
  driver_id: number;
  total_leaves: number;
  leaves: DriverLeave[];
}> {
  const response = await api.get<{
    driver_id: number;
    total_leaves: number;
    leaves: DriverLeave[];
  }>(`/api/drivers/${driverId}/leaves`);
  return response.data;
}

// Check if a driver is on leave for a specific date
export async function checkDriverLeaveStatus(driverId: number, date: string): Promise<{
  on_leave: boolean;
  leave: DriverLeave | null;
}> {
  const response = await api.get<{
    on_leave: boolean;
    leave: DriverLeave | null;
  }>(`/api/drivers/${driverId}/check-leave?date=${date}`);
  return response.data;
}