import { Job, JobFormData } from '@/types/job';
import { api } from '@/lib/api';

export interface JobFilters {
  search?: string;
  customer_name?: string;
  type_of_service?: string;
  pickup_date?: string;
  pickup_date_start?: string;
  pickup_location?: string;
  dropoff_location?: string;
  status?: string;
}

export interface AuditRecord {
  id: number;
  job_id: number;
  changed_at: string;
  changed_by: number;
  changed_by_email: string;
  old_status: string;
  new_status: string;
  reason: string;
  description: string;
}

export interface DriverInfo {
  id: number;
  name: string;
  license_number: string;
}

export interface JobsResponse {
  items: Job[];
  total: number;
  page: number;
  pageSize: number;
}

export interface JobAuditTrailResponse {
  audit_records: AuditRecord[];
  driver_info?: DriverInfo;
}

export interface CalendarResponse {
  calendar_data: {
    [date: string]: {
      [driverId: string]: CalendarJob[];
      unassigned?: CalendarJob[];
    };
  };
  drivers: { id: number; name: string }[];
  date_range: string[];
}

export interface CalendarJob {
  id: number;
  customer_name: string | null;
  service_type: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_location: string;
  status: string;
}

export interface DriverConflictRequest {
  driver_id: number;
  pickup_date: string;
  pickup_time: string;
  job_id?: number;
}

export interface DriverConflictResponse {
  conflict: boolean;
  message: string;
  conflict_details?: {
    conflict_job_id: number;
    pickup_date: string;
    pickup_time: string;
  };
  warning?: string;
}

/** Helper to parse extra_services safely */
function parseExtraServices(extraServices: any): any[] {
  if (!extraServices) return [];
  if (Array.isArray(extraServices)) return extraServices;
  if (typeof extraServices === 'string') {
    try {
      const parsed = JSON.parse(extraServices);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse extra_services JSON:', e);
      return [];
    }
  }
  return [];
}

/** Fetch jobs with optional filters */
export async function getJobs(filters: JobFilters = {}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const response = await api.get<JobsResponse>(`/api/jobs/table?${params.toString()}`);
  const processedItems = response.data.items.map(job => ({
    ...job,
    extra_services: parseExtraServices(job.extra_services)
  }));

  return { ...response.data, items: processedItems };
}

/** Fetch a single job by ID */
export async function getJobById(id: number): Promise<Job> {
  const response = await api.get<Job>(`/api/jobs/${id}`);
  return { ...response.data, extra_services: parseExtraServices(response.data.extra_services) };
}

/** Create a new job */
export async function createJob(data: JobFormData): Promise<Job> {
  // Transform form data to match backend expectations
  const dbData = {
    // Customer info
    customer_id: Number(data.customer_id),
    sub_customer_name: data.sub_customer_name || '',
    service_type: data.service_type,
    service_id: data.service_id ? Number(data.service_id) : null,

    // Vehicle/Driver
    vehicle_id: data.vehicle_id ? Number(data.vehicle_id) : null,
    driver_id: data.driver_id ? Number(data.driver_id) : null,
    contractor_id: data.contractor_id ? Number(data.contractor_id) : null, // Add contractor_id
    vehicle_type_id: data.vehicle_type_id,

    // Locations
    pickup_location: data.pickup_location,
    dropoff_location: data.dropoff_location,
    pickup_date: data.pickup_date,
    pickup_time: data.pickup_time,
    passenger_name: data.passenger_name,
    passenger_email: data.passenger_email,
    passenger_mobile: data.passenger_mobile,
    status: data.status,

    // Extra services
    extra_services: data.extra_services || [],

    // Billing
    base_price: Number(data.base_price) || 0,
    job_cost: data.job_cost !== undefined ? Number(data.job_cost) : undefined,
    cash_to_collect: data.cash_to_collect !== undefined ? Number(data.cash_to_collect) : undefined,
    additional_discount: Number(data.additional_discount) || 0,
    extra_charges: 0, // Will be calculated on the backend
    final_price: Number(data.final_price) || 0,

    // Dropoff locations
    dropoff_loc1: String(data.dropoff_loc1 || ''),
    dropoff_loc2: String(data.dropoff_loc2 || ''),
    dropoff_loc3: String(data.dropoff_loc3 || ''),
    dropoff_loc4: String(data.dropoff_loc4 || ''),
    dropoff_loc5: String(data.dropoff_loc5 || ''),
    dropoff_loc1_price: Number(data.dropoff_loc1_price) || 0,
    dropoff_loc2_price: Number(data.dropoff_loc2_price) || 0,
    dropoff_loc3_price: Number(data.dropoff_loc3_price) || 0,
    dropoff_loc4_price: Number(data.dropoff_loc4_price) || 0,
    dropoff_loc5_price: Number(data.dropoff_loc5_price) || 0,

    // Pickup locations
    pickup_loc1: String(data.pickup_loc1 || ''),
    pickup_loc2: String(data.pickup_loc2 || ''),
    pickup_loc3: String(data.pickup_loc3 || ''),
    pickup_loc4: String(data.pickup_loc4 || ''),
    pickup_loc5: String(data.pickup_loc5 || ''),
    pickup_loc1_price: Number(data.pickup_loc1_price) || 0,
    pickup_loc2_price: Number(data.pickup_loc2_price) || 0,
    pickup_loc3_price: Number(data.pickup_loc3_price) || 0,
    pickup_loc4_price: Number(data.pickup_loc4_price) || 0,
    pickup_loc5_price: Number(data.pickup_loc5_price) || 0,

    // Customer remark (map remarks field from frontend to customer_remark in backend)
    customer_remark: String(data.remarks || ''), // Add customer_remark

    // Booking reference
    booking_ref: String(data.booking_ref || ''),

    // Midnight surcharge
    midnight_surcharge: Number(data.midnight_surcharge) || 0
  };

  console.log('Sending job data to backend:', dbData);
  try {
    const response = await api.post<Job>('/api/jobs', dbData);
    return response.data;
  } catch (error: any) {
    // Re-throw all errors - let the api interceptor handle SchedulingConflict creation
    throw error;
  }
}

/** Update existing job */
export async function updateJob(id: number, data: Partial<JobFormData>): Promise<Job> {
  // Filter out read-only fields that are marked as dump_only in the backend schema
  const readOnlyFields = [
    'customer_name',
    'customer_email',
    'customer_mobile',
    'customer_reference',
    'vehicle_type',
    'vehicle_number',
    'driver_contact',
    'payment_mode',
    'message',
    // 'remarks',  // Don't filter out remarks - it's used to map to customer_remark
    'has_additional_stop',
    'additional_stops',
    'base_discount_percent',
    'customer_discount_percent',
    'additional_discount_percent',
    'invoice_number',
    'type_of_service',
    'reference',
    'locations',
    'has_request',
    'duration_minutes',
    'duration_str',
    'customer',
    'driver',
    'vehicle',
    'service',
    'invoice',
    'sub_customer',
    'contractor'
  ];

  // Create a new object without the read-only fields
  const filteredData = Object.keys(data).reduce((acc, key) => {
    if (!readOnlyFields.includes(key)) {
      // @ts-ignore
      acc[key] = data[key];
    }
    return acc;
  }, {} as Partial<JobFormData>);

  // Map remarks field to customer_remark for the backend
  const dbData = {
    ...filteredData,
    job_cost: data.job_cost !== undefined ? Number(data.job_cost) : undefined,
    cash_to_collect: data.cash_to_collect !== undefined ? Number(data.cash_to_collect) : undefined,
    customer_remark: data.remarks || '',  // Add customer_remark mapping
    booking_ref: data.booking_ref || ''   // Add booking_ref mapping
  };

  try {
    const response = await api.put<Job>(`/api/jobs/${id}`, dbData);
    return response.data;
  } catch (error: any) {
    // Re-throw all errors - let the api interceptor handle SchedulingConflict creation
    throw error;
  }
}

/** Delete a job */
export async function deleteJob(id: number): Promise<void> {
  await api.delete(`/api/jobs/${id}`);
}

/** Fetch calendar jobs */
export async function getJobsCalendar(days: number = 2): Promise<CalendarResponse> {
  const response = await api.get<CalendarResponse>(`/api/jobs/calendar?days=${days}`);
  return response.data;
}

/** Reschedule job */
export async function rescheduleJob(jobId: number, newDate: string, newTime: string): Promise<Job> {
  const response = await api.put<Job>(`/api/jobs/${jobId}`, {
    pickup_date: newDate,
    pickup_time: newTime
  });
  return response.data;
}

/** Check for driver scheduling conflicts */
export async function checkDriverConflict(data: DriverConflictRequest): Promise<DriverConflictResponse> {
  console.log('Sending driver conflict check request:', data);
  try {
    const response = await api.post<DriverConflictResponse>('/api/jobs/check-driver-conflict', data);
    console.log('Received driver conflict check response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in checkDriverConflict:', error);
    throw error;
  }
}

/** Bulk cancel jobs */
export async function bulkCancelJobs(jobIds: number[], reason: string): Promise<any> {
  const response = await api.post('/api/jobs/bulk-cancel', {
    job_ids: jobIds,
    reason: reason
  });
  return response.data;
}

/** Re-instate a canceled job */
export async function reinstateJob(jobId: number): Promise<any> {
  const response = await api.post(`/api/jobs/reinstate/${jobId}/`);
  return response.data;
}

/** Cancel a single job */
export async function cancelJob(jobId: number, reason: string): Promise<any> {
  const response = await api.post(`/api/jobs/audit/${jobId}`, {
    new_status: 'canceled',
    reason: reason
  });
  return response.data;
}

/** Get jobs audit trail with filters */
export async function getJobsAuditTrail(params: Record<string, string>): Promise<any> {
  const response = await api.get('/api/jobs/audit-trail', { params });
  return response;
}

/** Get detailed audit trail for a specific job */
export async function getJobAuditTrail(jobId: number): Promise<JobAuditTrailResponse> {
  const response = await api.get<JobAuditTrailResponse>(`/api/jobs/audit_trail/${jobId}`);
  return response.data;
}

/** Update job status */
export async function updateJobStatus(jobId: number, newStatus: string, remark?: string): Promise<any> {
  const response = await api.post(`/api/jobs/update_status/${jobId}`, {
    new_status: newStatus,
    remark: remark
  });
  return response.data;
}
