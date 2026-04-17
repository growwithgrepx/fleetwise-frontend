"use client";

/**
 * JobDetailCardWithActions
 * ─────────────────────────
 * Drop-in wrapper around JobDetailCard that owns ALL action logic:
 * modals, cancel/reinstate/delete/copy/update-status/audit-trail.
 *
 * Usage:
 *   <JobDetailCardWithActions job={job} onEdit={(j) => router.push(`/jobs/${j.id}/edit`)} />
 *
 * onEdit is optional — if omitted the Edit icon is hidden.
 * All other icons are shown automatically based on the user's role.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import type { ApiJob, Job } from '@/types/job';
import { useUser } from '@/context/UserContext';
import { useCopiedJob } from '@/context/CopiedJobContext';
import { useJobs, jobKeys } from '@/hooks/useJobs';
import * as jobsApi from '@/services/api/jobsApi';
import { cancelJob, reinstateJob } from '@/services/api/jobsApi';

import JobDetailCard from '@/components/organisms/JobDetailCard';
import JobAuditTrailModal from '@/components/organisms/JobAuditTrailModal';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { UpdateJobStatusModal } from '@/components/molecules/UpdateJobStatusModal';

const CANCELLATION_REASONS = [
  'Customer Request',
  'Driver Unavailable',
  'Operational Issue',
  'Entered in Error',
] as const;

const JOB_STATUS_LABELS: Record<string, string> = {
  new: 'New', pending: 'Pending', confirmed: 'Confirmed',
  otw: 'On The Way', ots: 'On The Spot', pob: 'Passenger On Board',
  jc: 'Job Completed', sd: 'Stand Down', canceled: 'Canceled',
};

interface JobDetailCardWithActionsProps {
  job: ApiJob;
  /** Called when user clicks Edit. If omitted, Edit icon is hidden. */
  onEdit?: (job: Job) => void;
  /** Called after delete succeeds — e.g. to navigate away */
  onDeleted?: () => void;
  /** Invalidation key prefix — defaults to jobKeys.all */
  queryKey?: unknown[];
}

export default function JobDetailCardWithActions({
  job,
  onEdit,
  onDeleted,
  queryKey,
}: JobDetailCardWithActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { setCopiedJobData } = useCopiedJob();
  const { deleteJobAsync } = useJobs();

  const role = (user?.roles?.[0]?.name || 'guest').toLowerCase();
  const canManageLifecycle = !['driver', 'customer', 'guest'].includes(role);
  const canDelete = !['driver', 'customer', 'guest'].includes(role);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKey ?? jobKeys.all });
    queryClient.invalidateQueries({ queryKey: ['job', job.id] });
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const handleConfirmDelete = async () => {
    try {
      await deleteJobAsync(job.id as number);
      toast.success('Job deleted');
      invalidate();
      setDeleteOpen(false);
      onDeleted?.();
    } catch { toast.error('Failed to delete job'); }
  };

  // ── Cancel ───────────────────────────────────────────────────────────────
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const handleConfirmCancel = async () => {
    try {
      await cancelJob(job.id as number, cancelReason);
      toast.success('Job canceled');
      invalidate();
      setCancelOpen(false);
      setCancelReason('');
    } catch { toast.error('Failed to cancel job'); }
  };

  // ── Reinstate ────────────────────────────────────────────────────────────
  const [reinstateOpen, setReinstateOpen] = useState(false);
  const handleConfirmReinstate = async () => {
    try {
      await reinstateJob(job.id as number);
      toast.success('Job re-instated');
      invalidate();
      setReinstateOpen(false);
    } catch { toast.error('Failed to re-instate job'); }
  };

  // ── Update Status ────────────────────────────────────────────────────────
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const handleUpdateStatus = (j: Job) => {
    if (j.status === 'sd' || j.status === 'jc') {
      toast.error(`Cannot update status for a job in ${JOB_STATUS_LABELS[j.status]} state.`);
      return;
    }
    if (j.status === 'canceled') {
      toast.error('Cannot update status for a canceled job. Please re-instate it first.');
      return;
    }
    setUpdateStatusOpen(true);
  };

  // ── Copy ─────────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      const latestJob = await jobsApi.getJobById(job.id as number);
      if (!latestJob) { toast.error('Job not found'); return; }
      const { id, penalty, invoice_id, invoice_number, ...rest } = latestJob as any;
      setCopiedJobData({ ...rest, status: 'new' as const, vehicle_id: 0, driver_id: 0, driver_contact: '' });
      toast.success('Job copied! Redirecting to new job form...');
      router.push('/jobs/new');
    } catch { toast.error('Failed to copy job'); }
  };

  // ── Audit Trail ──────────────────────────────────────────────────────────
  const [auditTrailId, setAuditTrailId] = useState<number | null>(null);

  return (
    <>
      <JobDetailCard
        job={job}
        onEdit={onEdit}
        onCopy={handleCopy}
        onDelete={canDelete ? () => setDeleteOpen(true) : undefined}
        onUpdateStatus={canManageLifecycle ? handleUpdateStatus : undefined}
        onCancelJob={canManageLifecycle ? () => setCancelOpen(true) : undefined}
        onReinstate={canManageLifecycle ? () => setReinstateOpen(true) : undefined}
        onViewAuditTrail={() => setAuditTrailId(job.id as number)}
        canDelete={canDelete}
        canManageLifecycle={canManageLifecycle}
      />

      {/* Delete */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Job?"
        description="Are you sure you want to delete this job? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* Cancel */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-3 max-h-[90vh] w-full max-w-md rounded-lg border border-border-color bg-background-light p-4 shadow-xl sm:p-6">
            <h2 className="mb-2 text-base font-bold text-text-main">Cancel Job</h2>
            <p className="mb-4 text-text-secondary">Please select a reason for cancellation.</p>
            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full rounded-lg border-border-color bg-background-light px-3 py-2 text-sm text-text-main mb-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select a reason</option>
              {CANCELLATION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setCancelOpen(false); setCancelReason(''); }}
                className="px-4 py-2 rounded border border-border-color text-text-main hover:bg-background"
              >Close</button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancelReason}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >Cancel Job</button>
            </div>
          </div>
        </div>
      )}

      {/* Reinstate */}
      <ConfirmDialog
        open={reinstateOpen}
        title="Re-instate Job"
        description="Are you sure you want to re-instate this job?"
        confirmLabel="Re-instate"
        cancelLabel="Close"
        onConfirm={handleConfirmReinstate}
        onCancel={() => setReinstateOpen(false)}
      />

      {/* Update Status */}
      {updateStatusOpen && (
        <UpdateJobStatusModal
          job={job as unknown as Job}
          isOpen={updateStatusOpen}
          onClose={() => setUpdateStatusOpen(false)}
          onStatusUpdated={() => { invalidate(); setUpdateStatusOpen(false); }}
        />
      )}

      {/* Audit Trail */}
      {auditTrailId !== null && (
        <JobAuditTrailModal
          jobId={auditTrailId}
          isOpen={true}
          onClose={() => setAuditTrailId(null)}
        />
      )}
    </>
  );
}
