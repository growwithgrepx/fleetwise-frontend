"use client";
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { getJobById, cancelJob, reinstateJob } from '@/services/api/jobsApi';
import * as jobsApi from '@/services/api/jobsApi';
import JobDetailCard from '@/components/organisms/JobDetailCard';
import JobAuditTrailModal from '@/components/organisms/JobAuditTrailModal';
import { Button } from '@/components/atoms/Button';
import { HiArrowLeft } from 'react-icons/hi2';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { UpdateJobStatusModal } from '@/components/molecules/UpdateJobStatusModal';
import { useJobs, jobKeys } from '@/hooks/useJobs';
import { useUser } from '@/context/UserContext';
import { useCopiedJob } from '@/context/CopiedJobContext';
import type { Job } from '@/types/job';
import toast from 'react-hot-toast';

const CANCELLATION_REASONS = [
  'Customer Request',
  'Driver Unavailable',
  'Operational Issue',
  'Entered in Error',
] as const;

export default function ViewJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = parseInt(params.id as string, 10);
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { setCopiedJobData } = useCopiedJob();
  const role = (user?.roles?.[0]?.name || 'guest').toLowerCase();
  const canManageLifecycle = !['driver', 'customer', 'guest'].includes(role);
  const canDelete = !['driver', 'customer', 'guest'].includes(role);

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => getJobById(jobId),
    enabled: !!jobId,
  });

  const { deleteJobAsync } = useJobs();

  // Delete
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const handleDelete = async () => {
    try {
      await deleteJobAsync(jobId);
      toast.success('Job deleted');
      router.push('/jobs');
    } catch { toast.error('Failed to delete job'); }
  };

  // Cancel
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const handleConfirmCancel = async () => {
    try {
      await cancelJob(jobId, cancellationReason);
      toast.success('Job canceled');
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      setCancelDialogOpen(false);
      setCancellationReason('');
    } catch { toast.error('Failed to cancel job'); }
  };

  // Reinstate
  const [reinstateOpen, setReinstateOpen] = useState(false);
  const handleReinstate = async () => {
    try {
      await reinstateJob(jobId);
      toast.success('Job re-instated');
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      setReinstateOpen(false);
    } catch { toast.error('Failed to re-instate job'); }
  };

  // Update Status
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);

  // Audit Trail
  const [auditTrailJobId, setAuditTrailJobId] = useState<number | null>(null);

  // Copy
  const handleCopy = async () => {
    try {
      const latestJob = await jobsApi.getJobById(jobId);
      if (!latestJob) { toast.error('Job not found'); return; }
      const { id, penalty, invoice_id, invoice_number, ...rest } = latestJob as any;
      setCopiedJobData({ ...rest, status: 'new' as const, vehicle_id: 0, driver_id: 0, driver_contact: '' });
      toast.success('Job copied! Redirecting to new job form...');
      router.push('/jobs/new');
    } catch { toast.error('Failed to copy job'); }
  };

  if (isLoading) return <div className="p-8 text-text-main">Loading job details...</div>;
  if (error || !job) return (
    <div className="p-8 text-red-500">
      Error: {error ? (error as Error).message : 'Job not found.'}
      <Button variant="secondary" onClick={() => router.back()} className="mt-4">
        <HiArrowLeft className="w-5 h-5 mr-2" /> Go Back
      </Button>
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

      <JobDetailCard
        job={job}
        onEdit={() => router.push(`/jobs/${jobId}/edit`)}
        onCopy={handleCopy}
        onDelete={() => setConfirmDeleteOpen(true)}
        onUpdateStatus={() => setUpdateStatusOpen(true)}
        onCancelJob={() => setCancelDialogOpen(true)}
        onReinstate={() => setReinstateOpen(true)}
        onViewAuditTrail={() => setAuditTrailJobId(jobId)}
        canDelete={canDelete}
        canManageLifecycle={canManageLifecycle}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Job?"
        description="Are you sure you want to delete this job? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {/* Cancel dialog */}
      {cancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-3 max-h-[90vh] w-full max-w-md rounded-lg border border-border-color bg-background-light p-4 shadow-xl sm:p-6">
            <h2 className="mb-2 text-base font-bold text-text-main">Cancel Job</h2>
            <p className="mb-4 text-text-secondary">Please select a reason for cancellation.</p>
            <select
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full rounded-lg border-border-color bg-background-light px-3 py-2 text-sm text-text-main mb-4 focus:border-primary focus:outline-none"
            >
              <option value="">Select a reason</option>
              {CANCELLATION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setCancelDialogOpen(false); setCancellationReason(''); }}
                className="px-4 py-2 rounded border border-border-color text-text-main hover:bg-background"
              >
                Close
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancellationReason}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Cancel Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reinstate confirm */}
      <ConfirmDialog
        open={reinstateOpen}
        title="Re-instate Job"
        description="Are you sure you want to re-instate this job?"
        confirmLabel="Re-instate"
        cancelLabel="Close"
        onConfirm={handleReinstate}
        onCancel={() => setReinstateOpen(false)}
      />

      {/* Update Status modal */}
      {updateStatusOpen && (
        <UpdateJobStatusModal
          job={job as unknown as Job}
          isOpen={updateStatusOpen}
          onClose={() => setUpdateStatusOpen(false)}
          onStatusUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['job', jobId] });
            queryClient.invalidateQueries({ queryKey: jobKeys.all });
            setUpdateStatusOpen(false);
          }}
        />
      )}

      {/* Audit Trail modal */}
      {auditTrailJobId !== null && (
        <JobAuditTrailModal
          jobId={auditTrailJobId}
          isOpen={true}
          onClose={() => setAuditTrailJobId(null)}
        />
      )}
    </div>
  );
}
