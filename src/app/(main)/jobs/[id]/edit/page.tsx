"use client";

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { getJobById } from '@/services/api/jobsApi';
import { useJobs } from '@/hooks/useJobs';
import JobForm from '@/components/organisms/JobForm';
import type { Job } from '@/types/types';
import { PageHeader } from '@/components/molecules/PageHeader';
import { Button } from '@/components/atoms/Button';
import { HiArrowLeft, HiCheck } from 'react-icons/hi2';
import toast from 'react-hot-toast';

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = parseInt(params.id as string, 10);
  const queryClient = useQueryClient();
  const { updateJobAsync, isUpdating } = useJobs();

  const { data: job, isLoading, error: fetchError } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJobById(jobId),
    enabled: !!jobId && !isNaN(jobId)
  });

  const handleSave = async (formData: any) => {
    try {
      await updateJobAsync({ id: jobId, data: formData });
      // Force refresh the current job data
      await queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Job updated successfully!');
      router.push('/jobs');
    } catch (error) {
      console.error('Failed to update job:', error);
      throw error; // Let the form handle the error
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await updateJobAsync({ id: Number(id), data: { status: 'cancelled' } as any });
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      router.push('/jobs');
    } catch (error) {
      console.error('Failed to cancel job:', error);
      // Let the JobForm component handle the error display
      throw error;
    }
  };

  const handleCancel = () => {
    router.push('/jobs');
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (fetchError || !job) {
    return (
        <div className="p-8 text-red-500">
            Error: {fetchError ? (fetchError as Error).message : 'Job not found.'}
             <Button variant="secondary" onClick={() => router.back()} className="mt-4">
                <HiArrowLeft className="w-5 h-5 mr-2" />
                Go Back
            </Button>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-8 pt-6 pb-4 border-b border-gray-200">
        <PageHeader title={`Edit Job #${jobId}`}>
          <Button variant="primary" type="submit" form="job-form" disabled={isUpdating}>
            <HiCheck className="w-5 h-5 mr-2" />
            {isUpdating ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="secondary" onClick={() => router.push('/jobs')} className="ml-2">
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Jobs
          </Button>
        </PageHeader>
      </div>
      
      <div className="flex-1 overflow-auto">
        <div className="w-full">
          <JobForm
            job={job as any}
            onSave={handleSave}
            onCancel={handleCancel}
            onDelete={jobId ? handleDelete : undefined}
            isLoading={isUpdating}
          />
        </div>
      </div>
    </div>
  );
} 