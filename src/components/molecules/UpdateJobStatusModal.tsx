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
  datetime: string;
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
      return ['otw', 'ots', 'pob', 'jc', 'sd'];
    case 'otw':
      return ['ots', 'pob', 'jc', 'sd'];
    case 'ots':
      return ['pob', 'jc', 'sd'];
    case 'pob':
      return ['jc', 'sd']; 
    case 'jc':
      return ['sd']; 
    case 'sd':
    case 'canceled':
      return [];
    default:
      return [];
  }
};

const getStatusChain = (currentStatus: JobStatus): { from: JobStatus; to: JobStatus }[] => {
  // For confirmed status, create a chain of transitions
  if (currentStatus === 'confirmed') {
    return [
      { from: 'confirmed', to: 'otw' },
      { from: 'otw', to: 'ots' },
      { from: 'ots', to: 'pob' },
      { from: 'pob', to: 'jc' },
      { from: 'pob', to: 'sd' }
    ];
  }
  
  // For otw status, create a chain of transitions
  if (currentStatus === 'otw') {
    return [
      { from: 'otw', to: 'ots' },
      { from: 'ots', to: 'pob' },
      { from: 'pob', to: 'jc' },
      { from: 'pob', to: 'sd' }
    ];
  }
  
  // For ots status, create a chain of transitions
  if (currentStatus === 'ots') {
    return [
      { from: 'ots', to: 'pob' },
      { from: 'pob', to: 'jc' },
      { from: 'pob', to: 'sd' }
    ];
  }
  
  // For pob status, create a chain of transitions
  if (currentStatus === 'pob') {
    return [
      { from: 'pob', to: 'jc' },
      { from: 'pob', to: 'sd' }
    ];
  }
  
  // For other statuses, use the original logic
  const nextStatuses = getNextValidStatuses(currentStatus);
  
  const transitions = nextStatuses.map(to => ({
    from: currentStatus,
    to
  }));
  
  return transitions;
};

const formatTo24Hour = (datetime: string): string => {
  if (!datetime) return '';
  const date = new Date(datetime);
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
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
    if (!isOpen) return;
    

    
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
  }, [job.status, isOpen]);

  const handleTransitionChange = (index: number, field: keyof StatusTransition, value: any) => {
    setTransitions(prev => {
      const newTransitions = [...prev];
      newTransitions[index] = { ...newTransitions[index], [field]: value };
      
      // If we're changing the 'selected' field and it's a 'pob' transition
      if (field === 'selected' && prev[index].from === 'pob') {
        // If we're selecting this transition, deselect the other 'pob' transition
        if (value) {
          const otherPobIndex = prev.findIndex((t, i) => 
            i !== index && t.from === 'pob' && t.selected
          );
          if (otherPobIndex !== -1) {
            newTransitions[otherPobIndex] = { 
              ...newTransitions[otherPobIndex], 
              selected: false 
            };
          }
        }
      }
      
      return newTransitions;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    // For chain-based statuses, implement smart selection
    const chainBasedStatuses: JobStatus[] = ['confirmed', 'otw', 'ots', 'pob'];
    
    if (chainBasedStatuses.includes(job.status) && selected) {
      // When selecting all for chain-based statuses, select the first branch by default
      // (pob → jc, not pob → sd)
      setTransitions(prev => {
        // Find if there are multiple transitions from the same 'from' status
        const fromStatusCounts: Record<JobStatus, number> = {} as Record<JobStatus, number>;
        prev.forEach(transition => {
          fromStatusCounts[transition.from] = (fromStatusCounts[transition.from] || 0) + 1;
        });
        
        // Select all transitions, but for branching points, only select the first one
        return prev.map((transition, index) => {
          // If this is a branching point (multiple transitions from same 'from' status)
          if (fromStatusCounts[transition.from] > 1 && transition.from === 'pob') {
            // Select only the first 'pob' transition (which should be 'pob → jc')
            const firstPobIndex = prev.findIndex(t => t.from === 'pob');
            return {
              ...transition,
              selected: index === firstPobIndex
            };
          }
          
          // For non-branching transitions, select all
          return {
            ...transition,
            selected: true
          };
        });
      });
    } else {
      // For other cases, use the original logic
      setTransitions(prev => prev.map(transition => ({
        ...transition,
        selected
      })));
    }
  };

  // Get the last status change timestamp
  const getLastStatusChangeTime = (): Date | null => {
    if (!job.status_history || job.status_history.length === 0) {
      return null;
    }
    
    // Sort by timestamp descending to get the most recent
    const sortedHistory = [...job.status_history].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB.getTime() - dateA.getTime();
    });
    
    const lastChange = sortedHistory[0];
    const lastChangeDate = new Date(lastChange.timestamp);
    
    return lastChangeDate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedTransitions = transitions.filter(t => t.selected);
    
    if (selectedTransitions.length === 0) {
      toast.error('Please select at least one status transition');
      return;
    }

    // Validate that we don't have both branches selected at the same time
    const pobTransitions = selectedTransitions.filter(t => t.from === 'pob');
    if (pobTransitions.length > 1) {
      toast.error('Cannot select both POB → JC and POB → SD transitions simultaneously. Please select only one branch.');
      return;
    }

    // Validate that selected transitions form a consecutive chain
    if (selectedTransitions.length > 1) {
      // Create a map of valid transitions for chain validation
      const validTransitions: Record<string, string> = {};
      transitions.forEach(t => {
        validTransitions[`${t.from}-${t.to}`] = t.to;
      });
      
      // Check if the selected transitions form a valid chain
      let validChain = true;
      let currentFrom = selectedTransitions[0].from;
      
      for (let i = 0; i < selectedTransitions.length; i++) {
        const transition = selectedTransitions[i];
        
        // Check if this transition is valid
        if (!validTransitions[`${transition.from}-${transition.to}`]) {
          validChain = false;
          break;
        }
        
        // For the first transition, just set the currentFrom
        if (i === 0) {
          // Check if this is the first in the chain
          if (transition.from !== job.status) {
            // For confirmed status, the first transition should be from confirmed
            if (job.status !== 'confirmed' || transition.from !== 'confirmed') {
              validChain = false;
              break;
            }
          }
          currentFrom = transition.to;
          continue;
        }
        
        // Check if this transition follows the previous one
        if (transition.from !== currentFrom) {
          validChain = false;
          break;
        }
        
        currentFrom = transition.to;
      }
      
      if (!validChain) {
        toast.error('Selected transitions must form a valid consecutive chain. Please select only consecutive status transitions.');
        return;
      }
    }

    // Validate that all selected transitions have valid dates
    for (const transition of selectedTransitions) {
      const date = new Date(transition.datetime);
      if (isNaN(date.getTime())) {

        toast.error(`Invalid datetime for ${statusLabels[transition.to]} transition`);
        return;
      }
    }

    const lastStatusChangeTime = getLastStatusChangeTime();
    


    // Validate that timestamps are after the last status change (if exists)
    if (lastStatusChangeTime) {
      for (const transition of selectedTransitions) {
        const transitionDate = new Date(transition.datetime);
        // Allow same-second updates but prevent backdating
        // Use 1000ms threshold to handle rapid updates
        const timeDiff = transitionDate.getTime() - lastStatusChangeTime.getTime();
        if (timeDiff < -1000) { // More than 1 second before last change
          toast.error(
            `${statusLabels[transition.to]} timestamp cannot be before the last status change.\n\n` +
            `Last change: ${formatTo24Hour(lastStatusChangeTime.toISOString())}\n` +
            `Your selection: ${formatTo24Hour(transition.datetime)}\n\n` +
            `Please select a time at or after the last change.`
          );
          return;
        }
      }
    }

    // Sort selected transitions by datetime to validate chronological order
    const sortedTransitions = [...selectedTransitions].sort((a, b) => {
      const dateA = new Date(a.datetime);
      const dateB = new Date(b.datetime);
      return dateA.getTime() - dateB.getTime();
    });

    // Validate chronological ordering between selected transitions
    for (let i = 1; i < sortedTransitions.length; i++) {
      const prevDate = new Date(sortedTransitions[i - 1].datetime);
      const currDate = new Date(sortedTransitions[i].datetime);
      
      if (currDate <= prevDate) {
        toast.error(
          `Invalid timeline: ${statusLabels[sortedTransitions[i].to]} timestamp ` +
          `(${formatTo24Hour(sortedTransitions[i].datetime)}) must be after ` +
          `${statusLabels[sortedTransitions[i - 1].to]} ` +
          `(${formatTo24Hour(sortedTransitions[i - 1].datetime)}).`
        );
        return;
      }
    }

    // Validate that no future dates are selected
    const now = new Date();
    for (const transition of selectedTransitions) {
      const date = new Date(transition.datetime);
      if (date > now) {
        toast.error(
          `Cannot set future timestamp for ${statusLabels[transition.to]}. ` +
          `Please use current or past datetime.`
        );
        return;
      }
    }

    // Proceeding to update status...

    setIsSubmitting(true);
    const results: { transition: StatusTransition; success: boolean; error?: string }[] = [];

    try {
      for (let i = 0; i < selectedTransitions.length; i++) {
        const transition = selectedTransitions[i];
        try {
          const remark = transition.remark || '';
          const changedAt = transition.datetime || '';
          
          await updateJobStatus(job.id, transition.to, remark, changedAt);
          results.push({ transition, success: true });
        } catch (error: any) {
          const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
          results.push({ transition, success: false, error: errorMsg });
          
          const successCount = results.filter(r => r.success).length;
          toast.error(
            `Failed at transition ${i + 1}/${selectedTransitions.length}: ${statusLabels[transition.from]} → ${statusLabels[transition.to]}. ` +
            `${successCount} transition(s) completed. Please refresh the page and verify job status before retrying. Error: ${errorMsg}`
          );
          break;
        }
      }

      const successCount = results.filter(r => r.success).length;
      if (successCount === selectedTransitions.length) {

        toast.success(`Successfully updated ${successCount} status transition(s)`);
        onStatusUpdated();
        onClose();
      } else if (successCount > 0) {

        toast.success(`Please check: ${successCount}/${selectedTransitions.length} transitions updated. Refresh to verify job status.`);
        onStatusUpdated(); 
      }
    } catch (error) {
      toast.error('Unexpected error during status update. Please refresh and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const lastStatusChangeTime = getLastStatusChangeTime();

  if (!isOpen) return null;

  const isCanceled = job.status === 'canceled';
  const hasSelectedTransitions = transitions.some(t => t.selected);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md sm:max-w-2xl mx-3 sm:mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto bg-background-light border border-border-color rounded-lg shadow-xl animate-fade-in" role="dialog" aria-modal="true">
        <h2 className="text-base sm:text-lg font-bold text-text-main mb-2">
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
            <p className="text-text-secondary mb-2">
              Current status: <span className="font-semibold">{statusLabels[job.status]}</span>
            </p>
            
            {lastStatusChangeTime && (
              <div className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 p-3 rounded mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-lg">ℹ️</span>
                  <div>
                    <p className="font-semibold mb-1">Important:</p>
                    <p>Last status change was at <strong>{formatTo24Hour(lastStatusChangeTime.toISOString())}</strong></p>
                    <p className="mt-1">New status timestamp must be set to a time <strong>at or after</strong> this.</p>
                  </div>
                </div>
              </div>
            )}
            
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
                  <div className="overflow-x-auto">
                    <table className="min-w-[700px] w-full">
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
                              disabled={isSubmitting}
                              className="form-checkbox h-4 w-4 text-primary bg-background-light border-border-color rounded focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
                                type="date"
                                value={transition.datetime ? transition.datetime.split('T')[0] : ''}
                                onChange={(e) => {
                                  const newDate = e.target.value;
                                  const currentTime = transition.datetime ? transition.datetime.split('T')[1] : '00:00';
                                  handleTransitionChange(index, 'datetime', `${newDate}T${currentTime}`);
                                }}
                                disabled={isSubmitting}
                                className="w-full rounded-lg px-2 py-1 text-xs transition-colors bg-background-light border border-border-color text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed mb-1"
                              />
                              <div className="flex gap-1">
                                <select
                                  value={transition.datetime ? transition.datetime.split('T')[1]?.split(':')[0] : '00'}
                                  onChange={(e) => {
                                    const newHour = e.target.value.padStart(2, '0');
                                    const currentMinute = transition.datetime ? transition.datetime.split('T')[1]?.split(':')[1] : '00';
                                    const currentDate = transition.datetime ? transition.datetime.split('T')[0] : new Date().toISOString().split('T')[0];
                                    handleTransitionChange(index, 'datetime', `${currentDate}T${newHour}:${currentMinute}`);
                                  }}
                                  disabled={isSubmitting}
                                  className="w-1/2 rounded-lg px-2 py-1 text-xs transition-colors bg-background-light border border-border-color text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed mr-1"
                                >
                                  {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                                    <option key={hour} value={hour.toString().padStart(2, '0')}>
                                      {hour.toString().padStart(2, '0')}
                                    </option>
                                  ))}
                                </select>
                                <span className="self-center">:</span>
                                <select
                                  value={transition.datetime ? transition.datetime.split('T')[1]?.split(':')[1] : '00'}
                                  onChange={(e) => {
                                    const newMinute = e.target.value.padStart(2, '0');
                                    const currentHour = transition.datetime ? transition.datetime.split('T')[1]?.split(':')[0] : '00';
                                    const currentDate = transition.datetime ? transition.datetime.split('T')[0] : new Date().toISOString().split('T')[0];
                                    handleTransitionChange(index, 'datetime', `${currentDate}T${currentHour}:${newMinute}`);
                                  }}
                                  disabled={isSubmitting}
                                  className="w-1/2 rounded-lg px-2 py-1 text-xs transition-colors bg-background-light border border-border-color text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {Array.from({ length: 60 }, (_, i) => i).map(minute => (
                                    <option key={minute} value={minute.toString().padStart(2, '0')}>
                                      {minute.toString().padStart(2, '0')}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={transition.remark}
                              onChange={(e) => handleTransitionChange(index, 'remark', e.target.value)}
                              placeholder="Add remark..."
                              disabled={isSubmitting}
                              className="w-full rounded-lg px-2 py-1 text-xs transition-colors bg-background-light border border-border-color text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!hasSelectedTransitions || isSubmitting}
                  className="bg-primary hover:bg-primary-dark w-full sm:w-auto"
                >
                  {isSubmitting ? 'Updating...' : `Update Status${hasSelectedTransitions ? ` (${transitions.filter(t => t.selected).length})` : ''}`}
                </Button>
              </div>
            </form>
          </>
        )}
        
        {isCanceled && (
          <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};