import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getOverridesForLeave,
  getOverride,
  createOverride,
  bulkCreateOverrides,
  deleteOverride,
  getAvailabilityWindows,
  checkDriverAvailability,
  LeaveOverride,
  CreateOverrideRequest,
  BulkCreateOverrideRequest,
  BulkCreateResponse,
  AvailabilityWindow,
  DeleteOverrideResponse,
} from '@/services/api/leaveOverrideApi';

/**
 * Hook for leave override operations
 * Provides data fetching and mutation hooks for managing driver leave overrides
 */

// Query key factory for leave overrides
const leaveOverrideKeys = {
  all: ['leaveOverrides'] as const,
  forLeave: (leaveId: number) => [...leaveOverrideKeys.all, 'leave', leaveId] as const,
  override: (leaveId: number, overrideId: number) => [...leaveOverrideKeys.forLeave(leaveId), overrideId] as const,
  windows: (leaveId: number, date: string) => [...leaveOverrideKeys.all, 'windows', leaveId, date] as const,
  availability: (leaveId: number, datetime: string) => [...leaveOverrideKeys.all, 'availability', leaveId, datetime] as const,
};

// Get all overrides for a specific leave
export function useGetOverridesForLeave(leaveId: number) {
  return useQuery({
    queryKey: leaveOverrideKeys.forLeave(leaveId),
    queryFn: () => getOverridesForLeave(leaveId),
    enabled: !!leaveId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Get a specific override
export function useGetOverride(leaveId: number, overrideId: number) {
  return useQuery({
    queryKey: leaveOverrideKeys.override(leaveId, overrideId),
    queryFn: () => getOverride(leaveId, overrideId),
    enabled: !!leaveId && !!overrideId,
    staleTime: 5 * 60 * 1000,
  });
}

// Create an override
export function useCreateOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ leaveId, data }: { leaveId: number; data: CreateOverrideRequest }) =>
      createOverride(leaveId, data),
    onSuccess: (_, { leaveId }) => {
      // Invalidate the overrides list for this leave
      queryClient.invalidateQueries({
        queryKey: leaveOverrideKeys.forLeave(leaveId),
      });
      // Invalidate availability windows
      queryClient.invalidateQueries({
        queryKey: leaveOverrideKeys.all,
      });
    },
  });
}

// Create multiple overrides (bulk operation)
export function useBulkCreateOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkCreateOverrideRequest) => bulkCreateOverrides(data),
    onSuccess: (response: BulkCreateResponse) => {
      // Invalidate queries for all affected leaves
      response.success.forEach((override) => {
        queryClient.invalidateQueries({
          queryKey: leaveOverrideKeys.forLeave(override.driver_leave_id),
        });
      });
    },
  });
}

// Delete an override
export function useDeleteOverride() {
  const queryClient = useQueryClient();

  return useMutation<DeleteOverrideResponse, Error, { leaveId: number; overrideId: number }>({
    mutationFn: ({ leaveId, overrideId }: { leaveId: number; overrideId: number }) =>
      deleteOverride(leaveId, overrideId),
    onSuccess: (_, { leaveId }) => {
      // Invalidate the overrides list for this leave
      queryClient.invalidateQueries({
        queryKey: leaveOverrideKeys.forLeave(leaveId),
      });
      // Invalidate availability windows
      queryClient.invalidateQueries({
        queryKey: leaveOverrideKeys.all,
      });
    },
  });
}

// Get availability windows for a date
export function useGetAvailabilityWindows(leaveId: number, date?: string) {
  return useQuery({
    queryKey: leaveOverrideKeys.windows(leaveId, date || ''),
    queryFn: () => getAvailabilityWindows(leaveId, date!),
    enabled: !!leaveId && !!date,
    staleTime: 5 * 60 * 1000,
  });
}

// Check driver availability at a specific datetime
export function useCheckDriverAvailability(leaveId: number, datetime?: string) {
  return useQuery({
    queryKey: leaveOverrideKeys.availability(leaveId, datetime || ''),
    queryFn: () => checkDriverAvailability(leaveId, datetime!),
    enabled: !!leaveId && !!datetime,
    staleTime: 5 * 60 * 1000,
  });
}
