import toast from 'react-hot-toast';

/**
 * Execute an operation with loading, success, and error toasts
 * @param operation - The async operation to execute
 * @param messages - Configuration for toast messages
 * @param onSuccess - Optional callback to execute after successful operation (e.g., navigation)
 * @returns The result from the operation
 */
export async function withLoadingToast<T>(
  operation: () => Promise<T>,
  messages: {
    loading: string;
    getSuccess: (result: T) => string;
  },
  onSuccess?: (result: T) => Promise<void>
): Promise<T> {
  const loadingToast = toast.loading(messages.loading);

  try {
    const result = await operation();

    // Dismiss loading toast
    toast.dismiss(loadingToast);

    // Small delay to ensure loading toast is dismissed before showing success
    await new Promise(resolve => setTimeout(resolve, 100));

    // Show success message
    const successMsg = messages.getSuccess(result);
    toast.success(successMsg, { duration: 3000 });

    // Execute onSuccess callback if provided
    if (onSuccess) {
      // Delay to allow toast to be visible before navigation
      await new Promise(resolve => setTimeout(resolve, 1500));
      await onSuccess(result);
    }

    return result;
  } catch (error) {
    // Dismiss loading toast
    toast.dismiss(loadingToast);
    throw error;
  }
}

/**
 * Extract error message from various error formats
 * Prioritizes backend structured errors over generic messages
 * @param err - The error object
 * @param fallbackMessage - Default message if no specific error found
 * @returns The extracted error message
 */
export function extractErrorMessage(err: any, fallbackMessage: string): string {
  let errorMessage = fallbackMessage;

  // Check for backend structured errors first
  if (err?.response?.data) {
    if (typeof err.response.data === "string") {
      errorMessage = err.response.data;
    } else if (err.response.data.error) {
      errorMessage = err.response.data.error;
    } else if (err.response.data.message) {
      errorMessage = err.response.data.message;
    } else {
      errorMessage = JSON.stringify(err.response.data);
    }
  } else if (err?.message) {
    // Fall back to generic error message
    errorMessage = err.message;
  }

  return errorMessage;
}
