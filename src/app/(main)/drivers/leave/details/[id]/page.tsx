"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EntityHeader } from '@/components/organisms/EntityHeader';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useGetDriverLeave, useGetAffectedJobs, useDeleteDriverLeave, useUpdateDriverLeave } from "@/hooks/useDriverLeave";
import { useGetOverridesForLeave } from "@/hooks/useLeaveOverride";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function LeaveDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params promise
  const unwrappedParams = React.use(params);
  const router = useRouter();
  const leaveId = parseInt(unwrappedParams.id);
  
  // Fetch the specific leave details
  const { data: leave, isLoading: leaveLoading, isError: leaveError, error: leaveErrorMsg } = useGetDriverLeave(leaveId);

  // Fetch affected jobs for this leave
  const { data: affectedJobs, isLoading: jobsLoading, isError: jobsError, error: jobsErrorMsg } = useGetAffectedJobs(leaveId);

  // Fetch overrides for this leave
  const { data: overrides = [], isLoading: overridesLoading } = useGetOverridesForLeave(leaveId);
  
  // Mutation hook for updating driver leave
  const updateLeaveMutation = useUpdateDriverLeave();
  // Mutation hook for deleting driver leave
  const deleteLeaveMutation = useDeleteDriverLeave();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editLeaveType, setEditLeaveType] = useState<'sick_leave' | 'vacation' | 'personal' | 'emergency'>('sick_leave');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStatus, setEditStatus] = useState<'approved' | 'pending' | 'rejected' | 'cancelled'>('pending');
  const [editReason, setEditReason] = useState('');

  // Initialize form state when leave data is loaded
  React.useEffect(() => {
    if (leave) {
      setEditLeaveType(leave.leave_type as 'sick_leave' | 'vacation' | 'personal' | 'emergency');
      setEditStartDate(leave.start_date);
      setEditEndDate(leave.end_date);
      setEditStatus(leave.status as 'approved' | 'pending' | 'rejected' | 'cancelled');
      setEditReason(leave.reason || '');
    }
  }, [leave]);
  
  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };
  
  // Handle delete leave
  const handleDeleteLeave = async () => {
    try {
      await deleteLeaveMutation.mutateAsync(leaveId);
      toast.success("Leave deleted successfully");
      router.push('/drivers/leave/history');
    } catch (error: any) {
      console.error("Error deleting leave:", error);
      toast.error(error.message || "Failed to delete leave");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <EntityHeader 
        title="Leave Details" 
        extraActions={
          <AnimatedButton
            onClick={() => router.push('/drivers/leave/history')}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white rounded-lg px-4 py-2"
          >
            Back to Leave History
          </AnimatedButton>
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
          <AnimatedButton
            onClick={() => router.push('/drivers/leave/history')}
            className="mt-4 bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white rounded-lg px-4 py-2"
          >
            Back to Leave History
          </AnimatedButton>
        </div>
      ) : leave ? (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Leave #{leave.id}</h2>
                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeClass(leave.status)}`}>
                  {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {isEditing ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit Leave Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Leave Type
                        </label>
                        <select
                          value={editLeaveType}
                          onChange={(e) => setEditLeaveType(e.target.value as 'sick_leave' | 'vacation' | 'personal' | 'emergency')}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="sick_leave">Sick Leave</option>
                          <option value="vacation">Vacation</option>
                          <option value="personal">Personal</option>
                          <option value="emergency">Emergency</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Status
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as 'approved' | 'pending' | 'rejected' | 'cancelled')}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={(e) => setEditStartDate(e.target.value)}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Reason
                    </label>
                    <textarea
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter reason for leave..."
                    />
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <AnimatedButton
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md"
                    >
                      Cancel
                    </AnimatedButton>
                    <AnimatedButton
                      onClick={async () => {
                        // Handle save
                        try {
                          await updateLeaveMutation.mutateAsync({
                            leaveId: leaveId,
                            data: {
                              leave_type: editLeaveType,
                              start_date: editStartDate,
                              end_date: editEndDate,
                              status: editStatus,
                              reason: editReason
                            }
                          });
                          setIsEditing(false);
                          toast.success("Leave updated successfully");
                        } catch (error: any) {
                          console.error("Error updating leave:", error);
                          toast.error(error.message || "Failed to update leave");
                        }
                      }}
                      className="bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white px-4 py-2 rounded-md"
                    >
                      Save Changes
                    </AnimatedButton>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Leave Information</h3>
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Driver</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {leave.driver?.name || `Driver ${leave.driver_id}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Leave Type</p>
                            <p className="font-medium text-gray-900 dark:text-white capitalize">
                              {leave.leave_type.replace('_', ' ')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Start Date</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {format(new Date(leave.start_date), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">End Date</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {format(new Date(leave.end_date), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {Math.ceil((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Reason</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                      <p className="text-gray-800 dark:text-gray-200">
                        {leave.reason || 'No reason provided'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-3">
                      <AnimatedButton
                        onClick={() => router.push('/drivers/leave/history')}
                        className="bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white px-4 py-2 rounded-md"
                      >
                        Back to Leave History
                      </AnimatedButton>
                      <AnimatedButton
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white px-4 py-2 rounded-md"
                      >
                        Edit Leave
                      </AnimatedButton>
                      <AnimatedButton
                        onClick={() => router.push(`/drivers/leave/reassign/${leave.id}`)}
                        className="bg-gradient-to-r from-green-500 to-green-700 hover:opacity-90 text-white px-4 py-2 rounded-md"
                      >
                        Reassign Jobs
                      </AnimatedButton>
                      {leave.status === 'approved' && (
                        <AnimatedButton
                          onClick={() => router.push(`/drivers/leave-overrides?leaveId=${leave.id}`)}
                          className="bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white px-4 py-2 rounded-md"
                        >
                          Manage Overrides
                        </AnimatedButton>
                      )}
                      <AnimatedButton
                        onClick={handleDeleteLeave}
                        disabled={deleteLeaveMutation.isPending}
                        className="bg-gradient-to-r from-red-500 to-red-700 hover:opacity-90 text-white px-4 py-2 rounded-md disabled:opacity-50"
                      >
                        {deleteLeaveMutation.isPending ? "Deleting..." : "Delete Leave"}
                      </AnimatedButton>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Override Timeline Section */}
          {leave && leave.status === 'approved' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Available Time Windows ({overrides.length})
                </h2>
              </div>

              <div className="p-6">
                {overridesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                    <span>Loading overrides...</span>
                  </div>
                ) : overrides.length === 0 ? (
                  <div className="text-gray-600 dark:text-gray-400 text-center py-8">
                    No time window overrides created. Driver is unavailable during entire leave period.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {overrides.map((override: any) => {
                      const daysDiff = Math.floor((new Date(override.override_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24));
                      const totalDays = Math.floor((new Date(leave.end_date).getTime() - new Date(leave.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      const percentStart = (daysDiff / totalDays) * 100;
                      const percentWidth = (1 / totalDays) * 100;

                      return (
                        <div key={override.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {format(new Date(override.override_date), 'EEE, MMM d, yyyy')}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {override.start_time} - {override.end_time}
                              </p>
                            </div>
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold rounded-full">
                              Available
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                            Reason: {override.override_reason}
                          </p>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className="h-1.5 bg-green-500 rounded-full"
                              style={{
                                width: percentWidth + '%',
                                marginLeft: percentStart + '%'
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Affected Jobs Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Affected Jobs ({affectedJobs?.count || 0})
              </h2>
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Job ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pickup Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pickup Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {affectedJobs.affected_jobs.map((job: any) => (
                        <tr key={job.id} className="">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{job.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {job.pickup_date ? format(new Date(job.pickup_date), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{job.pickup_time || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {job.status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {job.customer?.name || 'N/A'}
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
      ) : null}
    </div>
  );
}






