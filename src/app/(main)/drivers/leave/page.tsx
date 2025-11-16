"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { EntityHeader } from '@/components/organisms/EntityHeader';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

export default function DriverLeavePage() {
  const router = useRouter();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <EntityHeader 
        title="Driver Leave Management" 
        extraActions={
          <button 
            onClick={() => router.push('/drivers')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Back to Drivers
          </button>
        }
        className="mb-6"
      />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Apply Leave</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Submit a leave application for a driver, including selecting leave dates and reassigning affected jobs.
            </p>
            <AnimatedButton 
              onClick={() => router.push('/drivers/leave/apply')}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500"
            >
              Apply Leave
            </AnimatedButton>
          </div>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Leave History</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              View historical leave records for all drivers, including leave types, dates, and approval status.
            </p>
            <AnimatedButton 
              onClick={() => router.push('/drivers/leave/history')}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500"
            >
              View History
            </AnimatedButton>
          </div>
        </div>
      </div>
    </div>
  );
}