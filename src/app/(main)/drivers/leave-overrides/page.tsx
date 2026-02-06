"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { EntityHeader } from '@/components/organisms/EntityHeader';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useGetDriverLeaves } from "@/hooks/useDriverLeave";
import { useGetOverridesForLeave } from "@/hooks/useLeaveOverride";
import { LeaveOverridesTable } from '@/components/organisms/LeaveOverridesTable';
import { LeaveOverrideModal } from '@/components/organisms/LeaveOverrideModal';
import { format } from "date-fns";

// Utility function to safely format time values
const formatTimeDisplay = (time: string | any): string => {
  if (!time) return '--:--';
  const timeStr = String(time);
  return timeStr.substring(0, 5); // Extract HH:MM from HH:MM:SS or other formats
};

export default function LeaveOverridesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leaveIdParam = searchParams.get('leaveId');

  const [selectedLeaveId, setSelectedLeaveId] = useState<number | null>(() => {
    if (!leaveIdParam) return null;
    const parsed = parseInt(leaveIdParam, 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : null;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending'>('approved');
  const [filterDriver, setFilterDriver] = useState<number | null>(null);

  // Fetch all driver leaves
  const { data: allLeaves = [], isLoading: leavesLoading } = useGetDriverLeaves();

  // Fetch overrides for selected leave
  const { data: overrides = [], isLoading: overridesLoading } = useGetOverridesForLeave(
    selectedLeaveId || 0
  );

  // Get unique drivers for dropdown
  const uniqueDrivers = useMemo(() => {
    const drivers = new Map<number, { id: number; name: string }>();
    allLeaves.forEach((leave) => {
      if (leave.driver_id && leave.driver?.name) {
        drivers.set(leave.driver_id, {
          id: leave.driver_id,
          name: leave.driver.name,
        });
      }
    });
    return Array.from(drivers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allLeaves]);

  // Filter leaves based on status and driver
  const filteredLeaves = useMemo(() => {
    return allLeaves.filter((leave) => {
      const matchesStatus = filterStatus === 'all' || leave.status === filterStatus;
      const matchesDriver = !filterDriver || leave.driver_id === filterDriver;

      return matchesStatus && matchesDriver;
    });
  }, [allLeaves, filterStatus, filterDriver]);

  // Get selected leave details
  const selectedLeave = selectedLeaveId
    ? allLeaves.find(l => l.id === selectedLeaveId)
    : null;

  return (
    <div className="w-full flex flex-col gap-4 px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <EntityHeader
        title="Leave Override Management"
        subtitle="Manage time window overrides for driver leaves"
        extraActions={
          <AnimatedButton
            onClick={() => router.push('/drivers/leave-overrides/bulk')}
            className="bg-gradient-to-r from-green-500 to-green-700 hover:opacity-90 text-white rounded-lg px-4 py-2"
          >
            Bulk Create
          </AnimatedButton>
        }
        className="mb-6"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Leave List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Driver Leaves
              </h2>
            </div>

            <div className="p-4 space-y-3">
              {/* Driver Filter Dropdown */}
              <select
                value={filterDriver || ''}
                onChange={(e) => setFilterDriver(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                <option value="">All Drivers</option>
                {uniqueDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <div className="flex gap-2">
                {(['all', 'approved', 'pending'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      filterStatus === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaves List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
              {leavesLoading ? (
                <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : filteredLeaves.length === 0 ? (
                <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No leaves found
                </div>
              ) : (
                filteredLeaves.map((leave) => (
                  <button
                    key={leave.id}
                    onClick={() => setSelectedLeaveId(leave.id)}
                    className={`w-full text-left px-6 py-3 transition ${
                      selectedLeaveId === leave.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {leave.driver?.name || `Driver ${leave.driver_id}`}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {format(new Date(leave.start_date), 'dd MMM')} - {format(new Date(leave.end_date), 'dd MMM')}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                        leave.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : leave.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Override Details */}
        <div className="lg:col-span-2">
          {selectedLeave ? (
            <div className="space-y-6">
              {/* Leave Summary */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Leave Summary
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Driver</p>
                      <p className="font-medium text-gray-900 dark:text-white mt-1">
                        {selectedLeave.driver?.name || `Driver ${selectedLeave.driver_id}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                      <p className="font-medium text-gray-900 dark:text-white mt-1">
                        {selectedLeave.status.charAt(0).toUpperCase() + selectedLeave.status.slice(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Leave Period</p>
                      <p className="font-medium text-gray-900 dark:text-white mt-1">
                        {format(new Date(selectedLeave.start_date), 'dd MMM yyyy')} - {format(new Date(selectedLeave.end_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                      <p className="font-medium text-gray-900 dark:text-white mt-1">
                        {selectedLeave.leave_type.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overrides */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Time Window Overrides ({overrides.length})
                  </h2>
                  {selectedLeave.status === 'approved' && (
                    <AnimatedButton
                      onClick={() => setIsModalOpen(true)}
                      className="bg-gradient-to-r from-green-500 to-green-700 hover:opacity-90 text-white px-4 py-2 rounded-md"
                    >
                      + Add Override
                    </AnimatedButton>
                  )}
                </div>
                <div className="p-6">
                  {selectedLeave.status !== 'approved' && (
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        Overrides can only be added to approved leaves
                      </p>
                    </div>
                  )}
                  <LeaveOverridesTable
                    overrides={overrides}
                    leaveId={selectedLeave.id}
                    isLoading={overridesLoading}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Select a driver leave from the list to view and manage its time window overrides
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Only approved leaves can have overrides
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Override Modal */}
      {selectedLeave && (
        <LeaveOverrideModal
          leaveId={selectedLeave.id}
          leaveStartDate={selectedLeave.start_date}
          leaveEndDate={selectedLeave.end_date}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            // Modal closes automatically, overrides refetch
          }}
        />
      )}
    </div>
  );
}
