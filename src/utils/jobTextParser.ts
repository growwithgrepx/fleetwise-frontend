/**
 * Utility functions for parsing job data from plain text
 */

import { JobFormData } from '@/types/job';

export interface ParseResult {
  data?: Partial<JobFormData>;
  errors?: string[];
}

/**
 * Parse job data from plain text input
 * @param text - The raw text input to parse
 * @returns Parsed job data or error messages
 */
export function parseJobText(text: string): ParseResult {
  if (!text || text.trim().length === 0) {
    return { errors: ['No text provided for parsing'] };
  }

  try {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const parsedData: Partial<JobFormData> = {};
    const remarks: string[] = [];
    let flightDetails = '';
    const extraServices: Array<{ description: string; price: number }> = [];

    // Define field mappings
    const fieldMappings: Record<string, keyof JobFormData> = {
      'customer account': 'customer_name',
      'booking reference': 'booking_ref',
      'sixt booking reference': 'booking_ref',
      'type of vehicle': 'vehicle_type',
      'pick up location': 'pickup_location',
      'pickup location': 'pickup_location',
      'drop off location': 'dropoff_location',
      'drop-off location': 'dropoff_location',
      'dropoff location': 'dropoff_location',
      'service type': 'service_type',
      'passenger email': 'passenger_email',
      'customer email': 'customer_email',
      'customer mobile': 'customer_mobile'
    };

    // Process each line
    for (const line of lines) {
      // Check if line contains a colon (key-value format)
      if (line.includes(':')) {
        const [keyPart, ...valueParts] = line.split(':');
        const key = keyPart.trim().toLowerCase();
        const value = valueParts.join(':').trim();

        // Handle special cases
        if (key.includes('pick up date and time')) {
          // Parse date and time
          const dateTime = parseDateTime(value);
          if (dateTime.date) parsedData.pickup_date = dateTime.date;
          if (dateTime.time) parsedData.pickup_time = dateTime.time;
        } else if (key.includes('passenger details')) {
          // Parse passenger name, mobile, and email
          const passengerInfo = parsePassengerInfo(value);
          if (passengerInfo.name) parsedData.passenger_name = passengerInfo.name;
          if (passengerInfo.mobile) parsedData.passenger_mobile = passengerInfo.mobile;
          if (passengerInfo.email) parsedData.passenger_email = passengerInfo.email;
        } else if (key.includes('flight details')) {
          // Store flight details to prepend to remarks
          flightDetails = value;
        } else if (key.includes('report')) {
          // Capture report time instructions (critical operational data)
          if (value) remarks.push(`Report: ${value}`);
        } else if (key.includes('system booking note') || key.includes('booking note')) {
          // Capture system booking notes (business rules and instructions)
          if (value) remarks.push(`System Booking Note: ${value}`);
        } else if (key.includes('driver notes')) {
          // Collect driver notes
          if (value) remarks.push(`Driver Notes: ${value}`);
        } else if (key.includes('contractor') || key.includes('assigned to')) {
          // Store contractor name for later mapping
          (parsedData as any).contractor_name = value;
        } else if (key.includes('number of passengers')) {
          // Parse number of passengers and add to remarks
          const num = parseInt(value, 10);
          if (!isNaN(num)) {
            remarks.push(`Number of Passengers: ${num}`);
          }
        } else if (key.includes('toddler seat') || key.includes('infant seat')) {
          // Parse seat requirements into remarks
          remarks.push(`${keyPart}: ${value}`);
        } else if (key.includes('pu address note') || key.includes('pickup address note') || key.includes('pick up address note')) {
          // Pickup address notes
          (parsedData as any).pickup_note = value;
        } else if (key.includes('do address note') || key.includes('dropoff address note') || key.includes('drop off address note') || (key.includes('address note') && !key.includes('pu') && !key.includes('pickup') && !key.includes('pick up'))) {
          // Dropoff address notes (default for generic "address note")
          (parsedData as any).dropoff_note = value;
        } else if (key.includes('special remarks')) {
          // Special remarks
          remarks.push(`Special Remarks: ${value}`);
        } else if (key.includes('driver:') || key === 'driver') {
          // Store driver name for mapping
          (parsedData as any).driver_name = value.trim();
        } else if (key.includes('vehicle:') || key === 'vehicle') {
          // Store vehicle name for mapping
          (parsedData as any).vehicle_name = value.trim();
        } else if (key.includes('extra services')) {
          // Parse extra services as comma-separated list
          // Split by comma and create service objects with description and default price 0
          const serviceList = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
          serviceList.forEach(serviceName => {
            extraServices.push({
              description: serviceName,
              price: 0
            });
          });
          // Don't add to remarks - extra services are stored separately
        } else {
          // Handle standard field mappings
          const fieldKey = Object.keys(fieldMappings).find(k => key.includes(k));
          if (fieldKey) {
            const targetField = fieldMappings[fieldKey];
            // Log the parsed customer name for debugging
            if (targetField === 'customer_name') {
              console.log('[jobTextParser] Parsing customer name:', { key, value, trimmedValue: value.trim() });
              // Normalize the customer name to remove extra spaces
              const normalizedCustomerName = value.trim()
                .replace(/\s+/g, ' '); // Replace multiple spaces with single space
              (parsedData[targetField] as string) = normalizedCustomerName;
            } else {
              (parsedData[targetField] as string) = value.trim();
            }
          }
        }
      }
    }

    // Prepend flight details to remarks if present
    if (flightDetails) {
      remarks.unshift(`Flight Details: ${flightDetails}`);
    }

    // Combine remarks into remarks field (used by JobForm)
    if (remarks.length > 0) {
      (parsedData as any).remarks = remarks.join('\n');
    }

    // Add extra services to parsed data
    if (extraServices.length > 0) {
      (parsedData as any).extra_services = extraServices;
    }

    console.log('[jobTextParser] Parsed data:', parsedData);

    // Validate essential fields
    const errors: string[] = [];
    if (!parsedData.customer_name) {
      errors.push('Customer Account is required');
    }
    if (!parsedData.pickup_date) {
      errors.push('Pick up Date is required');
    }
    if (!parsedData.pickup_time) {
      errors.push('Pick up Time is required');
    }
    if (!parsedData.pickup_location) {
      errors.push('Pick up Location is required');
    }
    if (!parsedData.dropoff_location) {
      errors.push('Drop Off Location is required');
    }
    // Note: We're not validating service_type and contractor_id here because they will be 
    // selected by the user in the form after parsing

    if (errors.length > 0) {
      return { errors };
    }
    
    // Map vehicle type to a standard format if needed
    if (parsedData.vehicle_type) {
      // Normalize vehicle type names
      const vehicleTypeMap: Record<string, string> = {
        'combi': 'Premium 6 Seater',
        'e-class sedan': 'E-Class Sedan',
        'premium 6 seater': 'Premium 6 Seater',
        'v-class (7 seater)': 'V-Class (7 Seater)',
        'coach (13 seater)': 'COACH (13 Seater)',
        'coach (23 seater)': 'COACH (23 Seater)',
        'coach (45 seater)': 'COACH (45 Seater)'
      };
      
      const normalized = parsedData.vehicle_type.toLowerCase();
      if (vehicleTypeMap[normalized]) {
        parsedData.vehicle_type = vehicleTypeMap[normalized];
      } else {
        // If no mapping found, set to empty string to trigger validation error
        // This will make it clear that the vehicle type was not found
        parsedData.vehicle_type = '';
      }
    }

    return { data: parsedData };
  } catch (error) {
    return { errors: [`Failed to parse text: ${error instanceof Error ? error.message : 'Unknown error'}`] };
  }
}

/**
 * Parse date and time from a string
 * @param dateTimeStr - The date/time string to parse
 * @returns Object with date and time fields
 */
function parseDateTime(dateTimeStr: string): { date?: string; time?: string } {
  if (!dateTimeStr) return {};

  // Handle various date formats
  // Common format: DD/MM/YYYY HH:MM
  const dateTimeRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/;
  const match = dateTimeStr.match(dateTimeRegex);
  
  if (match) {
    const [, day, month, year, hour, minute] = match;
    // NOTE: Assumes input time is in user's local timezone
    // Backend must handle conversion to UTC on save
    // Convert to YYYY-MM-DD format
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    // Keep time as HH:MM
    const time = `${hour.padStart(2, '0')}:${minute}`;
    return { date, time };
  }

  // Handle other common formats as needed
  // Format: DD-MM-YYYY HH:MM
  const dateTimeRegex2 = /^(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})$/;
  const match2 = dateTimeStr.match(dateTimeRegex2);
  
  if (match2) {
    const [, day, month, year, hour, minute] = match2;
    // NOTE: Assumes input time is in user's local timezone
    // Backend must handle conversion to UTC on save
    const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const time = `${hour.padStart(2, '0')}:${minute}`;
    return { date, time };
  }

  // If we can't parse, return the original string as time
  return { time: dateTimeStr };
}

/**
 * Parse passenger information (name, mobile, and email)
 * @param passengerStr - The passenger info string to parse
 * @returns Object with name, mobile, and email fields
 */
function parsePassengerInfo(passengerStr: string): { name?: string; mobile?: string; email?: string } {
  if (!passengerStr) return {};

  let name: string | undefined;
  let mobile: string | undefined;
  let email: string | undefined;

  // Extract email if present
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = passengerStr.match(emailRegex);
  if (emailMatch) {
    email = emailMatch[0];
    // Remove email from the string for further processing
    passengerStr = passengerStr.replace(emailRegex, '').trim();
  }

  // Try to extract name and mobile
  // Handle format: "Mr **** Georges: +65 6213 ****"
  const colonSplit = passengerStr.split(':');
  if (colonSplit.length > 1) {
    // Extract name (before colon) and mobile (after colon)
    const namePart = colonSplit[0].trim();
    const mobilePart = colonSplit.slice(1).join(':').trim();

    // Clean up name (remove asterisks)
    name = namePart.replace(/\*/g, '').trim();

    // Extract mobile (remove non-digits except +)
    mobile = mobilePart.replace(/[^\d+]/g, '');

    return { name, mobile, email };
  }

  // Try alternative format: "Name (Mobile)" or "Name Mobile"
  const phoneRegex = /[\d\s\-\+\(\)]{8,}/;
  const phoneMatch = passengerStr.match(phoneRegex);

  if (phoneMatch) {
    mobile = phoneMatch[0].replace(/\D/g, ''); // Remove all non-digit characters
    name = passengerStr.replace(phoneRegex, '').trim().replace(/[(),]/g, '').trim();
    return { name, mobile, email };
  }

  // If no phone found, treat entire string as name
  name = passengerStr.trim();
  return { name, mobile, email };
}