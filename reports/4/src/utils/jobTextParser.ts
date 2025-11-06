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

    // Define field mappings
    const fieldMappings: Record<string, keyof JobFormData> = {
      'customer account': 'customer_name',
      'sixt booking reference': 'booking_ref',
      'type of vehicle': 'vehicle_type',
      'pick up location': 'pickup_location',
      'drop off location': 'dropoff_location',
      'drop-off location': 'dropoff_location',
      'service type': 'service_type'
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
          // Parse passenger name and mobile
          const passengerInfo = parsePassengerInfo(value);
          if (passengerInfo.name) parsedData.passenger_name = passengerInfo.name;
          if (passengerInfo.mobile) parsedData.passenger_mobile = passengerInfo.mobile;
        } else if (key.includes('flight details')) {
          // Store flight details to prepend to remarks
          flightDetails = value;
        } else if (key.includes('driver notes') || key.includes('system booking note') || key.includes('report')) {
          // Collect remarks
          if (value) remarks.push(`${keyPart}: ${value}`);
        } else if (key.includes('contractor') || key.includes('assigned to')) {
          // Store contractor name for later mapping
          (parsedData as any).contractor_name = value;
        } else {
          // Handle standard field mappings
          const fieldKey = Object.keys(fieldMappings).find(k => key.includes(k));
          if (fieldKey) {
            const targetField = fieldMappings[fieldKey];
            // Log the parsed customer name for debugging
            if (targetField === 'customer_name') {
              console.log('[jobTextParser] Parsing customer name:', { key, value, trimmedValue: value.trim() });
              // Normalize the customer name to remove extra spaces and special characters
              const normalizedCustomerName = value.trim()
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .replace(/[^\w\s\-&']/g, '') // Keep alphanumeric, spaces, hyphens, ampersands, and apostrophes
                .trim();
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

    // Combine remarks into a single field
    if (remarks.length > 0) {
      parsedData.remarks = remarks.join('\n');
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
 * Parse passenger information (name and mobile)
 * @param passengerStr - The passenger info string to parse
 * @returns Object with name and mobile fields
 */
function parsePassengerInfo(passengerStr: string): { name?: string; mobile?: string } {
  if (!passengerStr) return {};

  // Try to extract name and mobile
  // Handle format: "Mr **** Georges: +65 6213 ****"
  const colonSplit = passengerStr.split(':');
  if (colonSplit.length > 1) {
    // Extract name (before colon) and mobile (after colon)
    const namePart = colonSplit[0].trim();
    const mobilePart = colonSplit.slice(1).join(':').trim();
    
    // Clean up name (remove asterisks)
    const name = namePart.replace(/\*/g, '').trim();
    
    // Extract mobile (remove non-digits except +)
    const mobile = mobilePart.replace(/[^\d+]/g, '');
    
    return { name, mobile };
  }

  // Try alternative format: "Name (Mobile)" or "Name Mobile"
  const phoneRegex = /[\d\s\-\+\(\)]{8,}/;
  const phoneMatch = passengerStr.match(phoneRegex);
  
  if (phoneMatch) {
    const mobile = phoneMatch[0].replace(/\D/g, ''); // Remove all non-digit characters
    const name = passengerStr.replace(phoneRegex, '').trim().replace(/[(),]/g, '').trim();
    return { name, mobile };
  }

  // If no phone found, treat entire string as name
  return { name: passengerStr };
}