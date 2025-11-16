export interface DriverLeave {
  id: number;
  driver_id: number;
  leave_type: 'sick_leave' | 'vacation' | 'personal' | 'emergency';
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: 'approved' | 'pending' | 'rejected' | 'cancelled';
  reason?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  is_deleted?: boolean;
  
  // Optional nested objects
  driver?: {
    id: number;
    name: string;
    mobile?: string;
  };
  created_by_user?: {
    id: number;
    name?: string;
    email: string;
  };
}

export interface JobReassignment {
  id: number;
  job_id: number;
  driver_leave_id: number;
  original_driver_id: number;
  original_vehicle_id: number;
  original_contractor_id: number;
  reassignment_type: 'driver' | 'vehicle' | 'contractor';
  new_driver_id?: number;
  new_vehicle_id?: number;
  new_contractor_id?: number;
  notes?: string;
  reassigned_by?: number;
  reassigned_at?: string;
  is_deleted?: boolean;
  
  // Optional nested objects
  job?: any; // Job object from job.ts
  driver_leave?: DriverLeave;
  original_driver?: {
    id: number;
    name: string;
  };
  new_driver?: {
    id: number;
    name: string;
  };
  reassigned_by_user?: {
    id: number;
    name?: string;
  };
}

export interface DriverLeaveCreateResponse {
  leave: DriverLeave;
  affected_jobs: any[]; // Array of Job objects
  affected_jobs_count: number;
  requires_reassignment: boolean;
  message: string;
  warning?: string;
}

export interface JobReassignmentRequest {
  job_id: number;
  reassignment_type: 'driver' | 'vehicle' | 'contractor';
  new_driver_id?: number;
  new_vehicle_id?: number;
  new_contractor_id?: number;
  notes?: string;
}

export interface DriverLeaveFilters {
  driver_id?: number;
  status?: 'approved' | 'pending' | 'rejected' | 'cancelled';
  active_only?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface AffectedJobsResponse {
  leave_id: number;
  driver_id: number;
  start_date: string;
  end_date: string;
  affected_jobs: any[]; // Array of Job objects
  count: number;
}

export interface ReassignJobsRequest {
  job_reassignments: JobReassignmentRequest[];
}

export interface ReassignJobsResponse {
  message: string;
  success: any[];
  failed: any[];
  total: number;
}