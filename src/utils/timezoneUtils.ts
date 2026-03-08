/**
 * Timezone utility functions for FleetWise application
 * Handles conversion between UTC and display timezone (configurable, default Asia/Singapore)
 */

// Cache for the display timezone to avoid repeated API calls
let cachedDisplayTimezone: string | null = null;

/**
 * Get the configured display timezone
 * Fetches from system settings via API, with fallback to cached value and then default.
 * This is a synchronous getter that uses cached value for performance.
 */
export function getDisplayTimezone(): string {
  // Return cached timezone if available
  if (cachedDisplayTimezone) {
    return cachedDisplayTimezone;
  }

  // Return default if no cached value (will be updated after API fetch)
  return "Asia/Singapore";
}

/**
 * Initialize timezone from system settings (async)
 * Call this on app startup to fetch and cache the display timezone
 */
export async function initializeDisplayTimezone(): Promise<string> {
  try {
    // Only do this in browser context
    if (typeof window === 'undefined') {
      return "Asia/Singapore";
    }

    const { getSystemTimezone } = await import('@/services/api/settingsApi');
    const response = await getSystemTimezone();
    
    if (response && response.timezone) {
      cachedDisplayTimezone = response.timezone;
      // Also save to localStorage for persistence across page reloads
      localStorage.setItem('_cachedTimezone', response.timezone);
      return response.timezone;
    }
  } catch (error) {
    console.warn('Failed to fetch system timezone from API, using default', error);
    
    // Try to recover cached value from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('_cachedTimezone');
      if (stored) {
        cachedDisplayTimezone = stored;
        return stored;
      }
    }
  }

  cachedDisplayTimezone = "Asia/Singapore";
  return "Asia/Singapore";
}

/**
 * Refresh the cached timezone (call after changing timezone in Admin Settings)
 */
export async function refreshDisplayTimezone(): Promise<string> {
  // Clear cache to force refresh
  cachedDisplayTimezone = null;
  return initializeDisplayTimezone();
}

/**
 * Set timezone manually (usually after Admin Settings change)
 */
export function setDisplayTimezone(timezone: string): void {
  cachedDisplayTimezone = timezone;
  if (typeof window !== 'undefined') {
    localStorage.setItem('_cachedTimezone', timezone);
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
 * Deprecated: convertUtcToDisplayTime is no longer needed.
 * The backend now returns values in the display timezone, so no frontend conversion is required.
 * If you need to format a time value, use formatDisplayTime() instead.
 *
 * This function is kept for backward compatibility but should not be used for new code.
 * It now simply returns the input time string unchanged (as API values are already in display timezone).
 */
export function convertUtcToDisplayTime(utcTimeString: string, utcDateString?: string): string {
  // Backend now returns display timezone values directly
  // No conversion needed - return the value as-is
  return utcTimeString || '';
}

