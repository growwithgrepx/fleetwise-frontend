import type { Job } from '@/types/types';
import type { ApiJob } from '@/types/job';

// Define a type for vehicle_type that could be either a string or an object with a name property
type VehicleType = string | { name: string };

/**
 * Generates a formatted text summary of a job for sharing
 * @param job The job object to generate summary for (accepts both Job and ApiJob types)
 * @returns Formatted text summary
 */
export function generateJobSummary(job: Job | ApiJob): string {
  const lines: string[] = [];

  // Customer Account
  if (job.customer?.name) {
    lines.push(`Customer Account: ${job.customer.name}`);
  }

  // SIXT Booking Reference
  if (job.reference) {
    lines.push(`SIXT Booking Reference: ${job.reference}`);
  }

  // Type of vehicle
  if (job.vehicle_type) {
    const vehicleType = typeof job.vehicle_type === 'object' && (job.vehicle_type as { name: string }).name 
      ? (job.vehicle_type as { name: string }).name 
      : job.vehicle_type as string;
    lines.push(`Type of vehicle: ${vehicleType}`);
  }

  // Pick up Date and Time
  if (job.pickup_date && job.pickup_time) {
    const formattedDateTime = formatDateTime(job.pickup_date, job.pickup_time);
    if (formattedDateTime) {
      lines.push(`Pick up Date and Time: ${formattedDateTime}`);
    }
  }

  // Pick up Location
  if (job.pickup_location) {
    lines.push(`Pick up Location: ${job.pickup_location}`);
  }

  // Drop Off Location
  if (job.dropoff_location) {
    lines.push(`Drop Off Location: ${job.dropoff_location}`);
  }

  // Passenger Details
  const passengerDetails: string[] = [];
  if (job.passenger_name) {
    passengerDetails.push(job.passenger_name);
  }
  if (job.passenger_mobile) {
    passengerDetails.push(job.passenger_mobile);
  }
  
  if (passengerDetails.length > 0) {
    lines.push(`Passenger Details: ${passengerDetails.join(', ')}`);
  }

  // Driver Notes
  // Implement fallback logic as specified in acceptance criteria
  if (job.remarks || (job as any).customer_remark) {
    lines.push(`Driver Notes: ${job.remarks || (job as any).customer_remark}`);
  }

  return lines.join('\n');
}

/**
 * Formats date and time according to DD/MM/YYYY HH:MM format
 * @param date Date string in YYYY-MM-DD format
 * @param time Time string in HH:MM format
 * @returns Formatted date and time string
 */
function formatDateTime(date: string, time: string): string {
  if (!date || !time) return '';
  const dateParts = date.split('-');
  if (dateParts.length === 3 && dateParts.every(part => part && !isNaN(Number(part)))) {
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    return `${formattedDate} ${time}`;
  }
  return `${date} ${time}`;
}