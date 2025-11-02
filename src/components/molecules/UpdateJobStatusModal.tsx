import React, { useState, useRef, useEffect } from 'react';
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

interface StatusTransition {
  from: JobStatus;
  to: JobStatus;
  selected: boolean;
  datetime: string; // Combined datetime in ISO format: YYYY-MM-DDTHH:MM
  remark: string;
}

const statusLabels: Record<JobStatus, string> = {
  new: 'New',
  pending: 'Pending',
  confirmed: 'Confirmed',
  otw: 'OTW',
  ots: 'OTS',
  pob: 'POB',
  jc: 'JC',
  sd: 'SD',
  canceled: 'Canceled'
};

const getNextValidStatuses = (currentStatus: JobStatus): JobStatus[] => {
  switch (currentStatus) {
    case 'new':
      return ['pending', 'confirmed'];
    case 'pending':
      return ['confirmed'];
    case 'confirmed':
      return ['otw'];
    case 'otw':
      return ['ots'];
    case 'ots':
      return ['pob'];
    case 'pob':
      return ['jc'];
    case 'jc':
      return [];
    case 'sd':
    case 'canceled':
      return [];
    default:
      return [];
  }
};

const getStatusChain = (currentStatus: JobStatus): { from: JobStatus; to: JobStatus }[] => {
  const baseChain: { from: JobStatus; to: JobStatus }[] = [
    { from: 'confirmed', to: 'otw' },
    { from: 'otw', to: 'ots' },
    { from: 'ots', to: 'pob' },
    { from: 'pob', to: 'jc' }
  ];
  
  // Add pending to confirmed transition if current status is pending
  if (currentStatus === 'pending') {
    return [{ from: 'pending', to: 'confirmed' }, ...baseChain];
  }
  
  // Add new to confirmed transition if current status is new
  if (currentStatus === 'new') {
    return [{ from: 'new', to: 'confirmed' }, ...baseChain];
  }
  
  return baseChain;
};

// Convert 24-hour time to 12-hour format with AM/PM
const formatTo12Hour = (datetime: string): string => {
  if (!datetime) return '';
  
  const date = new Date(datetime);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const displayHours = String(hours).padStart(2, '0');
  
  return `${day}/${month}/${year} ${displayHours}:${minutes} ${period}`;
};

export const UpdateJobStatusModal: React.FC<UpdateJobStatusModalProps> = ({
  job,
  isOpen,
  onClose,
  onStatusUpdated
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transitions, setTransitions] = useState<StatusTransition[]>([]);

  useEffect(() => {
    const statusChain = getStatusChain(job.status);
    setTransitions(statusChain.map(transition => {
      const now = new Date();
    
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const datetimeStr = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      return {
        from: transition.from,
        to: transition.to,
        selected: false,
        datetime: datetimeStr,
        remark: ''
      };
    }));
  }, [job.status]);

  const handleTransitionChange = (index: number, field: keyof StatusTransition, value: any) => {
    setTransitions(prev => {
      const newTransitions = [...prev];
      newTransitions[index] = { ...newTransitions[index], [field]: value };
      return newTransitions;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    setTransitions(prev => prev.map(transition => ({
      ...transition,
      selected
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTransitions = transitions.filter(t => t.selected);
    
    if (selectedTransitions.length === 0) {
      toast.error('Please select at least one status transition');
      return;
    }

    setIsSubmitting(true);
    try {
      for (const transition of selectedTransitions) {
        // Format datetime for remark in 12-hour format with AM/PM
        const formattedDateTime = formatTo12Hour(transition.datetime);
        const remark = transition.remark ? `${transition.remark} (${formattedDateTime})` : formattedDateTime;
        await updateJobStatus(job.id, transition.to, remark);
      }
      
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

  const isCanceled = job.status === 'canceled';
  const hasSelectedTransitions = transitions.some(t => t.selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background-light border border-border-color rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 animate-fade-in" role="dialog" aria-modal="true">
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
              Current status: <span className="font-semibold">{statusLabels[job.status]}</span>
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-text-main">Available Status Transitions</label>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(!hasSelectedTransitions)}
                    className="text-xs text-primary hover:underline"
                  >
                    {hasSelectedTransitions ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                
                <div className="border border-border-color rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-background-light/50">
                      <tr>
                        <th className="text-left p-2 w-10">
                          <span className="sr-only">Select</span>
                        </th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Date/Time</th>
                        <th className="text-left p-2">Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transitions.map((transition, index) => (
                        <tr key={index} className="border-t border-border-color/50 hover:bg-background-light/30">
                          <td className="p-2">
                            <input
                              type="checkbox"
                              checked={transition.selected}
                              onChange={(e) => handleTransitionChange(index, 'selected', e.target.checked)}
                              className="form-checkbox h-4 w-4 text-primary bg-background-light border-border-color rounded focus:ring-primary"
                            />
                          </td>
                          <td className="p-2">
                            <div className="text-sm">
                              <span className="font-medium">{statusLabels[transition.from]}</span>
                              <span className="mx-2">→</span>
                              <span className="font-medium">{statusLabels[transition.to]}</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="relative">
                              <input
                                type="datetime-local"
                                value={transition.datetime}
                                onChange={(e) => handleTransitionChange(index, 'datetime', e.target.value)}
                                className="w-full rounded-lg px-2 py-1 text-xs transition-colors bg-background-light border border-border-color text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                              />
                              {transition.datetime && (
                                <div className="text-[10px] text-text-secondary mt-1">
                                  {formatTo12Hour(transition.datetime)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={transition.remark}
                              onChange={(e) => handleTransitionChange(index, 'remark', e.target.value)}
                              placeholder="Add remark..."
                              className="w-full rounded-lg px-2 py-1 text-xs transition-colors bg-background-light border border-border-color text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                  disabled={!hasSelectedTransitions || isSubmitting}
                  className="bg-primary hover:bg-primary-dark"
                >
                  {isSubmitting ? 'Updating...' : `Update Status${hasSelectedTransitions ? ` (${transitions.filter(t => t.selected).length})` : ''}`}
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