import { ApiJob, NormalizedJobDisplay } from '@/types/job';

/**
 * Safely extracts a string value from unknown data
 * Always returns a string (never undefined) for consistent UI rendering
 *
 * @param value - The value to convert to string
 * @returns A string representation of the value, or empty string for null/undefined
 */
export function safeStringValue(value: unknown): string {
  // Null/undefined → empty string (explicit contract)
  if (value == null) return '';

  // Object → extract name property if exists, otherwise empty
  // Avoid .toString() which produces "[object Object]"
  if (typeof value === 'object' && value !== null) {
    return 'name' in value && typeof value.name === 'string'
      ? value.name
      : '';
  }

  // Primitives → stringify
  return String(value);
}

/**
 * Normalizes API job response to a flat structure for display
 * This transformation happens at the data boundary, not in components
 *
 * Uses optional chaining (?.) and nullish coalescing (??) for safe property access
 *
 * @param apiJob - The job data from the API with nested objects
 * @returns A normalized flat structure ready for display
 */
export function normalizeJobForDisplay(apiJob: ApiJob): NormalizedJobDisplay {
  return {
    id: apiJob.id,
    status: apiJob.status,

    // Service information - check for null explicitly, then fallback to flat properties
    // The API returns service as null when not set, and uses service_type/type_of_service instead
    // Use safeStringValue to safely extract string from service object or use flat properties
    serviceName: safeStringValue(apiJob.service) || safeStringValue(apiJob.service_type) || safeStringValue(apiJob.type_of_service) || '',

    // Customer information - prefer nested object, fallback to flat properties
    customerName: apiJob.customer?.name ?? apiJob.customer_name ?? '',
    customerEmail: apiJob.customer?.email ?? apiJob.customer_email ?? '',
    customerMobile: apiJob.customer?.mobile ?? apiJob.customer_mobile ?? '',
    companyName: apiJob.customer?.company_name ?? apiJob.company_name ?? '',

    // Driver information - prefer nested object, fallback to "Not Assigned"
    driverName: apiJob.driver?.name ? `${safeStringValue(apiJob.driver.name)}${apiJob.driver.mobile ? ` (${apiJob.driver.mobile})` : ''}` : 'Not Assigned',

    // Invoice information - prefer nested object, fallback to flat property
    invoiceId: apiJob.invoice?.id?.toString() ?? apiJob.invoice_id?.toString() ?? 'Not Assigned',
    vehicleType: apiJob.vehicle_type ? safeStringValue(apiJob.vehicle_type) : '',
    // Job details - prefer nested vehicle object type, fallback to flat vehicle_type
    // Use safeStringValue to handle cases where vehicle.type is an object with a 'name' property
    //vehicle: safeStringValue(apiJob.vehicle?.name) || 'Not Assigned',
    vehicle: apiJob.vehicle?.name ? `${safeStringValue(apiJob.vehicle.name)}${apiJob.vehicle.number ? ` (${apiJob.vehicle.number})` : ''}` : 'Not Assigned',
    pickupLocation: apiJob.pickup_location ?? '',
    dropoffLocation: apiJob.dropoff_location ?? '',
    pickupDate: apiJob.pickup_date ?? '',
    pickupTime: apiJob.pickup_time ?? '',
    passengerName: apiJob.passenger_name ? `${apiJob.passenger_name}${apiJob.passenger_mobile ? ` (${apiJob.passenger_mobile})` : ''}`: '',

    // Pricing
    basePrice: apiJob.base_price ?? 0,
    finalPrice: apiJob.final_price,
    jobCost: apiJob.job_cost !== null && apiJob.job_cost !== undefined ? apiJob.job_cost : undefined,

    // Keep reference to original job for other fields
    job: apiJob,
  };
}