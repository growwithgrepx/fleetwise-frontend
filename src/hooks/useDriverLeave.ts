import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as driverLeaveApi from "@/services/api/driverLeaveApi";
import { 
  DriverLeave, 
  DriverLeaveFilters, 
  AffectedJobsResponse,
  JobReassignmentRequest
} from "@/types/driverLeave";
import { ApiJob } from "@/types/job";

// Hook for getting driver leaves with filters
export const useGetDriverLeaves = (filters?: DriverLeaveFilters) => {
  return useQuery({
    queryKey: ["driver-leaves", filters],
    queryFn: () => driverLeaveApi.getDriverLeaves(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook for getting a specific driver leave
export const useGetDriverLeave = (leaveId: number) => {
  return useQuery({
    queryKey: ["driver-leaves", leaveId],
    queryFn: () => driverLeaveApi.getDriverLeave(leaveId),
    enabled: !!leaveId,
  });
};

// Hook for creating a driver leave
export const useCreateDriverLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: driverLeaveApi.createDriverLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-leaves"] });
    },
  });
};

// Hook for updating a driver leave
export const useUpdateDriverLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveId, data }: { leaveId: number; data: Partial<DriverLeave> }) => 
      driverLeaveApi.updateDriverLeave(leaveId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-leaves"] });
    },
  });
};

// Hook for deleting a driver leave
export const useDeleteDriverLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: driverLeaveApi.deleteDriverLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-leaves"] });
    },
  });
};

// Hook for getting affected jobs for a leave
export const useGetAffectedJobs = (leaveId: number) => {
  return useQuery({
    queryKey: ["driver-leaves", leaveId, "affected-jobs"],
    queryFn: () => driverLeaveApi.getAffectedJobs(leaveId),
    enabled: !!leaveId,
  });
};

// Hook for reassigning jobs
export const useReassignJobs = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveId, reassignments }: { leaveId: number; reassignments: JobReassignmentRequest[] }) => 
      driverLeaveApi.reassignJobs(leaveId, reassignments),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
};

// Hook for getting driver leave history
export const useGetDriverLeaveHistory = (driverId: number) => {
  return useQuery({
    queryKey: ["drivers", driverId, "leaves"],
    queryFn: () => driverLeaveApi.getDriverLeaveHistory(driverId),
    enabled: !!driverId,
  });
};

// Hook for checking driver leave status
export const useCheckDriverLeaveStatus = (driverId: number, date: string) => {
  return useQuery({
    queryKey: ["drivers", driverId, "leave-status", date],
    queryFn: () => driverLeaveApi.checkDriverLeaveStatus(driverId, date),
    enabled: !!driverId && !!date,
  });
};