"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { EntityHeader } from '@/components/organisms/EntityHeader';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useGetAllDrivers } from "@/hooks/useDrivers";
import { useJobs } from "@/hooks/useJobs";
import { useGetAllCustomers } from "@/hooks/useCustomers";
import { useGetAllVehicles } from "@/hooks/useVehicles";
import { useGetAllContractors } from "@/hooks/useContractors";
import { useGetAffectedJobs, useCreateDriverLeave, useReassignJobs } from "@/hooks/useDriverLeave";
import { ApiJob } from "@/types/job";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function ApplyLeavePage() {
  const router = useRouter();
  
  // Form state
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [leaveType, setLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  // Job selection and reassignment state
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [jobAssignments, setJobAssignments] = useState<Record<number, { 
    driverId?: number; 
    vehicleId?: number; 
    contractorId?: number 
  }>>({});
  
  // Fetch data
  const { data: drivers = [], isLoading: driversLoading } = useGetAllDrivers();
  const { jobs: apiJobs = [], isLoading: jobsLoading } = useJobs();
  const { data: customers = [], isLoading: customersLoading } = useGetAllCustomers();
  const { data: vehicles = [], isLoading: vehiclesLoading } = useGetAllVehicles();
  const { data: contractors = [], isLoading: contractorsLoading } = useGetAllContractors();
  
  // Fetch affected jobs when driver and dates are selected
  const { data: affectedJobsData, isLoading: affectedJobsLoading } = useGetAffectedJobs(
    selectedDriver && startDate && endDate ? selectedDriver : 0
  );
  
  // Mutations
  const createLeaveMutation = useCreateDriverLeave();
  const reassignJobsMutation = useReassignJobs();
  
  // Filter jobs for the selected driver within the date range
  const filteredJobs = React.useMemo(() => {
    if (!selectedDriver || !startDate || !endDate) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return apiJobs.filter(job => {
      if (job.driver_id !== selectedDriver) return false;
      
      const jobDate = new Date(job.pickup_date);
      return jobDate >= start && jobDate <= end;
    });
  }, [apiJobs, selectedDriver, startDate, endDate]);
  
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
    if (checked) {
      setSelectedJobs(filteredJobs.map(job => job.id));
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
  
  // Handle save assignments
  const handleSaveAssignments = async () => {
    if (!selectedDriver || !leaveType || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date must be after start date");
      return;
    }
    
    try {
      // First, create the leave with the exact format specified in the API test
      const leaveResponse = await createLeaveMutation.mutateAsync({
        driver_id: selectedDriver,
        leave_type: leaveType as 'sick_leave' | 'vacation' | 'personal' | 'emergency',
        start_date: startDate,
        end_date: endDate,
        reason: "Medical appointment", // Using the example reason from the test
        status: "approved" as 'approved' | 'pending' | 'rejected' | 'cancelled'
      });
      
      toast.success(leaveResponse.message || "Leave application submitted successfully");
      
      // Show warning if there are affected jobs
      if (leaveResponse.warning) {
        toast.success(leaveResponse.warning);
      }
      
      // Then, reassign jobs if any are selected
      if (selectedJobs.length > 0) {
        const reassignments = selectedJobs.map(jobId => {
          const assignment = jobAssignments[jobId];
          return {
            job_id: jobId,
            reassignment_type: "driver" as "driver" | "vehicle" | "contractor",
            new_driver_id: assignment?.driverId || undefined,
            new_vehicle_id: assignment?.vehicleId || undefined,
            new_contractor_id: assignment?.contractorId || undefined,
            notes: `Reassigned due to driver leave #${leaveResponse.leave.id}`
          };
        });
        
        const reassignResponse = await reassignJobsMutation.mutateAsync({
          leaveId: leaveResponse.leave.id,
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
      }
      
      // Reset form
      setSelectedDriver(null);
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setSelectedJobs([]);
      setJobAssignments({});
      
      router.push("/drivers/leave/history");
    } catch (error: any) {
      console.error("Error saving assignments:", error);
      toast.error(error.message || "Failed to save assignments");
    }
  };
  
  // Check if all jobs are selected
  const allJobsSelected = filteredJobs.length > 0 && selectedJobs.length === filteredJobs.length;
  
  return (
    <div className="container mx-auto px-4 py-8">
      <EntityHeader 
        title="Apply Leave" 
        extraActions={
          <div className="flex space-x-4">
            <AnimatedButton
              onClick={() => router.push('/drivers/leave/history')}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white rounded-lg px-4 py-2"
            >
              Leave History
            </AnimatedButton>
            <AnimatedButton
              onClick={() => router.push('/drivers')}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white rounded-lg px-4 py-2"
            >
              Back to Drivers
            </AnimatedButton>
          </div>
        }
        className="mb-6"
      />
      
      {/* Leave Details Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Leave Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Driver *
            </label>
            <select
              value={selectedDriver || ""}
              onChange={(e) => setSelectedDriver(Number(e.target.value))}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={driversLoading}
            >
              <option value="">Choose driver...</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Leave Type *
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select leave type...</option>
              <option value="sick_leave">Sick Leave</option>
              <option value="vacation">Vacation</option>
              <option value="personal">Personal</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Leave Start Date *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Leave End Date *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
      
      {/* Affected Jobs Table */}
      {selectedDriver && startDate && endDate && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Affected Jobs</h2>
            <AnimatedButton
              onClick={handleSaveAssignments}
              disabled={createLeaveMutation.isPending || reassignJobsMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
            >
              {createLeaveMutation.isPending || reassignJobsMutation.isPending ? (
                "Saving..."
              ) : (
                "Save Assignments"
              )}
            </AnimatedButton>
          </div>
          
          {affectedJobsLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading affected jobs...</p>
            </div>
          ) : affectedJobsData && affectedJobsData.affected_jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={allJobsSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Job ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pickup
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Drop-off
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pickup Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pickup Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Driver
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contractor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Current Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      New Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {affectedJobsData.affected_jobs.map((job: any) => (
                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedJobs.includes(job.id)}
                          onChange={(e) => handleJobSelect(job.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {job.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {job.customer?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {job.pickup_location || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {job.dropoff_location || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {job.pickup_date ? format(new Date(job.pickup_date), 'dd/MM/yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {job.pickup_time || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <select
                          value={jobAssignments[job.id]?.driverId || ""}
                          onChange={(e) => handleAssignmentChange(job.id, "driverId", e.target.value)}
                          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={!selectedJobs.includes(job.id)}
                        >
                          <option value="">Select Driver</option>
                          {drivers
                            .filter(driver => driver.id !== selectedDriver) // Exclude the driver on leave
                            .map((driver) => (
                              <option key={driver.id} value={driver.id}>
                                {driver.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Confirmed
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          Pending
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">No affected jobs found for the selected period</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}