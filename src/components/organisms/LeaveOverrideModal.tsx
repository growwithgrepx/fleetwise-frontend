"use client";

import React, { useState, useEffect } from 'react';
import { LeaveOverride, CreateOverrideRequest } from '@/services/api/leaveOverrideApi';
import { useCreateOverride } from '@/hooks/useLeaveOverride';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import toast from 'react-hot-toast';

interface LeaveOverrideModalProps {
  leaveId: number;
  leaveStartDate: string; // YYYY-MM-DD
  leaveEndDate: string; // YYYY-MM-DD
  isOpen: boolean;
  onClose: () => void;
  override?: LeaveOverride | null;
  onSuccess?: () => void;
}

export function LeaveOverrideModal({
  leaveId,
  leaveStartDate,
  leaveEndDate,
  isOpen,
  onClose,
  override,
  onSuccess,
}: LeaveOverrideModalProps) {
  const createOverrideMutation = useCreateOverride();

  // Form state
  const [overrideDate, setOverrideDate] = useState('');
  const [startTime, setStartTime] = useState('09:00:00');
  const [endTime, setEndTime] = useState('17:00:00');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form with existing override data or reset
  useEffect(() => {
    if (override) {
      setOverrideDate(override.override_date);
      setStartTime(override.start_time);
      setEndTime(override.end_time);
      setReason(override.override_reason);
    } else {
      // Set default values
      setOverrideDate(leaveStartDate);
      setStartTime('09:00:00');
      setEndTime('17:00:00');
      setReason('');
    }
    setErrors({});
  }, [override, isOpen, leaveStartDate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate date is within leave period
    if (!overrideDate) {
      newErrors.overrideDate = 'Date is required';
    } else if (overrideDate < leaveStartDate || overrideDate > leaveEndDate) {
      newErrors.overrideDate = `Date must be between ${leaveStartDate} and ${leaveEndDate}`;
    }

    // Validate times
    if (!startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!endTime) {
      newErrors.endTime = 'End time is required';
    }
    if (startTime && endTime && startTime >= endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    // Validate reason
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
      const data: CreateOverrideRequest = {
        override_date: overrideDate,
        start_time: formatTimeWithSeconds(startTime),
        end_time: formatTimeWithSeconds(endTime),
        override_reason: reason.trim(),
      };

      await createOverrideMutation.mutateAsync({ leaveId, data });
      toast.success('Override created successfully');
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating override:', error);
      toast.error(error.message || 'Failed to create override');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full sm:max-w-lg">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Create Time Window Override
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Date field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Override Date
                    </label>
                    <input
                      type="date"
                      value={overrideDate}
                      onChange={(e) => setOverrideDate(e.target.value)}
                      min={leaveStartDate}
                      max={leaveEndDate}
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
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
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
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
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
                      placeholder="e.g., Doctor appointment, Client meeting, etc."
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
                </form>
              </div>
            </div>
          </div>

          {/* Modal footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <AnimatedButton
              onClick={handleSubmit}
              disabled={createOverrideMutation.isPending}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {createOverrideMutation.isPending ? 'Creating...' : 'Create Override'}
            </AnimatedButton>
            <AnimatedButton
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </AnimatedButton>
          </div>
        </div>
      </div>
    </div>
  );
}
