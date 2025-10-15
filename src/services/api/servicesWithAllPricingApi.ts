import { api } from '@/lib/api';
import { Service } from '@/lib/types';

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

export const createServiceWithAllPricing = async (data: ServiceWithAllPricingFormData): Promise<Service> => {
  try {
    const response = await api.post('/api/services/create-with-all-pricing', data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating service with all pricing:', error);
    // Handle different types of errors
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Could not create service with pricing. Please try again later.');
    }
  }
};

export const updateServiceWithAllPricing = async (serviceId: number, data: ServiceWithAllPricingFormData): Promise<Service> => {
  try {
    const response = await api.put(`/api/services/${serviceId}/update-with-all-pricing`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating service with all pricing:', error);
    // Handle different types of errors
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Could not update service with pricing. Please try again later.');
    }
  }
};