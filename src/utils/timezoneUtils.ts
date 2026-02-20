/**
 * Timezone utility functions for FleetWise application
 * Handles conversion between UTC and display timezone (configurable, default Asia/Singapore)
 */

/**
 * Get the configured display timezone
 * Reads from General Settings, defaults to Asia/Singapore
 */
export function getDisplayTimezone(): string {
  // Check what's in localStorage
  if (typeof window !== 'undefined') {
    
    // Temporary test: Force SGT timezone
    // localStorage.setItem('userTimezone', 'Asia/Singapore');
  }
  
  // In production, this would read from:
  // 1. User preferences (if logged in)
  // 2. System General Settings
  // 3. Default to Asia/Singapore
  
  // Check localStorage for user timezone setting
  let savedTimezone = typeof window !== 'undefined' ? localStorage.getItem('userTimezone') : null;
  
  // If we have a saved timezone, map it from display format to IANA format
  if (savedTimezone) {
    console.log('[TimezoneUtils] Raw saved timezone from localStorage:', savedTimezone);
    
    // Map display timezone names to IANA timezone identifiers
    const timezoneMap: Record<string, string> = {
      'SGT': 'Asia/Singapore',
      'PST': 'America/Los_Angeles',
      'EST': 'America/New_York',
      'CET': 'Europe/Paris',
      'GMT': 'Europe/London',
      'IST': 'Asia/Kolkata',
      'JST': 'Asia/Tokyo',
      'AEST': 'Australia/Sydney',
    };
    
    // If it's a mapped value, return the IANA equivalent
    if (savedTimezone in timezoneMap) {
      console.log('[TimezoneUtils] Mapped saved timezone:', savedTimezone, 'to', timezoneMap[savedTimezone]);
      return timezoneMap[savedTimezone];
    }
    
    console.log('[TimezoneUtils] Using saved timezone (no mapping needed):', savedTimezone);
    return savedTimezone;
  }
  
  // Check for system timezone setting
  let systemTimezone = typeof window !== 'undefined' ? localStorage.getItem('systemTimezone') : null;
  
  if (systemTimezone) {
    // Also map system timezone if needed
    const timezoneMap: Record<string, string> = {
      'SGT': 'Asia/Singapore',
      'PST': 'America/Los_Angeles',
      'EST': 'America/New_York',
      'CET': 'Europe/Paris',
      'GMT': 'Europe/London',
      'IST': 'Asia/Kolkata',
      'JST': 'Asia/Tokyo',
      'AEST': 'Australia/Sydney',
    };
    
    if (systemTimezone in timezoneMap) {
      console.log('[TimezoneUtils] Mapped system timezone:', systemTimezone, 'to', timezoneMap[systemTimezone]);
      return timezoneMap[systemTimezone];
    }
    
    console.log('[TimezoneUtils] Using system timezone:', systemTimezone);
    return systemTimezone;
  }
  
  // Default to Asia/Singapore as per current requirements
  console.log('[TimezoneUtils] Using default timezone: Asia/Singapore');
  return "Asia/Singapore";
}

/**
 * Convert a UTC date/time to the configured display timezone
 * @param utcDateTime - UTC date/time string or Date object
 * @returns Date object in the display timezone
 */
export function convertUtcToDisplay(utcDateTime: string | Date): Date {
  let date = utcDateTime instanceof Date ? utcDateTime : new Date(utcDateTime);
  
  // Create a new Date object that represents the same moment in the target timezone
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const targetTimezoneOffset = getTimezoneOffset(getDisplayTimezone(), date);
  
  return new Date(utcTime + (targetTimezoneOffset * 60000));
}

/**
 * Convert a date/time in the configured display timezone to UTC
 * @param displayDateTime - Display timezone date/time string or Date object
 * @returns Date object in UTC
 */
export function convertDisplayToUtc(displayDateTime: string | Date): Date {
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
  console.log('%%%%%%%%%%%%%%%%%%% CONVERT DISPLAY TO UTC CALLED %%%%%%%%%%%%%%%%%%%%%');
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
  let date = displayDateTime instanceof Date ? displayDateTime : new Date(displayDateTime);
  console.log('[TimezoneUtils] convertDisplayToUtc called with:', date.toISOString(), 'type:', typeof displayDateTime);
  
  // Get the timezone offset for the display timezone
  const displayTimezone = getDisplayTimezone();
  const offsetMinutes = getTimezoneOffset(displayTimezone, date);
  console.log('[TimezoneUtils] Display timezone for conversion:', displayTimezone);
  console.log('[TimezoneUtils] Timezone offset (minutes):', offsetMinutes);
  console.log('[TimezoneUtils] Timezone offset (hours):', offsetMinutes / 60);
  
  // For display timezone to UTC conversion:
  // If we have a time that represents 19:00 in SGT (UTC+8),
  // we need to SUBTRACT 8 hours to get UTC (11:00 UTC)
  // So we subtract the offset: date - offset = UTC
  const result = new Date(date.getTime() - offsetMinutes * 60000);
  console.log('[TimezoneUtils] Final UTC date from convertDisplayToUtc:', result.toISOString());
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
  console.log('%%%%%%%%%%%%%%%%%% CONVERT DISPLAY TO UTC FINISHED %%%%%%%%%%%%%%%%%%%%');
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
  return result;
}

/**
 * Format a UTC date for display in the configured timezone
 * @param utcDate - UTC date string or Date object
 * @param format - Format string ('date', 'time', 'datetime')
 * @returns Formatted string in the display timezone
 */
export function formatUtcForDisplay(utcDate: string | Date, format: 'date' | 'time' | 'datetime' = 'datetime'): string {
  const date = utcDate instanceof Date ? utcDate : new Date(utcDate);
  
  // Convert UTC time to display timezone
  const displayDate = convertUtcToDisplay(date);
  
  const options: Intl.DateTimeFormatOptions = {};
  
  switch (format) {
    case 'date':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
      break;
    case 'datetime':
    default:
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
      break;
  }
  
  // Use the display timezone for formatting
  return displayDate.toLocaleString('en-GB', { 
    ...options, 
    timeZone: getDisplayTimezone() 
  });
}

/**
 * Format a date for API submission (in UTC)
 * @param displayDate - Date in display timezone
 * @returns ISO string in UTC
 */
export function formatForApi(displayDate: Date): string {
  // Convert to UTC before sending to API
  return new Date(displayDate.getTime() + displayDate.getTimezoneOffset() * 60000).toISOString();
}

/**
 * Helper function to get timezone offset in minutes for a given timezone and date
 * This is a simplified approach using Intl.DateTimeFormat
 */
function getTimezoneSuffix(timezone: string): string {
  // Return timezone suffix for Date parsing
  // This is a simplified approach - in practice, you'd want to use a proper timezone library
  const suffixes: Record<string, string> = {
    'Asia/Singapore': '+08:00',
    'America/Los_Angeles': '-08:00',
    'Europe/Paris': '+01:00',
    'Asia/Kolkata': '+05:30',
    'Asia/Tokyo': '+09:00',
    'Australia/Sydney': '+10:00',
  };
  
  return suffixes[timezone] || '+00:00';
}

function getTimezoneOffset(timezone: string, date: Date): number {
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
  console.log('%%%%%%%%%%%%%%%%%%%% GET TIMEZONE OFFSET CALLED %%%%%%%%%%%%%%%%%%%%%');
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
  console.log('[TimezoneUtils] getTimezoneOffset called with:', { timezone, date: date.toISOString() });
  
  // Simple approach: Use a mapping for common timezones
  const timezoneOffsets: Record<string, number> = {
    'Asia/Singapore': 480, // UTC+8
    'America/Los_Angeles': -480, // UTC-8
    'Europe/Paris': 60, // UTC+1
    'Asia/Kolkata': 330, // UTC+5:30
    'Asia/Tokyo': 540, // UTC+9
    'Australia/Sydney': 600, // UTC+10
  };
  
  if (timezone in timezoneOffsets) {
    const offset = timezoneOffsets[timezone];
    console.log('[TimezoneUtils] Using mapped offset for', timezone, ':', offset, 'minutes');
    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    console.log('%%%%%%%%%%%%%%%%%%% GET TIMEZONE OFFSET FINISHED %%%%%%%%%%%%%%%%%%%%%');
    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    return offset;
  }
  
  // Fallback to Intl.DateTimeFormat approach
  console.log('[TimezoneUtils] Falling back to Intl.DateTimeFormat approach');
  
  // Get the timezone offset for the given date in the specified timezone
  // This approach directly calculates the offset between the timezone and UTC
  const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  
  // Format the same instant in the target timezone
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'longOffset'
  });
  
  const parts = formatter.formatToParts(date);
  console.log('[TimezoneUtils] Formatted parts:', parts);
  
  // Find the timezone offset part
  const timeZonePart = parts.find(part => part.type === 'timeZoneName');
  console.log('[TimezoneUtils] Timezone part:', timeZonePart);
  
  if (timeZonePart && timeZonePart.value) {
    // Extract the offset from the timezone name (e.g., "GMT+08:00")
    const offsetMatch = timeZonePart.value.match(/[+-]\d{2}:\d{2}/);
    if (offsetMatch) {
      const offsetStr = offsetMatch[0]; // e.g., "+08:00" or "-05:00"
      const sign = offsetStr.charAt(0) === '-' ? -1 : 1;
      const [hours, minutes] = offsetStr.substring(1).split(':').map(Number);
      const totalMinutes = sign * (hours * 60 + minutes);
      
      console.log('[TimezoneUtils] Parsed offset string:', offsetStr);
      console.log('[TimezoneUtils] Calculated offset (minutes):', totalMinutes);
      console.log('[TimezoneUtils] Calculated offset (hours):', totalMinutes / 60);
      
      console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
      console.log('%%%%%%%%%%%%%%%%%%% GET TIMEZONE OFFSET FINISHED %%%%%%%%%%%%%%%%%%%%%');
      console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
      return totalMinutes;
    }
  }
  
  // Fallback: if we can't parse the offset, return 0
  console.log('[TimezoneUtils] Could not parse offset, returning 0');
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
  console.log('%%%%%%%%%%%%%%%%%%% GET TIMEZONE OFFSET FINISHED %%%%%%%%%%%%%%%%%%%%%');
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
  return 0;
}

/**
 * Parse a date string in display format (DD/MM/YYYY) to a Date object
 * @param dateString - Date string in DD/MM/YYYY format
 * @param timeString - Optional time string in HH:MM format
 * @returns Date object in display timezone
 */
export function parseDisplayDate(dateString: string, timeString?: string): Date {
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
  console.log('%%%%%%%%%%%%%%%%%%%% PARSE DISPLAY DATE CALLED %%%%%%%%%%%%%%%%%%%%%');
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
  console.log('[TimezoneUtils] parseDisplayDate called with:', { dateString, timeString });
  
  if (!dateString) {
    console.log('[TimezoneUtils] No date string provided, returning new Date()');
    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    console.log('%%%%%%%%%%%%%%%%%%% PARSE DISPLAY DATE FINISHED %%%%%%%%%%%%%%%%%%%%');
    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    return new Date();
  }
  
  // Validate date string format
  if (!dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    console.error('[TimezoneUtils] Invalid date format:', dateString);
    console.error('[TimezoneUtils] Expected format: DD/MM/YYYY');
    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    console.log('%%%%%%%%%%%%%%%%%%% PARSE DISPLAY DATE FINISHED %%%%%%%%%%%%%%%%%%%%');
    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    return new Date(); // Return current date as fallback
  }
  
  const [day, month, year] = dateString.split('/').map(Number);
  console.log('[TimezoneUtils] Parsed date components:', { day, month, year });
  
  // Validate parsed components
  if (isNaN(day) || isNaN(month) || isNaN(year) || day < 1 || day > 31 || month < 1 || month > 12) {
    console.error('[TimezoneUtils] Invalid date components:', { day, month, year });
    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    console.log('%%%%%%%%%%%%%%%%%%% PARSE DISPLAY DATE FINISHED %%%%%%%%%%%%%%%%%%%%');
    console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
    return new Date(); // Return current date as fallback
  }
  
  // Get the display timezone
  const displayTimezone = getDisplayTimezone();
  console.log('[TimezoneUtils] Display timezone:', displayTimezone);
  
  // Create date in UTC representing the same moment as the user's input in display timezone
  if (timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    console.log('[TimezoneUtils] Parsed time components:', { hours, minutes });
    
    // Direct timezone offset approach - simpler and more reliable
    // Create a UTC date at noon to avoid DST issues
    const utcBase = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
    
    // Get the timezone offset for this date in the display timezone
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: displayTimezone,
      timeZoneName: 'longOffset'
    });
    
    const parts = formatter.formatToParts(utcBase);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    console.log('[TimezoneUtils] Timezone part:', timeZonePart);
    
    // Parse the offset (e.g., "GMT+08:00" -> +480 minutes)
    let offsetMinutes = 0;
    if (timeZonePart) {
      const offsetMatch = timeZonePart.value.match(/[+-]\d{2}:\d{2}/);
      if (offsetMatch) {
        const [sign, hours, minutes] = offsetMatch[0].match(/([+-])(\d{2}):(\d{2})/)!.slice(1);
        offsetMinutes = parseInt(hours) * 60 + parseInt(minutes);
        if (sign === '-') offsetMinutes = -offsetMinutes;
        console.log('[TimezoneUtils] Parsed offset:', offsetMinutes, 'minutes');
        console.log('[TimezoneUtils] Offset breakdown:', { sign, hours, minutes });
      }
    }
    
    // Calculate UTC time: display_time - offset = UTC_time
    // If user enters 19:00 in SGT (+480), UTC should be 11:00
    console.log('[TimezoneUtils] Detailed calculation for 19:00 SGT -> UTC:');
    console.log('[TimezoneUtils]   Input time:', hours, ':', minutes, displayTimezone);
    console.log('[TimezoneUtils]   Offset minutes:', offsetMinutes);
    console.log('[TimezoneUtils]   Offset hours:', offsetMinutes / 60);
    
    const utcHours = hours - Math.floor(offsetMinutes / 60);
    const utcMinutes = minutes - (offsetMinutes % 60);
    
    console.log('[TimezoneUtils]   Raw calculation:');
    console.log('[TimezoneUtils]     utcHours =', hours, '-', Math.floor(offsetMinutes / 60), '=', utcHours);
    console.log('[TimezoneUtils]     utcMinutes =', minutes, '-', (offsetMinutes % 60), '=', utcMinutes);
    
    // Handle negative hours/minutes
    let finalHours = utcHours;
    let finalMinutes = utcMinutes;
    if (finalMinutes < 0) {
      finalMinutes += 60;
      finalHours -= 1;
      console.log('[TimezoneUtils]   Adjusted for negative minutes: finalMinutes =', finalMinutes, ', finalHours =', finalHours);
    }
    if (finalHours < 0) {
      finalHours += 24;
      console.log('[TimezoneUtils]   Adjusted for negative hours: finalHours =', finalHours);
    }
    if (finalHours >= 24) {
      finalHours -= 24;
      console.log('[TimezoneUtils]   Adjusted for hours >= 24: finalHours =', finalHours);
    }
    
    console.log('[TimezoneUtils] Final conversion: ', hours, ':', minutes, ' ', displayTimezone, ' -> ', finalHours, ':', finalMinutes, ' UTC');
    
    const utcDate = new Date(Date.UTC(year, month - 1, day, finalHours, finalMinutes, 0, 0));
    console.log('[TimezoneUtils] Final UTC date:', utcDate.toISOString());
    console.log('=== PARSE DISPLAY DATE FINISHED ===');
    return utcDate;
  } else {
    // For date-only, create UTC date at start of day
    console.log('[TimezoneUtils] Creating date-only UTC date');
    console.log('=== PARSE DISPLAY DATE FINISHED ===');
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
}

/**
 * Format a Date object to display format (DD/MM/YYYY)
 * @param date - Date object
 * @returns Date string in DD/MM/YYYY format
 */
export function formatDisplayDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // month is 0-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a Date object to HTML date input format (yyyy-MM-dd) in display timezone
 * @param date - Date object
 * @returns Date string in yyyy-MM-dd format for HTML date inputs
 */
export function formatHtmlDateInput(date: Date): string {
  const displayTimezone = getDisplayTimezone();
  
  // Format as yyyy-MM-dd in the display timezone
  const formatter = new Intl.DateTimeFormat('fr-CA', {
    timeZone: displayTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  return formatter.format(date);
}

/**
 * Format a Date object to time format (HH:MM) in display timezone
 * @param date - Date object
 * @returns Time string in HH:MM format
 */
export function formatDisplayTime(date: Date): string {
  const displayTimezone = getDisplayTimezone();
  
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: displayTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  return formatter.format(date);
}

/**
 * Format a Date object to time format (HH:MM) in UTC timezone
 * @param date - Date object
 * @returns Time string in HH:MM format in UTC
 */
export function formatUtcTime(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  return formatter.format(date);
}

/**
 * Convert UTC time from database back to display timezone for user interface
 * @param utcTimeString - Time string from database (HH:MM format, assumed to be UTC)
 * @param utcDateString - Date string from database (YYYY-MM-DD format, assumed to be UTC)
 * @returns Time string in display timezone (HH:MM format)
 */
export function convertUtcToDisplayTime(utcTimeString: string, utcDateString?: string): string {
  if (!utcTimeString) {
    return '';
  }
  
  if (!utcTimeString) {
    console.log('[TimezoneUtils] No time string provided, returning empty string');
    return '';
  }
  
  // Parse the UTC time string
  const [hours, minutes] = utcTimeString.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) {
    console.error('[TimezoneUtils] Invalid time format:', utcTimeString);
    return utcTimeString; // Return as-is if invalid
  }
  
  // Create a UTC date object
  let utcDate: Date;
  if (utcDateString) {
    // If we have a date, create a full datetime
    const [year, month, day] = utcDateString.split('-').map(Number);
    utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  } else {
    // If no date provided, use today's date
    const now = new Date();
    utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0));
  }
  
  console.log('[TimezoneUtils] Created UTC date:', utcDate.toISOString());
  
  // Convert UTC to display timezone
  const displayDate = convertUtcToDisplay(utcDate);
  
  // Format as HH:MM
  const displayHours = displayDate.getHours().toString().padStart(2, '0');
  const displayMinutes = displayDate.getMinutes().toString().padStart(2, '0');
  const result = `${displayHours}:${displayMinutes}`;
  
  console.log('[TimezoneUtils] Converted UTC time', utcTimeString, 'to display time:', result);
  
  return result;
}

