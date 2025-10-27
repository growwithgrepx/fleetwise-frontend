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
  const { createJob, isCreating, error } = useJobs();
  const { copiedJobData, clearCopiedJobData } = useCopiedJob();
  const { user } = useUser();
  const role = (user?.roles?.[0]?.name || "guest").toLowerCase();
    
    

  // Log any errors that occur
  useEffect(() => {
    if (error) {
      console.error('Error in useJobs hook:', error);
    }
  }, [error]);

  const handleSubmit = async (formData: JobFormData) => {
    try {
      await createJob(formData);
      // Clear the copied job data after successful creation
      clearCopiedJobData();
      toast.success('Job created successfully!');
      router.push('/jobs');
    } catch (err) {
      console.error('Failed to create job:', err);
      throw err;
    }
  };

  const handleCancel = () => {
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