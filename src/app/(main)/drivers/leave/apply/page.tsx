"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EntityHeader } from '@/components/organisms/EntityHeader';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useGetAllDrivers } from "@/hooks/useDrivers";
import { useGetAllVehicles } from "@/hooks/useVehicles";
import { useGetAllContractors } from "@/hooks/useContractors";
import { previewAffectedJobs, createLeaveWithReassignments } from "@/services/api/driverLeaveApi";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function ApplyLeavePage() {
  const router = useRouter();

  // Form state
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [leaveType, setLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  // Affected jobs state
  const [affectedJobs, setAffectedJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobsPreviewLoaded, setJobsPreviewLoaded] = useState(false);

  // Job assignments state
  const [jobAssignments, setJobAssignments] = useState<Record<number, {
    reassignment_type: 'driver' | 'vehicle' | 'contractor';
    new_driver_id?: number;
    new_vehicle_id?: number;
    new_contractor_id?: number;
  }>>({});

  // UI state
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data
  const { data: drivers = [], isLoading: driversLoading } = useGetAllDrivers();
  const { data: vehicles = [] } = useGetAllVehicles();
  const { data: contractors = [] } = useGetAllContractors();

  // Automatically preview affected jobs when all required fields are filled
  useEffect(() => {
    const loadAffectedJobs = async () => {
      if (!selectedDriver || !startDate || !endDate) {
        // Reset if fields are incomplete
        setAffectedJobs([]);
        setJobsPreviewLoaded(false);
        setJobAssignments({});
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        toast.error("End date must be after start date");
        return;
      }
      
      if (start < today) {
        toast.error("Cannot create leave for past dates");
        return;
      }
      
      // Optional: Prevent unreasonably long leaves (e.g., > 90 days)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 90) {
        toast.error("Leave period cannot exceed 90 days");
        return;
      }

      setLoadingJobs(true);
      try {
        const response = await previewAffectedJobs(selectedDriver, startDate, endDate);
        setAffectedJobs(response.affected_jobs || []);
        setJobsPreviewLoaded(true);

        if (response.count === 0) {
          toast.success("No jobs will be affected during this leave period");
        } else {
          toast.success(`Found ${response.count} job(s) that need reassignment`);
        }
      } catch (error: any) {
        console.error("Error previewing affected jobs:", error);
        // Check if it's a leave conflict error during preview
        const errorMessage = error.response?.data?.error || "Failed to preview affected jobs";
        toast.error(errorMessage);
        setJobsPreviewLoaded(false);
      } finally {
        setLoadingJobs(false);
      }
    };

    loadAffectedJobs();
  }, [selectedDriver, startDate, endDate]);

  // Memoized filtered jobs for display
  const filteredJobs = React.useMemo(() => {
    if (!selectedDriver || !startDate || !endDate) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    return affectedJobs.filter(job => {
      const jobDate = new Date(job.pickup_date);
      return jobDate >= start && jobDate <= end;
    });
  }, [affectedJobs, selectedDriver, startDate, endDate]);

  // Handle assignment change - allow all three fields to be selected
  const handleAssignmentChange = (
    jobId: number,
    type: 'driver' | 'vehicle' | 'contractor',
    value: number | undefined
  ) => {
    setJobAssignments(prev => {
      const current = prev[jobId] || { reassignment_type: 'driver' };

      // Update the assignment based on type without clearing other fields
      if (type === 'driver') {
        return {
          ...prev,
          [jobId]: {
            ...current,
            new_driver_id: value
          }
        };
      } else if (type === 'vehicle') {
        return {
          ...prev,
          [jobId]: {
            ...current,
            reassignment_type: 'vehicle',
            new_vehicle_id: value
          }
        };
      } else if (type === 'contractor') {
        return {
          ...prev,
          [jobId]: {
            ...current,
            reassignment_type: 'contractor',
            new_contractor_id: value
          }
        };
      }

      return prev;
    });
  };

  // Validate all assignments - modified logic:
  // - If no fields selected for a job, skip it (not required)
  // - If some but not all fields selected, mark as pending
  // - If all fields selected, mark as confirmed
  const validateAssignments = (): boolean => {
    if (affectedJobs.length === 0) {
      return true; // No jobs to assign
    }

    for (const job of affectedJobs) {
      const assignment = jobAssignments[job.id];

      // If no assignment data for this job, it's not required - skip validation
      if (!assignment) {
        continue;
      }

      // Check if any fields are selected
      const hasDriver = !!assignment.new_driver_id;
      const hasVehicle = !!assignment.new_vehicle_id;
      const hasContractor = !!assignment.new_contractor_id;

      // If some but not all fields are selected, it's valid but will be pending
      // If all fields are selected, it's confirmed
      // If no fields are selected, we already skipped above
    }

    return true;
  };

  // Handle save assignments
  const handleSaveAssignments = async () => {
    if (!selectedDriver || !leaveType || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Comprehensive date validation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      toast.error("End date must be after start date");
      return;
    }
    
    if (start < today) {
      toast.error("Cannot create leave for past dates");
      return;
    }
    
    // Optional: Prevent unreasonably long leaves (e.g., > 90 days)
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      toast.error("Leave period cannot exceed 90 days");
      return;
    }

    if (!jobsPreviewLoaded) {
      toast.error("Please preview affected jobs first");
      return;
    }

    // Validate assignments before saving
    if (!validateAssignments()) {
      return;
    }

    setIsSaving(true);
    
    try {
      // Prepare job reassignments data
      const job_reassignments = Object.entries(jobAssignments).map(([jobId, assignment]) => {
        // Only include fields that have values
        const reassignment: any = {
          job_id: Number(jobId),
          reassignment_type: assignment.reassignment_type,
          notes: `Reassigned due to ${leaveType} leave from ${startDate} to ${endDate}`
        };
        
        // Conditionally include only defined fields
        if (assignment.new_driver_id) {
          reassignment.new_driver_id = assignment.new_driver_id;
        }
        if (assignment.new_vehicle_id) {
          reassignment.new_vehicle_id = assignment.new_vehicle_id;
        }
        if (assignment.new_contractor_id) {
          reassignment.new_contractor_id = assignment.new_contractor_id;
        }
        
        return reassignment;
      });

      // Create leave with reassignments atomically
      // This single API call ensures transactional consistency between leave creation and job reassignments
      const response = await createLeaveWithReassignments({
        driver_id: selectedDriver,
        leave_type: leaveType as 'sick_leave' | 'vacation' | 'personal' | 'emergency',
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
        job_reassignments: job_reassignments.length > 0 ? job_reassignments : undefined
      });

      toast.success(response.message);

      if (response.reassignment_summary) {
        const { successful, failed, total } = response.reassignment_summary;
        if (failed > 0) {
          // Some jobs failed to reassign
          toast.error(
            `Leave created but ${failed} job(s) failed to reassign. Reassign jobs manually from leave details.`,
            { duration: 8000 }
          );
          console.warn(`Failed to reassign ${failed} jobs out of ${total}`);
        } else if (total > 0) {
          // All jobs reassigned successfully
          toast.success(`Jobs reassigned: ${successful}/${total}`);
        }
      }

      // Reset form
      setSelectedDriver(null);
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setAffectedJobs([]);
      setJobAssignments({});
      setJobsPreviewLoaded(false);

      // Navigate to history
      router.push("/drivers/leave/history");
    } catch (error: any) {
      console.error("Error saving leave:", error);
      
      // Extract error message
      let errorMessage = "Failed to save leave application";
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage);
      
      // If it's a partial failure (leave created but reassignments failed), still navigate to history
      if (error.response?.data?.leave_id) {
        toast.error(
          "Leave created but job reassignment failed. Reassign jobs manually from leave details.",
          { duration: 8000 }
        );
        router.push("/drivers/leave/history");
        return;
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <EntityHeader
        title="Apply Leave"
        extraActions={
          <AnimatedButton
            onClick={() => router.push('/drivers/leave/history')}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white rounded-lg px-4 py-2"
          >
            Leave History
          </AnimatedButton>
        }
        className="mb-6"
      />

      {/* Leave Details Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Leave Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Reason (Optional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter leave reason..."
          />
        </div>

      </div>

      {/* Loading Indicator */}
      {loadingJobs && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading affected jobs...</p>
          </div>
        </div>
      )}

      {/* Affected Jobs Table */}
      {jobsPreviewLoaded && !loadingJobs && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Affected Jobs ({filteredJobs.length})
            </h2>
            <AnimatedButton
              onClick={handleSaveAssignments}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
            >
              {isSaving ? "Saving..." : "Save Assignments"}
            </AnimatedButton>
          </div>

          {filteredJobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Job ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pickup Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Pickup Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      New Driver
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      New Vehicle
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      New Contractor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredJobs.map((job: any) => {
                    const assignment = jobAssignments[job.id];

                    return (
                      <tr key={job.id} className="">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          #{job.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {job.pickup_date ? format(new Date(job.pickup_date), 'dd/MM/yyyy') : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {job.pickup_time || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {job.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <select
                            value={assignment?.new_driver_id || ""}
                            onChange={(e) => handleAssignmentChange(job.id, 'driver', e.target.value ? Number(e.target.value) : undefined)}
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Driver</option>
                            {drivers
                              .filter(driver => driver.id !== selectedDriver)
                              .map((driver) => (
                                <option key={driver.id} value={driver.id}>
                                  {driver.name}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <select
                            value={assignment?.new_vehicle_id || ""}
                            onChange={(e) => handleAssignmentChange(job.id, 'vehicle', e.target.value ? Number(e.target.value) : undefined)}
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            value={assignment?.new_contractor_id || ""}
                            onChange={(e) => handleAssignmentChange(job.id, 'contractor', e.target.value ? Number(e.target.value) : undefined)}
                            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Contractor</option>
                            {contractors.map((contractor) => (
                              <option key={contractor.id} value={contractor.id}>
                                {contractor.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                {!selectedDriver || !startDate || !endDate 
                  ? "Select driver and dates to view affected jobs"
                  : "No jobs scheduled for this driver during the selected period"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
