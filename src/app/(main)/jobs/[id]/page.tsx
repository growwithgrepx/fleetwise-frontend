"use client";
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { getJobById } from '@/services/api/jobsApi';
import JobDetailCardWithActions from '@/components/organisms/JobDetailCardWithActions';
import { HiArrowLeft } from 'react-icons/hi2';

export default function ViewJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = parseInt(params.id as string, 10);

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJobById(jobId),
    enabled: !!jobId,
  });

  if (isLoading) return <div className="p-8 text-text-main">Loading job details...</div>;
  if (error || !job) return (
    <div className="p-8 text-red-500">
      {error ? (error as Error).message : 'Job not found.'}
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex items-center mb-4 gap-2">
        <button onClick={() => router.back()} className="text-text-secondary hover:text-text-main transition-colors">
          <HiArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-text-main">View Job</h1>
      </div>
      <JobDetailCardWithActions
        job={job}
        onEdit={() => router.push(`/jobs/${jobId}/edit`)}
        onDeleted={() => router.push('/jobs')}
        queryKey={['job', jobId]}
      />
    </div>
  );
}
