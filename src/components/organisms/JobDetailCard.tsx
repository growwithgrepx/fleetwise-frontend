import React, { useState } from 'react';
import type { ApiJob } from '@/types/job';
import { normalizeJobForDisplay } from '@/utils/jobNormalizer';
import { DetailSection } from '@/components/molecules/DetailSection';
import { DetailItem } from '@/components/molecules/DetailItem';
import { Button } from '@/components/atoms/Button';
import JobSummaryModal from './JobSummaryModal';
import { generateJobSummary } from '@/utils/jobSummaryGenerator';

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

export default function JobDetailCard({ job }: { job: ApiJob }) {
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
      <div className="bg-background-light p-6 rounded-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-text-main">
              Job Details{' '}
              {normalized.status && <StatusBadge status={String(normalized.status)} />}
            </h2>
          </div>
          <Button variant="primary" onClick={handleGenerateText}>
            Generate Text
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-8">

          <DetailSection title="Customer Info">
              <DetailItem label="Name" value={normalized.customerName} />
              <DetailItem label="Email" value={normalized.customerEmail} />
              <DetailItem label="Mobile" value={normalized.customerMobile} />
              <DetailItem label="Company" value={normalized.companyName} />
          </DetailSection>

          <DetailSection title="Trip Details">
              <DetailItem label="Service Type" value={normalized.serviceName} />
              <DetailItem label="Pickup" value={normalized.pickupLocation} />
              <DetailItem label="Drop-off" value={normalized.dropoffLocation} />
              <DetailItem label="Date & Time" value={normalized.pickupDate && normalized.pickupTime ? `${normalized.pickupDate} at ${normalized.pickupTime}` : (normalized.pickupDate || '')} />
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
              <DetailItem label="Passenger" value={normalized.passengerName} />
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