import { api } from '@/lib/api';
import { Service } from '@/lib/types';
import { ServiceResponse } from '@/lib/apiTypes';

export interface ServiceWithAllPricingFormData {
  name: string;
  description?: string;
  status?: string;
  base_price: number;
  additional_ps?: number | string;
  distance_levy?: number | string;
  midnight_surcharge?: number | string;
  ds_hourly_charter?: number | string;
  ds_midnight_surcharge?: number | string;
  pricing: Record<string, number>; // vehicle_type_id -> price
}

export const createServiceWithAllPricing = async (data: ServiceWithAllPricingFormData): Promise<ServiceResponse> => {
  try {
    const response = await api.post('/api/services/create-with-all-pricing', data);
    // Check if response has the new format with data and message
    if (response.data && typeof response.data === 'object') {
      if ('data' in response.data && 'message' in response.data) {
        return {
          service: response.data.data,
          message: response.data.message
        };
      }
      // Backward compatibility: response.data is the service directly
      return {
        service: response.data,
        message: response.data.message
      };
    }
    throw new Error('Invalid response format from server');
  } catch (error: any) {
    console.error('Error creating service with all pricing:', error);
    // The axios interceptor already extracts the error message
    // Just re-throw it if it has a message, otherwise use fallback
    if (error.message) {
      throw error;
    }
    throw new Error('Could not create service with pricing. Please try again later.');
  }
};

export const updateServiceWithAllPricing = async (serviceId: number, data: ServiceWithAllPricingFormData): Promise<Service> => {
  try {
    const response = await api.put(`/api/services/${serviceId}/update-with-all-pricing`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating service with all pricing:', error);
    // The axios interceptor already extracts the error message
    // Just re-throw it if it has a message, otherwise use fallback
    if (error.message) {
      throw error;
    }
    throw new Error('Could not update service with pricing. Please try again later.');
  }
};