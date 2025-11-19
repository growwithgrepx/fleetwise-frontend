"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EntityHeader } from '@/components/organisms/EntityHeader';
import { useGetDriverLeave, useGetAffectedJobs, useReassignJobs } from "@/hooks/useDriverLeave";
import { useGetAllDrivers } from "@/hooks/useDrivers";
import { useGetAllVehicles } from "@/hooks/useVehicles";
import { useGetAllContractors } from "@/hooks/useContractors";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function ReassignJobsPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params promise
  const unwrappedParams = React.use(params);
  const router = useRouter();
  const leaveId = parseInt(unwrappedParams.id);
  
  // Fetch the specific leave details
  const { data: leave, isLoading: leaveLoading, isError: leaveError, error: leaveErrorMsg } = useGetDriverLeave(leaveId);
  
  // Fetch affected jobs for this leave
  const { data: affectedJobs, isLoading: jobsLoading, isError: jobsError, error: jobsErrorMsg } = useGetAffectedJobs(leaveId);
  
  // Fetch data for dropdowns
  const { data: drivers = [], isLoading: driversLoading } = useGetAllDrivers();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useGetAllVehicles();
  const { data: contractors = [], isLoading: contractorsLoading } = useGetAllContractors();
  
  // Mutation hook for reassigning jobs
  const reassignJobsMutation = useReassignJobs();
  
  // State for job selections and reassignments
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [jobAssignments, setJobAssignments] = useState<Record<number, { 
    driverId?: number; 
    vehicleId?: number; 
    contractorId?: number;
    notes?: string;
  }>>({});
  
  // Handle job selection
  const handleJobSelect = (jobId: number, checked: boolean) => {
    if (checked) {
      setSelectedJobs(prev => [...prev, jobId]);
    } else {
      setSelectedJobs(prev => prev.filter(id => id !== jobId));
      // Remove assignment if job is deselected
      setJobAssignments(prev => {
        const newAssignments = { ...prev };
        delete newAssignments[jobId];
        return newAssignments;
      });
    }
  };
  
  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked && affectedJobs?.affected_jobs) {
      setSelectedJobs(affectedJobs.affected_jobs.map(job => job.id));
    } else {
      setSelectedJobs([]);
      // Clear all assignments
      setJobAssignments({});
    }
  };
  
  // Handle assignment change
  const handleAssignmentChange = (jobId: number, field: string, value: string) => {
    setJobAssignments(prev => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        [field]: value ? Number(value) : undefined
      }
    }));
  };
  
  // Handle notes change
  const handleNotesChange = (jobId: number, value: string) => {
    setJobAssignments(prev => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        notes: value
      }
    }));
  };
  
  // Handle reassign jobs
  const handleReassignJobs = async () => {
    if (selectedJobs.length === 0) {
      toast.error("Please select at least one job to reassign");
      return;
    }
    
    try {
      const reassignments = selectedJobs.map(jobId => {
        const assignment = jobAssignments[jobId];
        return {
          job_id: jobId,
          new_driver_id: assignment?.driverId || undefined,
          new_vehicle_id: assignment?.vehicleId || undefined,
          new_contractor_id: assignment?.contractorId || undefined,
          notes: assignment?.notes || `Reassigned due to driver leave #${leaveId}`
        };
      });
      
      const reassignResponse = await reassignJobsMutation.mutateAsync({
        leaveId,
        reassignments
      });
      
      // Show success message with details
      toast.success(reassignResponse.message || "Job reassignments submitted successfully");
      
      // Show individual success messages
      reassignResponse.success.forEach((item: any) => {
        toast.success(`Job ${item.job_id} successfully reassigned`);
      });
      
      // Show any failed reassignments
      reassignResponse.failed.forEach((item: any) => {
        toast.error(`Failed to reassign job ${item.job_id}: ${item.error || 'Unknown error'}`);
      });
      
      // Reset selections
      setSelectedJobs([]);
      setJobAssignments({});
      
      // Refresh the affected jobs data
      // This will happen automatically due to React Query's cache invalidation
    } catch (error: any) {
      console.error("Error reassigning jobs:", error);
      toast.error(error.message || "Failed to reassign jobs");
    }
  };
  
  // Check if all jobs are selected
  const allJobsSelected = affectedJobs?.affected_jobs?.length > 0 && 
    selectedJobs.length === affectedJobs.affected_jobs.length;

  return (
    <div className="container mx-auto px-4 py-8">
      <EntityHeader 
        title="Reassign Jobs" 
        extraActions={
          <button 
            onClick={() => router.push(`/drivers/leave/details/${leaveId}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
          >
            Back to Leave Details
          </button>
        }
        className="mb-6"
      />
      
      {leaveLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading leave details...</p>
        </div>
      ) : leaveError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-xl font-medium text-red-800 dark:text-red-200 mb-2">Error Loading Leave Details</h2>
          <p className="text-red-600 dark:text-red-400">{leaveErrorMsg?.message || "Failed to load leave details"}</p>
          <button
            onClick={() => router.push(`/drivers/leave/details/${leaveId}`)}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
          >
            Back to Leave Details
          </button>
        </div>
      ) : leave ? (
        <div className="space-y-6">
          {/* Leave Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Leave Details</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Driver</div>
                  <div className="font-medium">{leave.driver?.name || `Driver ${leave.driver_id}`}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Leave Period</div>
                  <div className="font-medium">
                    {format(new Date(leave.start_date), 'dd/MM/yyyy')} - {format(new Date(leave.end_date), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Leave Type</div>
                  <div className="font-medium capitalize">{leave.leave_type.replace('_', ' ')}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Affected Jobs Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Affected Jobs ({affectedJobs?.count || 0})
              </h2>
              <button
                onClick={handleReassignJobs}
                disabled={reassignJobsMutation.isPending || selectedJobs.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
              >
                {reassignJobsMutation.isPending ? "Reassigning..." : "Reassign Selected Jobs"}
              </button>
            </div>
            
            <div className="p-6">
              {jobsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                  <span>Loading affected jobs...</span>
                </div>
              ) : jobsError ? (
                <div className="text-red-600 dark:text-red-400">
                  Error: {jobsErrorMsg?.message || "Failed to load affected jobs"}
                </div>
              ) : affectedJobs && affectedJobs.affected_jobs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={allJobsSelected}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Job ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pickup Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pickup Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Driver</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Vehicle</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contractor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {affectedJobs.affected_jobs.map((job: any) => (
                        <tr key={job.id} className="">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedJobs.includes(job.id)}
                              onChange={(e) => handleJobSelect(job.id, e.target.checked)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{job.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {job.pickup_date ? format(new Date(job.pickup_date), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{job.pickup_time || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {job.customer?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            <select
                              value={jobAssignments[job.id]?.driverId || ""}
                              onChange={(e) => handleAssignmentChange(job.id, "driverId", e.target.value)}
                              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={!selectedJobs.includes(job.id)}
                            >
                              <option value="">Select Driver</option>
                              {drivers
                                .filter(driver => driver.id !== leave.driver_id) // Exclude the driver on leave
                                .map((driver) => (
                                  <option key={driver.id} value={driver.id}>
                                    {driver.name}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            <select
                              value={jobAssignments[job.id]?.vehicleId || ""}
                              onChange={(e) => handleAssignmentChange(job.id, "vehicleId", e.target.value)}
                              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={!selectedJobs.includes(job.id)}
                            >
                              <option value="">Select Vehicle</option>
                              {vehicles.map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>
                                  {vehicle.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            <select
                              value={jobAssignments[job.id]?.contractorId || ""}
                              onChange={(e) => handleAssignmentChange(job.id, "contractorId", e.target.value)}
                              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={!selectedJobs.includes(job.id)}
                            >
                              <option value="">Select Contractor</option>
                              {contractors.map((contractor) => (
                                <option key={contractor.id} value={contractor.id}>
                                  {contractor.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            <input
                              type="text"
                              value={jobAssignments[job.id]?.notes || ""}
                              onChange={(e) => handleNotesChange(job.id, e.target.value)}
                              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                              placeholder="Enter notes"
                              disabled={!selectedJobs.includes(job.id)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                  No affected jobs found for this leave period.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-2">Leave Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The requested leave record could not be found.</p>
          <button
            onClick={() => router.push(`/drivers/leave/details/${leaveId}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Back to Leave Details
          </button>
        </div>
      )}
    </div>
  );
}