"use client";
import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as jobsApi from '@/services/api/jobsApi';
import { Job, ApiJob, CreateJobInput, UpdateJobInput } from '@/types/job';
import { JobFilters } from '@/services/api/jobsApi';
import toast from 'react-hot-toast';

const DEBOUNCE_DELAY = 500; // ms

export const jobKeys = {
  all: ['jobs'] as const,
  lists: (filters: JobFilters) => [...jobKeys.all, 'list', filters] as const,
  details: (id: number) => [...jobKeys.all, 'detail', id] as const,
};

export type UseJobsReturn = {
  // Queries
  jobs: ApiJob[] | undefined
  job: ApiJob | undefined
  isLoading: boolean
  error: Error | null
  filters: JobFilters
  
  // Filter Actions
  updateFilters: (filters: Partial<JobFilters>) => void
  clearFilters: () => void
  
  // Create Operations
  createJob: (job: CreateJobInput) => void
  createJobAsync: (job: CreateJobInput) => Promise<Job>
  isCreating: boolean
  
  // Update Operations  
  updateJob: (input: UpdateJobInput) => void
  updateJobAsync: (input: UpdateJobInput) => Promise<Job>
  isUpdating: boolean
  
  // Delete Operations
  deleteJob: (jobId: number) => void
  deleteJobAsync: (jobId: number) => Promise<void>
  isDeleting: boolean

  // Cancel Operations
  cancelJob: (jobId: number, reason: string) => void
  cancelJobAsync: (jobId: number, reason: string) => Promise<void>
  isCanceling: boolean

  // Reinstate Operations
  reinstateJob: (jobId: number) => void
  reinstateJobAsync: (jobId: number) => Promise<void>
  isReinstating: boolean

  // Bulk Cancel Operations
  bulkCancelJobs: (jobIds: number[], reason: string) => void
  bulkCancelJobsAsync: (jobIds: number[], reason: string) => Promise<void>
  isBulkCanceling: boolean
}

export function useJobs(initialJobId?: number): UseJobsReturn {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<JobFilters>({
    search: '',
    customer_name: '',
    type_of_service: '',
    pickup_date: '',
    pickup_location: '',
    dropoff_location: '',
    status: '',
    passenger_name: ''
  });

  const [debouncedFilters, setDebouncedFilters] = useState<JobFilters>(filters);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateFilters = useCallback((newFilters: Partial<JobFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedFilters(prev => ({ ...prev, ...newFilters }));
    }, DEBOUNCE_DELAY);
  }, [setFilters, setDebouncedFilters]);

  const clearFilters = useCallback(() => {
    const emptyFilters: JobFilters = {
      search: '',
      customer_name: '',
      type_of_service: '',
      pickup_date: '',
      pickup_location: '',
      dropoff_location: '',
      status: '',
      passenger_name: ''
    };
    setFilters(emptyFilters);
    setDebouncedFilters(emptyFilters);
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, [setFilters, setDebouncedFilters]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Queries
  const jobsQuery = useQuery({
    queryKey: jobKeys.lists(debouncedFilters),
    queryFn: () => jobsApi.getJobs(debouncedFilters),
    staleTime: 1000 * 60 // 1 minute
  });

  const jobQuery = useQuery({
    queryKey: jobKeys.details(initialJobId!),
    queryFn: () => jobsApi.getJobById(initialJobId!),
    enabled: !!initialJobId, // Only run this query if an ID is provided
    staleTime: 1000 * 60, // 1 minute
  });

  // Mutations
  const createJobMutation = useMutation({
    mutationFn: (data: CreateJobInput) => jobsApi.createJob(data),
    onSuccess: () => {
      console.log('Job created successfully, invalidating queries');
      // Invalidate all job-related queries to ensure new jobs appear immediately
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: [...jobKeys.all, 'list'] });
      // Also invalidate the all-status-counts query used in jobs page for status/customer counts
      queryClient.invalidateQueries({ queryKey: ['jobs', 'all-status-counts'] });
    },
    onError: (error: any) => {
      // Handle scheduling conflict errors specially
      if (error.name === 'SchedulingConflict') {
        // Don't show toast for scheduling conflicts as they're business logic, not errors
        console.log('Scheduling conflict:', error.message);
        return;
      }
      
      // Handle ServiceError messages that contain specific patterns
      // These are business logic errors that should be shown to the user
      const serviceErrorPatterns = [
        'Driver is on sick leave',
        'Please select a different driver'
      ];
      
      const isServiceError = serviceErrorPatterns.some(pattern => 
        error.message && error.message.includes(pattern)
      );
      
      if (isServiceError) {
        // Show toast for ServiceErrors as they're important business logic errors
        // that the user needs to see
        console.log('ServiceError (business logic):', error.message);
        toast.error(error.message);
        return;
      }
      
      // Show toast for other errors
      toast.error(error.message || 'Failed to create job');
    }
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, data }: UpdateJobInput) => jobsApi.updateJob(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: jobKeys.details(id) });
      queryClient.invalidateQueries({ queryKey: jobKeys.lists(debouncedFilters) });
      // Also invalidate all job lists to ensure consistency across different filter views
      queryClient.invalidateQueries({ queryKey: [...jobKeys.all, 'list'] });
      // Also invalidate the all-status-counts query used in jobs page for status/customer counts
      queryClient.invalidateQueries({ queryKey: ['jobs', 'all-status-counts'] });
    },
    onError: (error: any) => {
      // Handle scheduling conflict errors specially
      if (error.name === 'SchedulingConflict') {
        // Don't show toast for scheduling conflicts as they're business logic, not errors
        console.log('Scheduling conflict:', error.message);
        return;
      }
      
      // Handle ServiceError messages that contain specific patterns
      // These are business logic errors that should be shown to the user
      const serviceErrorPatterns = [
        'Driver is on sick leave',
        'Please select a different driver'
      ];
      
      const isServiceError = serviceErrorPatterns.some(pattern => 
        error.message && error.message.includes(pattern)
      );
      
      if (isServiceError) {
        // Show toast for ServiceErrors as they're important business logic errors
        // that the user needs to see
        console.log('ServiceError (business logic):', error.message);
        toast.error(error.message);
        return;
      }
      
      // Show toast for other errors
      toast.error(error.message || 'Failed to update job');
    }
  });

  const deleteJobMutation = useMutation({
    mutationFn: (id: number) => jobsApi.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists(debouncedFilters), refetchType: "active" });
      queryClient.invalidateQueries({ queryKey: [...jobKeys.all, 'list'] });
      // Also invalidate the all-status-counts query used in jobs page for status/customer counts
      queryClient.invalidateQueries({ queryKey: ['jobs', 'all-status-counts'] });
    }
  });

  // Cancel job mutation
  const cancelJobMutation = useMutation({
    mutationFn: ({ jobId, reason }: { jobId: number; reason: string }) => jobsApi.cancelJob(jobId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists(debouncedFilters) });
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: [...jobKeys.all, 'list'] });
      // Also invalidate the all-status-counts query used in jobs page for status/customer counts
      queryClient.invalidateQueries({ queryKey: ['jobs', 'all-status-counts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel job');
    }
  });

  // Reinstate job mutation
  const reinstateJobMutation = useMutation({
    mutationFn: (jobId: number) => jobsApi.reinstateJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists(debouncedFilters) });
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: [...jobKeys.all, 'list'] });
      // Also invalidate the all-status-counts query used in jobs page for status/customer counts
      queryClient.invalidateQueries({ queryKey: ['jobs', 'all-status-counts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to re-instate job');
    }
  });

  // Bulk cancel jobs mutation
  const bulkCancelJobsMutation = useMutation({
    mutationFn: ({ jobIds, reason }: { jobIds: number[]; reason: string }) => jobsApi.bulkCancelJobs(jobIds, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.lists(debouncedFilters) });
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
      queryClient.invalidateQueries({ queryKey: [...jobKeys.all, 'list'] });
      // Also invalidate the all-status-counts query used in jobs page for status/customer counts
      queryClient.invalidateQueries({ queryKey: ['jobs', 'all-status-counts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel jobs');
    }
  });

  return {
    // Query results
    jobs: jobsQuery.data?.items,
    job: jobQuery.data,
    isLoading: jobsQuery.isLoading,
    error: jobsQuery.error,
    filters,
    
    // Filter actions
    updateFilters,
    clearFilters,

    // Create operations
    createJob: createJobMutation.mutate,
    createJobAsync: createJobMutation.mutateAsync,
    isCreating: createJobMutation.isPending,

    // Update operations
    updateJob: updateJobMutation.mutate,
    updateJobAsync: updateJobMutation.mutateAsync,
    isUpdating: updateJobMutation.isPending,

    // Delete operations
    deleteJob: deleteJobMutation.mutate,
    deleteJobAsync: deleteJobMutation.mutateAsync,
    isDeleting: deleteJobMutation.isPending,

    // Cancel operations
    cancelJob: (jobId: number, reason: string) => cancelJobMutation.mutate({ jobId, reason }),
    cancelJobAsync: (jobId: number, reason: string) => cancelJobMutation.mutateAsync({ jobId, reason }),
    isCanceling: cancelJobMutation.isPending,

    // Reinstate operations
    reinstateJob: (jobId: number) => reinstateJobMutation.mutate(jobId),
    reinstateJobAsync: (jobId: number) => reinstateJobMutation.mutateAsync(jobId),
    isReinstating: reinstateJobMutation.isPending,

    // Bulk cancel operations
    bulkCancelJobs: (jobIds: number[], reason: string) => bulkCancelJobsMutation.mutate({ jobIds, reason }),
    bulkCancelJobsAsync: (jobIds: number[], reason: string) => bulkCancelJobsMutation.mutateAsync({ jobIds, reason }),
    isBulkCanceling: bulkCancelJobsMutation.isPending
  };
}