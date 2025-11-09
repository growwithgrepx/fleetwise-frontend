import type { Job } from '@/types/types';
import type { ApiJob } from '@/types/job';

// Define a type for vehicle_type that could be either a string or an object with a name property
type VehicleType = string | { name: string };

// Add type guard helper functions
function hasReference(job: Job | ApiJob): boolean {
  const bookingRef = (job as any).booking_ref || (job as any).reference;
  return typeof bookingRef === 'string' && bookingRef.length > 0;
}

function getBookingRef(job: Job | ApiJob): string | undefined {
  return (job as any).booking_ref || (job as any).reference;
}

function getDriverNotes(job: Job | ApiJob): string | undefined {
  if ('remarks' in job && job.remarks) {
    return job.remarks;
  }
  if ('customer_remark' in job && typeof (job as any).customer_remark === 'string') {
    return (job as any).customer_remark;
  }
  return undefined;
}

/**
 * Generates a formatted text summary of a job for sharing
 * @param job The job object to generate summary for (accepts both Job and ApiJob types)
 * @returns Formatted text summary
 */
export function generateJobSummary(job: Job | ApiJob): string {
  const lines: string[] = [];

  // BOOKING DETAILS section header
  lines.push('BOOKING DETAILS');

  // Customer Account
  if (job.customer?.name) {
    lines.push(`Customer Account: ${job.customer.name}`);
  }

  // SIXT Booking Reference
  if (hasReference(job)) {
    const bookingRef = getBookingRef(job);
    if (bookingRef) {
      lines.push(`SIXT Booking Reference: ${bookingRef}`);
    }
  }

  // Service Type
  if ((job as any).service_type) {
    lines.push(`Service Type: ${(job as any).service_type}`);
  }

  // Type of vehicle
  if (job.vehicle_type) {
    const vehicleType = typeof job.vehicle_type === 'object' && (job.vehicle_type as { name: string }).name
      ? (job.vehicle_type as { name: string }).name
      : job.vehicle_type as string;
    lines.push(`Type of vehicle: ${vehicleType}`);
  }

  // Vehicle (assigned vehicle - if different from vehicle_type)
  if ((job as any).vehicle && typeof (job as any).vehicle === 'object' && (job as any).vehicle.name) {
    lines.push(`Vehicle: ${(job as any).vehicle.name}`);
  } else if ((job as any).vehicle && typeof (job as any).vehicle === 'string') {
    lines.push(`Vehicle: ${(job as any).vehicle}`);
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

  // Pick up Address Note
  if ((job as any).pickup_note) {
    lines.push(`PU Address Note: ${(job as any).pickup_note}`);
  }

  // Drop Off Location
  if (job.dropoff_location) {
    lines.push(`Drop Off Location: ${job.dropoff_location}`);
  }

  // Drop Off Address Note
  if ((job as any).dropoff_note) {
    lines.push(`DO Address Note: ${(job as any).dropoff_note}`);
  }

  // Passenger Details
  const passengerDetails: string[] = [];
  if (job.passenger_name) {
    passengerDetails.push(job.passenger_name);
  }
  if (job.passenger_mobile) {
    passengerDetails.push(job.passenger_mobile);
  }
  if ((job as any).passenger_email) {
    passengerDetails.push((job as any).passenger_email);
  }

  if (passengerDetails.length > 0) {
    lines.push(`Passenger Details: ${passengerDetails.join(', ')}`);
  }

  // Driver Name (assigned driver)
  if ((job as any).driver?.name) {
    lines.push(`Driver: ${(job as any).driver.name}`);
  }

  // Driver Notes (from customer_remark or remarks)
  const driverNotes = getDriverNotes(job);
  if (driverNotes) {
    lines.push(`Driver Notes: ${driverNotes}`);
  }

  // Extra Services
  if ((job as any).extra_services && Array.isArray((job as any).extra_services) && (job as any).extra_services.length > 0) {
    const serviceNames = (job as any).extra_services
      .map((service: any) => {
        if (typeof service === 'string') return service;
        // Check for both 'name' and 'description' properties
        return service.name || service.description;
      })
      .filter(Boolean);
    if (serviceNames.length > 0) {
      lines.push(`Extra Services: ${serviceNames.join(', ')}`);
    }
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