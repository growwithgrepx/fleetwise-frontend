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
    new_driver_id?: number;
    new_vehicle_id?: number;
    new_contractor_id?: number;
  }>>({});

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  
  // Custom modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [unassignedJobsCount, setUnassignedJobsCount] = useState(0);
  const [resolveConfirm, setResolveConfirm] = useState<((value: boolean) => void) | null>(null);

  // Fetch data
  const { data: drivers = [], isLoading: driversLoading } = useGetAllDrivers();
  const { data: vehicles = [] } = useGetAllVehicles();
  const { data: contractors = [] } = useGetAllContractors();

  // Shared date validation function
  const validateDates = (startDate: string, endDate: string): { valid: boolean; error?: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return { valid: false, error: "End date must be after start date" };
    }
    if (start < today) {
      return { valid: false, error: "Cannot create leave for past dates" };
    }
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return { valid: false, error: "Leave period cannot exceed 90 days" };
    }
    return { valid: true };
  };

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

      // Validate dates
      const validation = validateDates(startDate, endDate);
      if (!validation.valid) {
        toast.error(validation.error!);
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
        // Clear all related state to prevent stale data
        setAffectedJobs([]);
        setJobAssignments({});
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
    return affectedJobs; // Backend already filtered by date range
  }, [affectedJobs, selectedDriver, startDate, endDate]);

  // Handle assignment change - allow all three fields to be selected
  const handleAssignmentChange = (
    jobId: number,
    type: 'driver' | 'vehicle' | 'contractor',
    value: number | undefined
  ) => {
    setJobAssignments(prev => {
      const current = prev[jobId] || {};
      const updated = { ...current };
      if (type === 'driver') updated.new_driver_id = value;
      else if (type === 'vehicle') updated.new_vehicle_id = value;
      else if (type === 'contractor') updated.new_contractor_id = value;
      return { ...prev, [jobId]: updated };
    });
  };

  // Custom confirm function that returns a promise
  const customConfirm = (unassignedCount: number): Promise<boolean> => {
    return new Promise((resolve) => {
      setUnassignedJobsCount(unassignedCount);
      setShowConfirmModal(true);
      setResolveConfirm(() => resolve);
    });
  };

  // Handle modal confirm
  const handleModalConfirm = () => {
    setShowConfirmModal(false);
    if (resolveConfirm) {
      resolveConfirm(true);
    }
  };

  // Handle modal cancel
  const handleModalCancel = () => {
    setShowConfirmModal(false);
    if (resolveConfirm) {
      resolveConfirm(false);
    }
  };

  // Validate all assignments - modified logic:
  // - If no fields selected for a job, skip it (not required)
  // - If some but not all fields selected, mark as pending
  // - If all fields selected, mark as confirmed
  const validateAssignments = async (): Promise<boolean> => {
    if (affectedJobs.length === 0) return true;
    
    const unassignedJobs = affectedJobs.filter(job => {
      const assignment = jobAssignments[job.id];
      return !assignment || (!assignment.new_driver_id && !assignment.new_vehicle_id && !assignment.new_contractor_id);
    });
    
    if (unassignedJobs.length > 0) {
      const confirmed = await customConfirm(unassignedJobs.length);
      return confirmed; // Allow submission if user confirms
    }
    return true;
  };

  // Handle save assignments
  const handleSaveAssignments = async () => {
    if (!selectedDriver || !leaveType || !startDate || !endDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate dates
    const validation = validateDates(startDate, endDate);
    if (!validation.valid) {
      toast.error(validation.error!);
      return;
    }

    if (!jobsPreviewLoaded) {
      toast.error("Please preview affected jobs first");
      return;
    }

    // Validate assignments before saving
    const isValid = await validateAssignments();
    if (!isValid) {
      return;
    }

    setIsSaving(true);
    
    try {
      // Prepare job reassignments data - include all job IDs regardless of field selection
      const job_reassignments = filteredJobs.map((job: any) => {
        const assignment = jobAssignments[job.id];
        
        // Always include job_id and all three reassignment fields explicitly
        // Even if undefined, to maintain contract with backend
        return {
          job_id: job.id,
          new_driver_id: assignment?.new_driver_id,
          new_vehicle_id: assignment?.new_vehicle_id,
          new_contractor_id: assignment?.new_contractor_id,
          notes: `Reassigned due to ${leaveType} leave from ${startDate} to ${endDate}`
        };
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
          <div className="flex gap-2">
            <AnimatedButton
              onClick={() => router.push('/drivers/leave/history')}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white rounded-lg px-4 py-2"
            >
              Leave History
            </AnimatedButton>
            <AnimatedButton
              onClick={handleSaveAssignments}
              disabled={isSaving || !selectedDriver || !leaveType || !startDate || !endDate || !jobsPreviewLoaded}
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Saves driver's leave and job assignments. Jobs with no reassignment selected will be saved as pending after your confirmation."
            >
              {isSaving ? "Saving..." : "Save Leave and Jobs"}
            </AnimatedButton>
          </div>
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
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Affected Jobs ({filteredJobs.length})
            </h2>
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

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Confirm Unassigned Jobs</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-300">
                {unassignedJobsCount} job(s) have no field assignments and will move to PENDING status. Do you want to continue?
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleModalCancel}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleModalConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}