"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { EntityHeader } from '@/components/organisms/EntityHeader';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { useGetDriverLeaves } from "@/hooks/useDriverLeave";
import { useBulkCreateOverrides } from "@/hooks/useLeaveOverride";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function BulkLeaveOverridesPage() {
  const router = useRouter();
  const { data: allLeaves = [], isLoading: leavesLoading } = useGetDriverLeaves();
  const bulkCreateMutation = useBulkCreateOverrides();

  // Form state
  const [selectedLeaveIds, setSelectedLeaveIds] = useState<number[]>([]);
  const [overrideDate, setOverrideDate] = useState('');
  const [startTime, setStartTime] = useState('09:00:00');
  const [endTime, setEndTime] = useState('17:00:00');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('approved');
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Filter approved leaves only
  const approvedLeaves = useMemo(() => {
    return allLeaves.filter((leave) => {
      const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
      const matchesSearch =
        !searchFilter ||
        leave.driver?.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        leave.driver?.email?.toLowerCase().includes(searchFilter.toLowerCase());

      return matchesStatus && matchesSearch && leave.status === 'approved';
    });
  }, [allLeaves, statusFilter, searchFilter]);

  // Get unique drivers for header display
  const selectedDrivers = useMemo(() => {
    return approvedLeaves
      .filter(leave => selectedLeaveIds.includes(leave.id))
      .map(leave => leave.driver?.name || `Driver ${leave.driver_id}`)
      .filter((name, idx, arr) => arr.indexOf(name) === idx); // unique names
  }, [approvedLeaves, selectedLeaveIds]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedLeaveIds.length === 0) {
      newErrors.selectedLeaves = 'Please select at least one leave';
    }

    if (!overrideDate) {
      newErrors.overrideDate = 'Date is required';
    }

    if (!startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (!reason.trim()) {
      newErrors.reason = 'Reason is required';
    } else if (reason.length > 512) {
      newErrors.reason = 'Reason cannot exceed 512 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatTimeWithSeconds = (time: string): string => {
    // Ensure time is in HH:MM:SS format
    if (!time.includes(':')) {
      return time;
    }
    const parts = time.split(':');
    if (parts.length === 2) {
      return `${parts[0]}:${parts[1]}:00`;
    }
    return time;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await bulkCreateMutation.mutateAsync({
        driver_leave_ids: selectedLeaveIds,
        override_date: overrideDate,
        start_time: formatTimeWithSeconds(startTime),
        end_time: formatTimeWithSeconds(endTime),
        override_reason: reason.trim(),
      });

      setResults(result);
      setShowResults(true);
      toast.success(`Created ${result.summary.successful} overrides successfully!`);
    } catch (error: any) {
      console.error('Error creating bulk overrides:', error);
      toast.error(error.message || 'Failed to create overrides');
    }
  };

  const toggleLeaveSelection = (leaveId: number) => {
    setSelectedLeaveIds(prev =>
      prev.includes(leaveId)
        ? prev.filter(id => id !== leaveId)
        : [...prev, leaveId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeaveIds.length === approvedLeaves.length) {
      setSelectedLeaveIds([]);
    } else {
      setSelectedLeaveIds(approvedLeaves.map(leave => leave.id));
    }
  };

  if (showResults && results) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EntityHeader
          title="Bulk Override Results"
          subtitle="Summary of bulk override creation"
          className="mb-6"
        />

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total Attempted</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {results.summary.total_attempted}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-green-200 dark:border-green-900/30 p-6">
              <p className="text-sm text-green-600 dark:text-green-400 mb-2">Successful</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {results.summary.successful}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900/30 p-6">
              <p className="text-sm text-red-600 dark:text-red-400 mb-2">Failed</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {results.summary.failed}
              </p>
            </div>
          </div>

          {/* Successful Overrides */}
          {results.success.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
                <h2 className="text-lg font-medium text-green-900 dark:text-green-300 flex items-center gap-2">
                  <CheckIcon className="w-5 h-5" />
                  Successfully Created ({results.success.length})
                </h2>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {results.success.map((override: any) => {
                    const leave = allLeaves.find(l => l.id === override.driver_leave_id);
                    return (
                      <div key={override.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {leave?.driver?.name || `Leave ${override.driver_leave_id}`}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {overrideDate} | {startTime.substring(0, 5)} - {endTime.substring(0, 5)}
                          </p>
                        </div>
                        <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Failed Overrides */}
          {results.failed.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
                <h2 className="text-lg font-medium text-red-900 dark:text-red-300 flex items-center gap-2">
                  <XMarkIcon className="w-5 h-5" />
                  Failed ({results.failed.length})
                </h2>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {results.failed.map((failure: any, idx: number) => {
                    const leave = allLeaves.find(l => l.id === failure.driver_leave_id);
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {leave?.driver?.name || `Leave ${failure.driver_leave_id}`}
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {failure.error}
                          </p>
                        </div>
                        <XMarkIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6">
            <AnimatedButton
              onClick={() => router.push('/drivers/leave-overrides')}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white px-6 py-2 rounded-md"
            >
              Back to Overrides
            </AnimatedButton>
            <AnimatedButton
              onClick={() => {
                setShowResults(false);
                setSelectedLeaveIds([]);
                setOverrideDate('');
                setStartTime('09:00:00');
                setEndTime('17:00:00');
                setReason('');
              }}
              className="bg-gradient-to-r from-gray-500 to-gray-700 hover:opacity-90 text-white px-6 py-2 rounded-md"
            >
              Create Another
            </AnimatedButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <EntityHeader
        title="Create Bulk Override"
        subtitle="Create time window overrides for multiple drivers at once"
        extraActions={
          <AnimatedButton
            onClick={() => router.push('/drivers/leave-overrides')}
            className="bg-gradient-to-r from-gray-500 to-gray-700 hover:opacity-90 text-white rounded-lg px-4 py-2"
          >
            Back to Overrides
          </AnimatedButton>
        }
        className="mb-6"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Driver Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-4">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Select Leaves ({selectedLeaveIds.length})
              </h2>
            </div>

            <div className="p-4 space-y-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Search driver..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              />

              {/* Select All */}
              <button
                onClick={toggleSelectAll}
                className="w-full px-3 py-2 text-sm font-semibold rounded-md transition bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50"
              >
                {selectedLeaveIds.length === approvedLeaves.length ? 'Deselect All' : 'Select All'}
              </button>

              {/* Status Filter */}
              <div className="flex gap-2">
                {(['all', 'approved', 'pending'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {errors.selectedLeaves && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.selectedLeaves}</p>
              )}
            </div>

            {/* Leaves List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
              {leavesLoading ? (
                <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : approvedLeaves.length === 0 ? (
                <div className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No approved leaves found
                </div>
              ) : (
                approvedLeaves.map((leave) => (
                  <label key={leave.id} className="px-6 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={selectedLeaveIds.includes(leave.id)}
                      onChange={() => toggleLeaveSelection(leave.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {leave.driver?.name || `Driver ${leave.driver_id}`}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {format(new Date(leave.start_date), 'dd MMM')} - {format(new Date(leave.end_date), 'dd MMM')}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Override Details
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Selected Drivers Summary */}
              {selectedDrivers.length > 0 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-sm text-blue-700 dark:text-blue-400 font-medium mb-2">
                    Selected Drivers ({selectedDrivers.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDrivers.map((name, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded-full">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Date field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Override Date
                </label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.overrideDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.overrideDate && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.overrideDate}</p>
                )}
              </div>

              {/* Time window */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime.substring(0, 5)}
                    onChange={(e) => setStartTime(e.target.value + ':00')}
                    step="60"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.startTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.startTime && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startTime}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime.substring(0, 5)}
                    onChange={(e) => setEndTime(e.target.value + ':00')}
                    step="60"
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.endTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.endTime && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endTime}</p>
                  )}
                </div>
              </div>

              {/* Reason field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for Override
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="e.g., Special event, All staff available for backup, etc."
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.reason ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {reason.length}/512 characters
                </p>
                {errors.reason && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.reason}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <AnimatedButton
                  type="submit"
                  disabled={bulkCreateMutation.isPending || selectedLeaveIds.length === 0}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bulkCreateMutation.isPending ? 'Creating Overrides...' : `Create Overrides for ${selectedLeaveIds.length} Driver${selectedLeaveIds.length !== 1 ? 's' : ''}`}
                </AnimatedButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
