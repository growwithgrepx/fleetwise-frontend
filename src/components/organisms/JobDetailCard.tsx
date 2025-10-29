import React, { useState } from 'react';
import type { ApiJob } from '@/types/job';
import { normalizeJobForDisplay } from '@/utils/jobNormalizer';
import { Badge } from '@/components/atoms/Badge';
import { DetailSection } from '@/components/molecules/DetailSection';
import { DetailItem } from '@/components/molecules/DetailItem';
import { Button } from '@/components/atoms/Button';
import JobSummaryModal from './JobSummaryModal';
import { generateJobSummary } from '@/utils/jobSummaryGenerator';

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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-text-main">Job Details</h2>
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

          <DetailSection title="Pricing & Status">
              <DetailItem label="Base Price" value={normalized.basePrice !== undefined ? `S$ ${normalized.basePrice.toFixed(2)}` : 'N/A'} />
              <DetailItem label="Final Price" value={normalized.finalPrice !== undefined ? `S$ ${normalized.finalPrice.toFixed(2)}` : 'N/A'} />
              <DetailItem label="Job Status" value={normalized.status && <Badge variant="info">{String(normalized.status)}</Badge>} />
          </DetailSection>

          <DetailSection title="Assignment & Other">
              <DetailItem label="Vehicle" value={normalized.vehicleType || 'Not Assigned'} />
              <DetailItem label="Driver" value={normalized.driverName || 'Not Assigned'} />
              <DetailItem label="Invoice #" value={normalized.invoiceId || 'Not Assigned'} />
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
