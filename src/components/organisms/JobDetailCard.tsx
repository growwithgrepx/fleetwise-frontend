import React, { useState } from 'react';
import type { ApiJob } from '@/types/job';
import type { Job } from '@/types/job';
import { normalizeJobForDisplay } from '@/utils/jobNormalizer';
import { DetailSection } from '@/components/molecules/DetailSection';
import { DetailItem } from '@/components/molecules/DetailItem';
import JobSummaryModal from './JobSummaryModal';
import { generateJobSummary } from '@/utils/jobSummaryGenerator';
import { Copy, Trash2, RotateCcw, Clock, MessageCircle, Pencil, ListChecks, X } from 'lucide-react';

// Local StatusBadge component with the exact styling you specified
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  // Guard against invalid status values
  if (!status || typeof status !== 'string' || status.trim() === '') {
    return null;
  }
  
  // Format status text with proper capitalization
  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };
  
  // Use the exact styling you provided for canceled status
  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'canceled':
        return 'px-3 py-1 text-xs font-medium rounded-full bg-red-700 text-red-100';
      case 'confirmed':
        return 'px-3 py-1 text-xs font-medium rounded-full bg-green-700 text-green-100';
      case 'pending':
        return 'px-3 py-1 text-xs font-medium rounded-full bg-yellow-700 text-yellow-100';
      case 'new':
        return 'px-3 py-1 text-xs font-medium rounded-full bg-blue-700 text-blue-100';
      case 'otw': // On The Way
        return 'px-3 py-1 text-xs font-medium rounded-full bg-indigo-700 text-indigo-100';
      case 'ots': // On The Scene
        return 'px-3 py-1 text-xs font-medium rounded-full bg-purple-700 text-purple-100';
      case 'pob': // Passenger On Board
        return 'px-3 py-1 text-xs font-medium rounded-full bg-cyan-700 text-cyan-100';
      case 'jc': // Job Complete
        return 'px-3 py-1 text-xs font-medium rounded-full bg-teal-700 text-teal-100';
      case 'sd': // Stand Down
        return 'px-3 py-1 text-xs font-medium rounded-full bg-emerald-700 text-emerald-100';
      default:
        return 'px-3 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-100';
    }
  };
  
  return (
    <span className={getStatusClass(status)}>
      {formatStatus(status)}
    </span>
  );
};

interface JobDetailCardProps {
  job: ApiJob;
  onEdit?: (job: Job) => void;
  onCopy?: (job: Job) => void;
  onDelete?: (job: Job) => void;
  onReinstate?: (job: Job) => void;
  onViewAuditTrail?: (job: Job) => void;
  onUpdateStatus?: (job: Job) => void;
  onCancelJob?: (job: Job) => void;
  canDelete?: boolean;
  canManageLifecycle?: boolean;
}

export default function JobDetailCard({
  job,
  onEdit,
  onCopy,
  onDelete,
  onReinstate,
  onViewAuditTrail,
  onUpdateStatus,
  onCancelJob,
  canDelete = true,
  canManageLifecycle = false,
}: JobDetailCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobSummary, setJobSummary] = useState('');

  // Normalize the job data at the component boundary
  // This extracts all nested object properties into a flat structure
  const normalized = normalizeJobForDisplay(job);

  const handleGenerateText = () => {
    const summary = generateJobSummary(job);
    setJobSummary(summary);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="bg-background-light p-4 sm:p-6 rounded-lg overflow-x-auto" style={{ maxWidth: '1500px' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 min-w-fit">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-main">
              Job Details <span className="text-gray-400 font-mono">#{job.id}</span>{' '}
              {normalized.status && <StatusBadge status={String(normalized.status)} />}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {/* Generate Text */}
            <button
              onClick={handleGenerateText}
              title="Copy text from job (WhatsApp / message)"
              className="h-8 w-8 flex items-center justify-center rounded-md text-green-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            {/* Edit */}
            {onEdit && (
              <button
                onClick={() => onEdit(job as unknown as Job)}
                title="Edit"
                className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {/* Copy */}
            {onCopy && (
              <button
                onClick={() => onCopy(job as unknown as Job)}
                title="Duplicate"
                className="h-8 w-8 flex items-center justify-center rounded-md text-blue-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
            {/* Delete */}
            {onDelete && canDelete && (
              <button
                onClick={() => onDelete(job as unknown as Job)}
                title="Delete"
                className="h-8 w-8 flex items-center justify-center rounded-md text-red-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {/* Update Status */}
            {onUpdateStatus && canManageLifecycle && (
              <button
                onClick={() => onUpdateStatus(job as unknown as Job)}
                title="Update Status"
                disabled={job.status === 'sd' || job.status === 'jc' || job.status === 'canceled'}
                className="h-8 w-8 flex items-center justify-center rounded-md text-blue-400 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <ListChecks className="h-4 w-4" />
              </button>
            )}
            {/* Cancel */}
            {onCancelJob && canManageLifecycle && (
              <button
                onClick={() => onCancelJob(job as unknown as Job)}
                title="Cancel"
                disabled={job.status === 'canceled' || job.status === 'sd' || job.status === 'jc'}
                className="h-8 w-8 flex items-center justify-center rounded-md text-red-500 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {/* Re-instate */}
            {onReinstate && canManageLifecycle && (
              <button
                onClick={() => onReinstate(job as unknown as Job)}
                title="Re-instate"
                disabled={job.status !== 'canceled'}
                className="h-8 w-8 flex items-center justify-center rounded-md text-green-500 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            {/* Audit Trail */}
            {onViewAuditTrail && (
              <button
                onClick={() => onViewAuditTrail(job as unknown as Job)}
                title="Audit trail"
                className="h-8 w-8 flex items-center justify-center rounded-md text-amber-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Clock className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 sm:gap-x-8 gap-y-6 sm:gap-y-8 min-w-fit">

          <DetailSection title="Customer Info">
              <DetailItem label="Name" value={normalized.customerName} />
              <DetailItem label="Email" value={normalized.customerEmail} />
              <DetailItem label="Mobile" value={normalized.customerMobile} />
              <DetailItem label="Company" value={normalized.companyName} clamp />
              <DetailItem label="Booking Reference" value={job.booking_ref || '-'} />
          </DetailSection>

          <DetailSection title="Trip Details">
              <DetailItem label="Service Type" value={normalized.serviceName} />
              <DetailItem label="Pickup" value={normalized.pickupLocation} clamp />
              <DetailItem label="Drop-off" value={normalized.dropoffLocation} clamp />
              <DetailItem label="Date & Time" value={normalized.pickupDate && normalized.pickupTime ? `${normalized.pickupDate} at ${normalized.pickupTime}` : (normalized.pickupDate || '')} />
              {job.dropoff_time && (
                <DetailItem label="Drop-off Time" value={job.dropoff_time} />
              )}
          </DetailSection>

          <DetailSection title="Pricing">
              <DetailItem label="Base Price" value={normalized.basePrice !== undefined ? `S$ ${normalized.basePrice.toFixed(2)}` : 'N/A'} />
              {Array.isArray(job.ancillary_charges) && job.ancillary_charges.length > 0 && (
                <>
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <p className="text-sm font-medium text-gray-400 mb-2">Ancillary Charges:</p>
                    {job.ancillary_charges
                      .filter(charge => {
                        // Validate charge structure
                        if (!charge || typeof charge !== 'object') {
                          console.warn('Invalid ancillary charge object:', charge);
                          return false;
                        }
                        if (typeof charge.name !== 'string' || typeof charge.price !== 'number') {
                          console.warn('Ancillary charge missing required fields:', charge);
                          return false;
                        }
                        return true;
                      })
                      .map((charge, index) => (
                        <div key={`charge-${charge.service_id || index}`} className="ml-4 mb-1 flex justify-between">
                          <span className="text-sm text-gray-300">
                            {charge.name}
                            {typeof charge.quantity === 'number' && charge.quantity > 1 && (
                              <span className="text-gray-500"> (x{charge.quantity})</span>
                            )}
                          </span>
                          <span className="text-sm text-gray-300">
                            S$ {(charge.price || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </>
              )}
              <DetailItem 
                label="Final Price" 
                value={normalized.finalPrice !== undefined ? `S$ ${normalized.finalPrice.toFixed(2)}` : 'N/A'} 
              />
              {normalized.jobCost !== undefined && normalized.jobCost > 0 && (
                <DetailItem 
                  label="Contractor/Driver's Claim" 
                  value={
                    <div className="flex flex-col">
                      <span>S$ {normalized.jobCost.toFixed(2)}</span>
                      {normalized.job.contractor_id && (
                        <span className="text-xs text-blue-400">from contractor pricing</span>
                      )}
                    </div>
                  } 
                />
              )}
          </DetailSection>

          <DetailSection title="Assignment & Other">
              <DetailItem label="Vehicle" value={normalized.vehicle || 'Not Assigned'} />
              <DetailItem label="Driver" value={normalized.driverName || 'Not Assigned'} />
              <DetailItem label="Vehicle Type" value={normalized.vehicleType || 'Not Assigned'} />
              <DetailItem label="Passenger" value={normalized.passengerName} clamp />
          </DetailSection>
        </div>
      </div>

      <JobSummaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        jobSummary={jobSummary}
      />
    </>
  );
}