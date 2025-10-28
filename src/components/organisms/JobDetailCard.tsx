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

  // Helper function to safely extract string values from potentially nested objects
  const safeValue = (value: any): string | undefined => {
    if (value == null) return undefined;
    if (typeof value === 'object') {
      return value.name || value.toString();
    }
    return String(value);
  };

  // Extract safe string values from nested objects
  const serviceName = job.service && typeof job.service === 'object'
    ? safeValue((job.service as any).name)
    : safeValue(job.type_of_service);

  const customerName = job.customer && typeof job.customer === 'object'
    ? safeValue(job.customer.name)
    : safeValue(job.customer_name);

  const customerEmail = job.customer && typeof job.customer === 'object'
    ? safeValue(job.customer.email)
    : safeValue(job.customer_email);

  const customerMobile = job.customer && typeof job.customer === 'object'
    ? safeValue(job.customer.mobile)
    : safeValue(job.customer_mobile);

  const companyName = job.customer && typeof job.customer === 'object'
    ? safeValue(job.customer.company_name)
    : undefined;

  const driverName = job.driver && typeof job.driver === 'object'
    ? safeValue((job.driver as any).name)
    : undefined;

  const invoiceId = job.invoice && typeof job.invoice === 'object'
    ? safeValue((job.invoice as any).id)
    : undefined;

  const vehicleType = safeValue((job as any).vehicle_type);
  const pickupLocation = safeValue(job.pickup_location);
  const dropoffLocation = safeValue(job.dropoff_location);
  const pickupDate = safeValue(job.pickup_date);
  const pickupTime = safeValue(job.pickup_time);
  const passengerName = safeValue(job.passenger_name);

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
              <DetailItem label="Name" value={customerName} />
              <DetailItem label="Email" value={customerEmail} />
              <DetailItem label="Mobile" value={customerMobile} />
              <DetailItem label="Company" value={companyName} />
          </DetailSection>

          <DetailSection title="Trip Details">
              <DetailItem label="Service Type" value={serviceName} />
              <DetailItem label="Pickup" value={pickupLocation} />
              <DetailItem label="Drop-off" value={dropoffLocation} />
              <DetailItem label="Date & Time" value={pickupDate && pickupTime ? `${pickupDate} at ${pickupTime}` : (pickupDate || '')} />
          </DetailSection>

          <DetailSection title="Pricing & Status">
              <DetailItem label="Base Price" value={job.base_price !== undefined ? `S$ ${job.base_price.toFixed(2)}` : 'N/A'} />
              <DetailItem label="Final Price" value={job.final_price !== undefined ? `S$ ${job.final_price.toFixed(2)}` : 'N/A'} />
              <DetailItem label="Job Status" value={job.status && <Badge variant="info">{String(job.status)}</Badge>} />
          </DetailSection>

          <DetailSection title="Assignment & Other">
              <DetailItem label="Vehicle" value={vehicleType || 'Not Assigned'} />
              <DetailItem label="Driver" value={driverName || 'Not Assigned'} />
              <DetailItem label="Invoice #" value={invoiceId || 'Not Assigned'} />
              <DetailItem label="Passenger" value={passengerName} />
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
