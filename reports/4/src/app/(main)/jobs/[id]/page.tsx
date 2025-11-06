"use client";
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { getJobById } from '@/services/api/jobsApi';
import JobDetailCard from '@/components/organisms/JobDetailCard';
import { Button } from '@/components/atoms/Button';
import { HiPencil, HiTrash, HiArrowLeft } from 'react-icons/hi2';

export default function ViewJobPage() {
    const router = useRouter();
    const params = useParams();
    const jobId = parseInt(params.id as string, 10);

    const { data: job, isLoading, error } = useQuery({
        queryKey: ['job', jobId],
        queryFn: () => getJobById(jobId),
        enabled: !!jobId,
    });

    if (isLoading) {
        return <div className="p-8 text-text-main">Loading job details...</div>;
    }

    if (error || !job) {
        return (
            <div className="p-8 text-red-500">
                Error: {error ? (error as Error).message : 'Job not found.'}
                 <Button variant="secondary" onClick={() => router.back()} className="mt-4">
                    <HiArrowLeft className="w-5 h-5 mr-2" />
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-main">View Job</h1>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => router.push(`/jobs/${jobId}/edit`)}>
                        <HiPencil className="w-5 h-5 mr-2" />
                        Edit
                    </Button>
                    <Button variant="danger" onClick={() => {/* Handle Delete */}}>
                        <HiTrash className="w-5 h-5 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>
            <JobDetailCard job={job} />
        </div>
    );
} 