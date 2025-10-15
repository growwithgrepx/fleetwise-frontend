import React, { useState } from 'react';
import { Job, JobStatus } from '@/types/job';
import { Button } from '@/components/ui/button';
import { updateJobStatus } from '@/services/api/jobsApi';
import toast from 'react-hot-toast';

interface UpdateJobStatusModalProps {
  job: Job;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated: () => void;
}

const statusLabels: Record<JobStatus, string> = {
  new: 'New',
  pending: 'Pending',
  confirmed: 'Confirmed',
  otw: 'On The Way',
  ots: 'On The Spot',
  pob: 'Passenger On Board',
  jc: 'Job Completed',
  sd: 'Stand Down',
  canceled: 'Canceled'
};

const getNextValidStatuses = (currentStatus: JobStatus): JobStatus[] => {
  // Based on the backend can_transition_to logic
  switch (currentStatus) {
    case 'new':
      return ['pending', 'confirmed'];
    case 'pending':
      return ['confirmed'];
    case 'confirmed':
      return ['otw', 'ots', 'sd', 'pob', 'jc'];
    case 'otw':
      return ['ots', 'sd', 'pob', 'jc'];
    case 'ots':
      return ['sd', 'pob', 'jc'];
    case 'pob':
      return ['sd', 'jc'];
    case 'jc':
      return ['sd'];
    case 'sd':
    case 'canceled':
      return []; // Terminating states
    default:
      return [];
  }
};

export const UpdateJobStatusModal: React.FC<UpdateJobStatusModalProps> = ({
  job,
  isOpen,
  onClose,
  onStatusUpdated
}) => {
  const [newStatus, setNewStatus] = useState<JobStatus | ''>('');
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validStatuses = getNextValidStatuses(job.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;

    setIsSubmitting(true);
    try {
      await updateJobStatus(job.id, newStatus, remark);
      toast.success('Job status updated successfully');
      onStatusUpdated();
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update job status');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Check if job is canceled
  const isCanceled = job.status === 'canceled';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background-light border border-border-color rounded-lg shadow-xl p-6 w-full max-w-md mx-4 animate-fade-in" role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-text-main mb-2">
          {isCanceled ? `Job Status - Canceled (Job #${job.id})` : `Update Job Status (Job #${job.id})`}
        </h2>
        
        {isCanceled ? (
          <div className="mb-4">
            <p className="text-text-secondary mb-4">
              Job <span className="font-semibold">#{job.id}</span> is currently <span className="font-semibold">{statusLabels[job.status]}</span>.
            </p>
            <p className="text-text-secondary">
              To update the status, you must first re-instate the job using the "Re-instate" action, then you can update its status.
            </p>
          </div>
        ) : (
          <>
            <p className="text-text-secondary mb-4">
              Change status from <span className="font-semibold">{statusLabels[job.status]}</span> to:
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-main mb-2">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as JobStatus)}
                  className="w-full rounded-lg px-3 py-2 text-sm transition-colors bg-background-light border-border-color text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  disabled={isSubmitting}
                >
                  <option value="">Select a status</option>
                  {validStatuses.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-main mb-2">Remark (Optional)</label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Reason for manual status update (e.g., 'Driver confirmed via phone call')"
                  className="w-full rounded-lg px-3 py-2 text-sm transition-colors bg-background-light border-border-color text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[80px]"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!newStatus || isSubmitting}
                  className="bg-primary hover:bg-primary-dark"
                >
                  {isSubmitting ? 'Updating...' : 'Update Status'}
                </Button>
              </div>
            </form>
          </>
        )}
        
        {isCanceled && (
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};