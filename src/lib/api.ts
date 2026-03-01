import axios, { AxiosError, AxiosResponse } from 'axios';

// Get the API base URL - prefer environment variable, fallback to proxy
const getApiBaseUrl = () => {
  // If NEXT_PUBLIC_API_URL is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (process.env.NODE_ENV === 'production') {
    return 'https://fleet.avant-garde.com.sg';
  }
  
  // In development, use the Next.js API proxy
  // This will proxy /api requests to the backend
  return '';
};

// Create axios instance with default config
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  // Add withCredentials for session cookies
  withCredentials: true,
  // Ensure credentials are sent with cross-origin requests
  withXSRFToken: true,
});

// Add request interceptor for debugging and session handling
api.interceptors.request.use(
  async (config) => {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    // Ensure credentials are included for all requests
    config.withCredentials = true;
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Only log in development
    if (process.env.NODE_ENV === 'development' ) {
      console.log(`API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const data = error.response.data as any;
      let msg = 'An error occurred';
      
      // Handle 403 Forbidden - authentication issue
      if (error.response.status === 403) {
        console.error('[API] 403 Forbidden - Authentication issue detected');
        msg = 'Authentication required. Please log in again.';
        
        // Try to refresh the session
        try {
          const refreshResponse = await fetch('/api/auth/me', { 
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!refreshResponse.ok) {
            // Session is invalid, redirect to login
            console.log('[API] Session refresh failed, redirecting to login');
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        } catch (refreshError) {
          console.error('[API] Session refresh error:', refreshError);
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(new Error(msg));
      }
      
      // Check if response is HTML (login redirect)
      const contentType = error.response.headers?.['content-type'] || '';
      if (contentType.includes('text/html')) {
        // This is likely a login redirect - user needs to authenticate
        console.error('[API] Received HTML response - authentication required');
        msg = 'Authentication required. Please log in.';
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(new Error(msg));
      }
      
      // Handle different types of error responses
      if (data && typeof data === 'object') {
        if (Object.keys(data).length > 0) {
          // Check for error message in different possible locations
          // For scheduling conflicts, prefer the message field over error field
          // Also check for more detailed error information in the traceback or other fields
          msg = data.message || data.error || data.detail || JSON.stringify(data);
        } else {
          // Empty object response - check status code
          if (error.response.status === 409) {
            msg = 'Scheduling conflict detected. Please select a different date or time.';
          } else {
            msg = `Server returned an empty response (${error.response.status})`;
          }
        }
      } else if (typeof data === 'string' && data.length > 0) {
        // Handle string responses (could be HTML or error message)
        if (data.includes('<!DOCTYPE html>') || data.includes('<html')) {
          // HTML response - authentication required
          msg = 'Authentication required. Please log in.';
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        } else {
          msg = data;
        }
      } else if (error.response.status === 409) {
        // Special handling for 409 conflict status
        msg = 'Scheduling conflict detected. Please select a different date or time.';
      }
      
      if (data && typeof data === "object") {
        // Don't log ServiceError messages to console to avoid duplication with toast notifications
        // Only log if it's not a ServiceError with detailed message
        if (!(data.message || data.error)) {
          console.error("API Error Response:", data);
        }
      } else if (data && typeof data === 'string') {
        if (!data.includes('<!DOCTYPE html>')) {
          console.error("API Error Response (string):", data.substring(0, 200));
        }
      } else if (data) {
        console.error("API Error Response (non-object):", data);
      } else {
        console.error("API Error: No response data");
      }
      
      // Create a special error object for 409 conflicts
      if (error.response.status === 409) {
        // Check if this is already a SchedulingConflict error to avoid duplication
        if (data && typeof data === 'object' && (data.message || data.error)) {
          const conflictMessage = data.message || data.error || 'Scheduling conflict detected. Please select a different date or time.';
          const conflictError = new Error(conflictMessage);
          conflictError.name = 'SchedulingConflict';
          return Promise.reject(conflictError);
        } else {
          const conflictError = new Error(msg);
          conflictError.name = 'SchedulingConflict';
          return Promise.reject(conflictError);
        }
      }
      
      return Promise.reject(new Error(msg));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('API No Response:', error.request);
      return Promise.reject(new Error('No response from server. Please check if the backend server is running.'));
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('API Request Error:', error.message);
      return Promise.reject(new Error('Request configuration error'));
    }
  }
);

// Export types for better TypeScript support
export type ApiResponse<T> = Promise<AxiosResponse<T>>;