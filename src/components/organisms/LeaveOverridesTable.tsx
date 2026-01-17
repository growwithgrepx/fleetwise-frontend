"use client";

import React, { useState } from 'react';
import { LeaveOverride } from '@/services/api/leaveOverrideApi';
import { format } from 'date-fns';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import toast from 'react-hot-toast';
import { useDeleteOverride } from '@/hooks/useLeaveOverride';

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

  const handleDelete = async (overrideId: number) => {
    if (!window.confirm('Are you sure you want to delete this override?')) {
      return;
    }

    try {
      setDeletingId(overrideId);
      await deleteOverrideMutation.mutateAsync({ leaveId, overrideId });
      toast.success('Override deleted successfully');
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
                    {override.start_time} - {override.end_time}
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
    </div>
  );
}
