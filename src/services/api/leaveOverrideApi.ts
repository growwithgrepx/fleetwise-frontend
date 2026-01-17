import { api } from '@/lib/api';

/**
 * Leave Override API Service
 * Handles all leave override time-window operations
 */

export interface LeaveOverride {
  id: number;
  driver_leave_id: number;
  override_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  override_reason: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  created_by_user?: {
    id: number;
    email: string;
    name: string;
  };
  driver_leave?: {
    id: number;
    driver_id: number;
    start_date: string;
    end_date: string;
    status: string;
  };
}

export interface CreateOverrideRequest {
  override_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  override_reason: string;
}

export interface BulkCreateOverrideRequest {
  driver_leave_ids: number[];
  override_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  override_reason: string;
}

export interface BulkCreateResponse {
  success: LeaveOverride[];
  failed: Array<{
    driver_leave_id: number;
    error: string;
  }>;
  summary: {
    total_attempted: number;
    successful: number;
    failed: number;
  };
}

export interface AvailabilityWindow {
  id: number;
  start_time: string;
  end_time: string;
  reason: string;
  created_by: string;
}

// Get all active overrides for a specific leave
export async function getOverridesForLeave(leaveId: number): Promise<LeaveOverride[]> {
  const response = await api.get<LeaveOverride[]>(
    `/api/driver-leaves/${leaveId}/overrides`
  );
  return response.data;
}

// Get a specific override by ID
export async function getOverride(leaveId: number, overrideId: number): Promise<LeaveOverride> {
  const response = await api.get<LeaveOverride>(
    `/api/driver-leaves/${leaveId}/overrides/${overrideId}`
  );
  return response.data;
}

// Create a new override for a specific leave
export async function createOverride(
  leaveId: number,
  data: CreateOverrideRequest
): Promise<LeaveOverride> {
  const response = await api.post<LeaveOverride>(
    `/api/driver-leaves/${leaveId}/overrides`,
    data
  );
  return response.data;
}

// Create overrides for multiple leaves (bulk operation)
export async function bulkCreateOverrides(
  data: BulkCreateOverrideRequest
): Promise<BulkCreateResponse> {
  // Note: The endpoint path in the backend is /api/driver-leaves/<leave_id>/overrides/bulk
  // For bulk operations, we use the first leave ID in the list
  const firstLeaveId = data.driver_leave_ids[0];
  const response = await api.post<BulkCreateResponse>(
    `/api/driver-leaves/${firstLeaveId}/overrides/bulk`,
    data
  );
  return response.data;
}

// Delete an override (soft delete)
export async function deleteOverride(leaveId: number, overrideId: number): Promise<void> {
  await api.delete(`/api/driver-leaves/${leaveId}/overrides/${overrideId}`);
}

// Get availability windows (overrides) for a leave on a specific date
export async function getAvailabilityWindows(
  leaveId: number,
  date: string // YYYY-MM-DD
): Promise<{
  leave_id: number;
  date: string;
  availability_windows: AvailabilityWindow[];
}> {
  const response = await api.get<{
    leave_id: number;
    date: string;
    availability_windows: AvailabilityWindow[];
  }>(`/api/driver-leaves/${leaveId}/availability-windows?date=${date}`);
  return response.data;
}

// Check if driver is available during a specific datetime
export async function checkDriverAvailability(
  leaveId: number,
  checkDatetime: string // YYYY-MM-DD HH:MM:SS
): Promise<{
  leave_id: number;
  check_datetime: string;
  is_available: boolean;
}> {
  const response = await api.post<{
    leave_id: number;
    check_datetime: string;
    is_available: boolean;
  }>(`/api/driver-leaves/${leaveId}/check-availability`, {
    check_datetime: checkDatetime
  });
  return response.data;
}
