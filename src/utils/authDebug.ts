/**
 * Authentication debugging utilities
 * Helps diagnose session and authentication issues
 */

export async function checkAuthStatus() {
  try {
    console.log('[Auth Debug] Checking authentication status...');
    
    const response = await fetch('/api/auth/me', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[Auth Debug] Auth response status:', response.status);
    console.log('[Auth Debug] Auth response headers:', [...response.headers.entries()]);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[Auth Debug] Auth response data:', data);
      return { authenticated: true, user: data.response?.user || data.user || data };
    } else {
      console.log('[Auth Debug] Not authenticated, status:', response.status);
      return { authenticated: false, status: response.status };
    }
  } catch (error) {
    console.error('[Auth Debug] Error checking auth:', error);
    return { authenticated: false, error };
  }
}

export async function testJobCreation() {
  try {
    console.log('[Auth Debug] Testing job creation...');
    
    // First check auth status
    const authStatus = await checkAuthStatus();
    if (!authStatus.authenticated) {
      console.log('[Auth Debug] Cannot test job creation - not authenticated');
      return { success: false, error: 'Not authenticated' };
    }
    
    // Test job creation with minimal data
    const testData = {
      customer_id: 1,
      service_type: 'Test Service',
      pickup_location: 'Test Location',
      dropoff_location: 'Test Destination',
      pickup_date: '2026-03-01',
      pickup_time: '10:00',
      status: 'new'
    };
    
    console.log('[Auth Debug] Sending test job data:', testData);
    
    const response = await fetch('/api/jobs', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    console.log('[Auth Debug] Job creation response status:', response.status);
    console.log('[Auth Debug] Job creation response headers:', [...response.headers.entries()]);
    
    const responseData = await response.json();
    console.log('[Auth Debug] Job creation response data:', responseData);
    
    return {
      success: response.ok,
      status: response.status,
      data: responseData
    };
    
  } catch (error) {
    console.error('[Auth Debug] Error testing job creation:', error);
    return { success: false, error };
  }
}

export function logSessionInfo() {
  console.log('[Auth Debug] === Session Information ===');
  console.log('[Auth Debug] Current URL:', window.location.href);
  console.log('[Auth Debug] Cookies:', document.cookie);
  console.log('[Auth Debug] Local Storage:', { ...localStorage });
  console.log('[Auth Debug] Session Storage:', { ...sessionStorage });
  console.log('[Auth Debug] =========================');
}