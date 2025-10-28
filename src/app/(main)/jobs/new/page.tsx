"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useJobs } from '@/hooks/useJobs';
import JobForm from '@/components/organisms/JobForm';
import type { JobFormData } from '@/types/job';
import toast from 'react-hot-toast';
import { useCopiedJob } from '@/context/CopiedJobContext';
import { useUser } from '@/context/UserContext';
import NotAuthorizedPage from '@/app/not-authorized/page';

export default function NewJobPage() {
  const router = useRouter();
  const { createJob, createJobAsync, isCreating, error } = useJobs();
  const { copiedJobData, clearCopiedJobData } = useCopiedJob();
  const { user } = useUser();
  const role = (user?.roles?.[0]?.name || "guest").toLowerCase();
    
    

  console.log('[NewJobPage] Component rendered', { copiedJobData });

  // Log any errors that occur
  useEffect(() => {
    if (error) {
      console.error('[NewJobPage] Error in useJobs hook:', error);
    }
  }, [error]);

  // Debug: Log copied job data
  useEffect(() => {
    console.log('[NewJobPage] Copied job data in new job page:', copiedJobData);
  }, [copiedJobData]);

  const handleSubmit = async (formData: JobFormData) => {
    try {
      console.log('[NewJobPage] Creating job with data:', formData);
      const result = await createJobAsync(formData);
      console.log('[NewJobPage] Job creation result:', result);
      // Clear the copied job data after successful creation
      clearCopiedJobData();
      toast.success('Job created successfully!');
      router.push('/jobs');
    } catch (err) {
      console.error('[NewJobPage] Failed to create job:', err);
      toast.error('Failed to create job. Please try again.');
      throw err;
    }
  };

  const handleCancel = () => {
    console.log('[NewJobPage] Cancel button clicked');
    // Clear the copied job data when canceling
    clearCopiedJobData();
    router.push('/jobs');
  };
   if (["driver"].includes(role)) {
    return <NotAuthorizedPage />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <JobForm
        initialData={copiedJobData || undefined}
        onSave={handleSubmit}
        isLoading={isCreating}
        onCancel={handleCancel}
      /> 
    </div>
  );
}