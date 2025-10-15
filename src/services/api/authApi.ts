import { api } from '@/lib/api';

// PASSWORD RESET
export async function requestPasswordReset(email: string): Promise<{ message: string } | { error: string }> {
  try {
    const response = await api.post('/api/auth/reset-password-request', { email });
    return response.data;
  } catch (error: any) {
    // Log only safe error metadata, never request data
    console.error('Password reset request failed', { 
      status: error.response?.status,
      message: 'Request failed' 
    });
    if (error.response?.data?.error) {
      return { error: error.response.data.error };
    }
    return { error: 'Failed to send password reset request. Please try again later.' };
  }
}

export async function resetPasswordWithToken(token: string, newPassword: string, confirmPassword: string): Promise<{ message: string } | { error: string }> {
  try {
    const response = await api.post(`/api/auth/reset-password/${token}`, {
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    return response.data;
  } catch (error: any) {
    // Log only safe error metadata, never request data
    console.error('Password reset with token failed', { 
      status: error.response?.status,
      message: 'Request failed' 
    });
    if (error.response?.data?.error) {
      return { error: error.response.data.error };
    }
    return { error: 'Failed to reset password. Please try again later.' };
  }
}

// CHANGE PASSWORD
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string } | { error: string }> {
  try {
    const response = await api.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  } catch (error: any) {
    // Log only safe error metadata, never request data
    console.error('Change password request failed', { 
      status: error.response?.status,
      message: 'Request failed' 
    });
    if (error.response?.data?.error) {
      return { error: error.response.data.error };
    }
    return { error: 'Failed to change password. Please try again later.' };
  }
}