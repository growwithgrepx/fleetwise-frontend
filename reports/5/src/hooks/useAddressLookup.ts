import React, { useState, useRef, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAddressCache } from '@/context/AddressCacheContext';

export interface AddressLookupResult {
  city?: string;
  locality?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  postcode?: string;
  state?: string;
  country?: string;
}

export function useAddressLookup(defaultCountryCode = 'sg') {
  const addressCache = useAddressCache();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AddressLookupResult | null>(null);
  const [lastLookupTimestamp, setLastLookupTimestamp] = useState<number>(0);
  const lastLookupTimestampRef = useRef<number>(0);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);
  const abortController = useRef<AbortController | null>(null);
  
  const DEBOUNCE_MS = 800; // Increased debounce time for better UX
  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 1000;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }
    if (retryTimeout.current) {
      clearTimeout(retryTimeout.current);
      retryTimeout.current = null;
    }
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
  }, []);

  const performLookup = useCallback(async (postalcode: string, retryCount = 0): Promise<void> => {
    const cc = 'sg'; // Always use Singapore
    const cacheKey = `${cc}:${postalcode}`;
    
    try {
      // Check cache first using the context-based cache
      const cachedResult = addressCache.get(cacheKey);
      if (cachedResult) {
        console.log('[useAddressLookup] Cache hit for', cacheKey, cachedResult);
        setResult(cachedResult);
        setLoading(false);
        setError(null);
        return;
      }

      console.log('[useAddressLookup] Making API request for', { postalcode, countrycode: cc, retry: retryCount });
      
      // Cancel previous request
      if (abortController.current) {
        abortController.current.abort();
      }
      
      // Create new abort controller
      abortController.current = new AbortController();
      
      const resp = await api.get('/api/lookup/pincode', {
        params: { postalcode, countrycode: cc },
        signal: abortController.current.signal,
        timeout: 10000 // 10 second timeout
      });
      
      const addr = resp.data?.address;
      if (addr) {
        // Cache the successful result using the context-based cache
        addressCache.set(cacheKey, addr);
        
        setResult(addr);
        setError(null);
        console.log('[useAddressLookup] Address found and cached:', addr);
      } else {
        throw new Error('No address found in response');
      }
    } catch (err: any) {
      console.log('[useAddressLookup] API error:', err);
      
      // Handle abort - don't treat as error
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        console.log('[useAddressLookup] Request was cancelled');
        return;
      }
      
      // Handle network/timeout errors with retry
      const isRetryableError = 
        err.code === 'ECONNABORTED' || 
        err.code === 'NETWORK_ERROR' || 
        err.message?.includes('timeout') ||
        err.message?.includes('Network') ||
        (err.response?.status >= 500 && err.response?.status <= 599);
      
      if (isRetryableError && retryCount < MAX_RETRIES) {
        console.log(`[useAddressLookup] Retrying request in ${RETRY_DELAY_MS}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        
        retryTimeout.current = setTimeout(() => {
          performLookup(postalcode, retryCount + 1);
        }, RETRY_DELAY_MS * (retryCount + 1)); // Exponential backoff
        
        return;
      }
      
      // Set appropriate error message based on error type
      let errorMessage = 'Address lookup failed';
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Request timeout - please check your connection';
      } else if (err.code === 'NETWORK_ERROR' || err.message?.includes('Network')) {
        errorMessage = 'Network error - please check your connection';
      } else if (err.response?.status === 404) {
        errorMessage = 'Address not found for this postal code';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many requests - please wait a moment';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Service temporarily unavailable - trying again...';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication required for address lookup';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied for address lookup service';
      }
      
      setError(errorMessage);
      setResult(null);
      console.log('[useAddressLookup] Final error after retries:', errorMessage);
    } finally {
      setLoading(false);
      abortController.current = null;
    }
  }, [addressCache]);

  const lookup = useCallback((postalcode: string) => {
    console.log('[useAddressLookup] lookup called with:', { postalcode });
    
    // Reset state
    setError(null);
    setResult(null);
    
    // Clear existing timeouts
    cleanup();
    
    // Validate postal code
    if (!postalcode) {
      console.log('[useAddressLookup] Empty postal code provided');
      return;
    }
    
    // Improved postal code validation - Singapore postal codes are 4-8 digits only
    if (!/^\d{4,8}$/.test(postalcode)) {
      setError('Postal code must be 4-8 digits only');
      console.log('[useAddressLookup] Invalid postal code format:', postalcode);
      return;
    }
    
    // Debounced lookup with user feedback and timestamp tracking
    console.log(`[useAddressLookup] Lookup scheduled for ${DEBOUNCE_MS}ms delay`);
    setLoading(true); // Show loading immediately for better UX
    
    const lookupTimestamp = Date.now();
    setLastLookupTimestamp(lookupTimestamp);
    lastLookupTimestampRef.current = lookupTimestamp;
    
    debounceTimeout.current = setTimeout(async () => {
      // Check if this is still the latest lookup request
      // Only proceed if this is the exact latest request (prevents race conditions)
      if (lookupTimestamp === lastLookupTimestampRef.current) {
        console.log('[useAddressLookup] Proceeding with lookup for timestamp:', lookupTimestamp);
        await performLookup(postalcode.trim());
      } else {
        console.log('[useAddressLookup] Lookup cancelled - newer request exists. Current:', lookupTimestamp, 'Latest:', lastLookupTimestampRef.current);
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    
  }, [performLookup, cleanup]);

  // Method to clear cache for a specific postal code
  const clearCache = useCallback((postalcode: string) => {
    const cc = 'sg'; // Always use Singapore
    const cacheKey = `${cc}:${postalcode}`;
    addressCache.delete(cacheKey);
    console.log('[useAddressLookup] Cache cleared for', cacheKey);
  }, [addressCache]);

  // Method to force refresh (bypass cache)
  const forceRefresh = useCallback(async (postalcode: string) => {
    console.log('[useAddressLookup] Force refresh requested for:', postalcode);
    
    // Reset state
    setError(null);
    setResult(null);
    
    // Validate postal code
    if (!postalcode) {
      console.log('[useAddressLookup] Empty postal code provided for force refresh');
      return;
    }
    
    // Improved postal code validation - Singapore postal codes are 4-8 digits only
    if (!/^\d{4,8}$/.test(postalcode)) {
      setError('Postal code must be 4-8 digits only');
      console.log('[useAddressLookup] Invalid postal code format for force refresh:', postalcode);
      return;
    }
    
    // Clear cache for this postal code
    clearCache(postalcode);
    
    // Perform lookup without checking cache
    setLoading(true);
    await performLookup(postalcode.trim());
  }, [performLookup, clearCache]);

  // Cleanup on unmount
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { loading, error, result, lookup, forceRefresh, clearCache, lastLookupTimestamp };
}