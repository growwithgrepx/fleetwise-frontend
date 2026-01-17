import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PhoneIcon, BellIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Job } from '@/types/job';

interface JobMonitoringAlert {
  id: number;
  jobId: number;
  driverName: string;
  driverContact: string;
  pickupTime: string; // ISO string
  passengerDetails: string;
  elapsedTime: number; // in minutes
  createdAt: string; // ISO string
  dismissed: boolean;
  maxRemindersReached: boolean;
  reminderCount: number;
}

interface JobMonitoringAlertsProps {
  alerts: JobMonitoringAlert[];
  onDismiss: (alertId: number) => void;
  onStartTrip: (jobId: number) => void;
}

const JobMonitoringAlerts: React.FC<JobMonitoringAlertsProps> = ({ 
  alerts, 
  onDismiss, 
  onStartTrip 
}) => {
  const router = useRouter();
  
  // Filter out dismissed alerts
  const activeAlerts = alerts.filter(alert => !alert.dismissed);
  
  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-md space-y-3">
      {activeAlerts.map((alert) => (
        <div 
          key={alert.id} 
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 animate-slide-in-right"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 pt-1">
                <BellIcon className="h-6 w-6 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Overdue Job #{alert.jobId}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Driver: {alert.driverName}
                </p>
                <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span>
                    Scheduled: {new Date(alert.pickupTime).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Passenger: {alert.passengerDetails}
                </div>
                <div className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                  {alert.elapsedTime} minutes overdue
                </div>
                {alert.reminderCount > 0 && (
                  <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                    Reminder #{alert.reminderCount}
                  </div>
                )}
                {alert.maxRemindersReached && (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Max reminders reached
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => onDismiss(alert.id)}
                className="inline-flex items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="mt-4 flex space-x-3">
            <button
              onClick={() => router.push(`/jobs/${alert.jobId}`)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              View Job
            </button>
            <button
              onClick={() => onStartTrip(alert.jobId)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Start Trip
            </button>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <a
              href={`tel:${alert.driverContact}`}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <PhoneIcon className="h-4 w-4 mr-1" />
              Call Driver
            </a>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(alert.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default JobMonitoringAlerts;