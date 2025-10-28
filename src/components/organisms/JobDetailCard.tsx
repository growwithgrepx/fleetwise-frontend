import React, { useState } from 'react';
import type { Job } from '@/types/types';
import { Badge } from '@/components/atoms/Badge';
import { DetailSection } from '@/components/molecules/DetailSection';
import { DetailItem } from '@/components/molecules/DetailItem';
import { Button } from '@/components/atoms/Button';
import JobSummaryModal from './JobSummaryModal';
import { generateJobSummary } from '@/utils/jobSummaryGenerator';

export default function JobDetailCard({ job }: { job: Job }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobSummary, setJobSummary] = useState('');

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
              <DetailItem label="Name" value={job.customer?.name} />
              <DetailItem label="Email" value={job.customer?.email} />
              <DetailItem label="Mobile" value={job.customer?.mobile} />
              <DetailItem label="Company" value={job.customer?.company_name} />
          </DetailSection>

          <DetailSection title="Trip Details">
              <DetailItem label="Service Type" value={job.service?.name} />
              <DetailItem label="Pickup" value={job.pickup_location} />
              <DetailItem label="Drop-off" value={job.dropoff_location} />
              <DetailItem label="Date & Time" value={job.pickup_date && job.pickup_time ? `${job.pickup_date} at ${job.pickup_time}` : (job.pickup_date || '')} />
          </DetailSection>

          <DetailSection title="Pricing & Status">
              <DetailItem label="Base Price" value={job.base_price !== undefined ? `S$ ${job.base_price.toFixed(2)}` : 'N/A'} />
              <DetailItem label="Final Price" value={job.final_price !== undefined ? `S$ ${job.final_price.toFixed(2)}` : 'N/A'} />
              <DetailItem label="Job Status" value={job.status && <Badge variant="info">{job.status}</Badge>} />
          </DetailSection>
          
          <DetailSection title="Assignment & Other">
              <DetailItem label="Vehicle" value={job.vehicle_type || 'Not Assigned'} />
              <DetailItem label="Driver" value={job.driver?.name || 'Not Assigned'} />
              <DetailItem label="Invoice #" value={job.invoice?.id || 'Not Assigned'} />
              <DetailItem label="Passenger" value={job.passenger_name} />
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