"use client";

import React, { useState } from 'react';
import { LeaveOverride, AffectedJob, getAffectedJobsForOverride } from '@/services/api/leaveOverrideApi';
import { format } from 'date-fns';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import toast from 'react-hot-toast';
import { useDeleteOverride } from '@/hooks/useLeaveOverride';

// Utility function to safely format time values
const formatTimeDisplay = (time: string | any): string => {
  if (!time) return '--:--';
  const timeStr = String(time);
  return timeStr.substring(0, 5); // Extract HH:MM from HH:MM:SS or other formats
};

interface LeaveOverridesTableProps {
  overrides: LeaveOverride[];
  leaveId: number;
  isLoading?: boolean;
}

export function LeaveOverridesTable({
  overrides,
  leaveId,
  isLoading = false,
}: LeaveOverridesTableProps) {
  const deleteOverrideMutation = useDeleteOverride();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showAffectedJobsModal, setShowAffectedJobsModal] = useState(false);
  const [affectedJobs, setAffectedJobs] = useState<AffectedJob[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isLoadingAffectedJobs, setIsLoadingAffectedJobs] = useState(false);

  const handleDelete = async (overrideId: number) => {
    setConfirmDeleteId(overrideId);
    setIsLoadingAffectedJobs(true);

    try {
      // First, ONLY fetch affected jobs (don't delete yet)
      const jobs = await getAffectedJobsForOverride(leaveId, overrideId);
      setAffectedJobs(jobs || []);
      setShowAffectedJobsModal(true);
    } catch (error: any) {
      console.error('Error checking affected jobs:', error);
      toast.error(error.message || 'Failed to check affected jobs');
    } finally {
      setIsLoadingAffectedJobs(false);
    }
  };

  const handleProceedToConfirm = () => {
    // After reviewing affected jobs, show final confirmation
    setShowAffectedJobsModal(false);
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteId === null) return;

    try {
      setDeletingId(confirmDeleteId);
      // Now actually delete the override after confirmation
      await deleteOverrideMutation.mutateAsync({ leaveId, overrideId: confirmDeleteId });
      toast.success('Override deleted successfully');
      setShowConfirmDelete(false);
      setConfirmDeleteId(null);
      setAffectedJobs([]);
    } catch (error: any) {
      console.error('Error deleting override:', error);
      toast.error(error.message || 'Failed to delete override');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading overrides...</p>
      </div>
    );
  }

  if (!overrides || overrides.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">No time window overrides created yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Time Window
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Created By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {overrides.map((override) => (
              <tr key={override.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  {format(new Date(override.override_date), 'dd MMM yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                    {formatTimeDisplay(override.start_time)} - {formatTimeDisplay(override.end_time)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                  {override.override_reason}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {override.created_by_user?.name || override.created_by_user?.email || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <AnimatedButton
                    onClick={() => handleDelete(override.id)}
                    disabled={deletingId === override.id}
                    className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === override.id ? 'Deleting...' : 'Delete'}
                  </AnimatedButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Delete Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
              onClick={() => setShowConfirmDelete(false)}
            ></div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full sm:max-w-md">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-red-600 dark:text-red-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4v2m-6-4a9 9 0 1118 0 9 9 0 01-18 0z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Delete Override
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Are you sure you want to delete this override? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <AnimatedButton
                  onClick={handleConfirmDelete}
                  disabled={deletingId !== null}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {deletingId ? 'Deleting...' : 'Delete'}
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => setShowConfirmDelete(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </AnimatedButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Affected Jobs Warning Modal */}
      {showAffectedJobsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
              onClick={() => setShowAffectedJobsModal(false)}
            ></div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full sm:max-w-2xl">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                      Affected Jobs Warning
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                      {affectedJobs.length > 0
                        ? `Found ${affectedJobs.length} job(s) assigned during this time window. Deleting this override will no longer make the driver available, which could impact these assignments.`
                        : 'No jobs were found assigned during this time window.'}
                    </p>

                    {/* Affected jobs table */}
                    <div className="overflow-x-auto mb-4">
                      {affectedJobs.length > 0 ? (
                        <table className="min-w-full text-sm border border-gray-300 dark:border-gray-600 rounded">
                          <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white">
                                Customer
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white">
                                Service
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white">
                                Pickup Time
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-300 dark:divide-gray-600">
                            {affectedJobs.map((job) => (
                              <tr key={job.job_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{job.customer}</td>
                                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{job.service}</td>
                                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{formatTimeDisplay(job.pickup_time)}</td>
                                <td className="px-4 py-2">
                                  <span
                                    className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                      job.status === 'confirmed'
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                        : job.status === 'pending'
                                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                    }`}
                                  >
                                    {job.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                          <p>No jobs found for this time window</p>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Please review these jobs before proceeding with the deletion.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <AnimatedButton
                  onClick={handleProceedToConfirm}
                  disabled={isLoadingAffectedJobs}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Proceed to Delete
                </AnimatedButton>
                <AnimatedButton
                  onClick={() => {
                    setShowAffectedJobsModal(false);
                    setAffectedJobs([]);
                    setConfirmDeleteId(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </AnimatedButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
