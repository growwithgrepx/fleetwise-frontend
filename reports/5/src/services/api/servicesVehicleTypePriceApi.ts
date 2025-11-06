import { api } from '@/lib/api';
import { ServicesVehicleTypePrice, ServicesVehicleTypePriceFormData } from '@/types/servicesVehicleTypePrice';

export const servicesVehicleTypePriceApi = {
  getAll: async (): Promise<ServicesVehicleTypePrice[]> => {
    try {
      const response = await api.get('/api/services-vehicle-type-prices');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching services vehicle type prices:', error);
      throw error;
    }
  },

  getById: async (id: number): Promise<ServicesVehicleTypePrice> => {
    try {
      const response = await api.get(`/api/services-vehicle-type-prices/${id}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching service vehicle type price with id ${id}:`, error);
      throw error;
    }
  },

  getByServiceId: async (serviceId: string): Promise<ServicesVehicleTypePrice[]> => {
    try {
      const response = await api.get(`/api/services-vehicle-type-prices?service_id=${serviceId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching service vehicle type prices for service id ${serviceId}:`, error);
      throw error;
    }
  },

  create: async (data: ServicesVehicleTypePriceFormData): Promise<ServicesVehicleTypePrice> => {
    try {
      const response = await api.post('/api/services-vehicle-type-prices', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating service vehicle type price:', error);
      // Handle different types of errors
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Could not create service vehicle type price. Please try again later.');
      }
    }
  },

  update: async (id: number, data: ServicesVehicleTypePriceFormData): Promise<ServicesVehicleTypePrice> => {
    try {
      const response = await api.put(`/api/services-vehicle-type-prices/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error(`Error updating service vehicle type price with id ${id}:`, error);
      // Handle different types of errors
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Could not update service vehicle type price. Please try again later.');
      }
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await api.delete(`/api/services-vehicle-type-prices/${id}`);
    } catch (error: any) {
      console.error(`Error deleting service vehicle type price with id ${id}:`, error);
      // Handle different types of errors
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Could not delete service vehicle type price. Please try again later.');
      }
    }
  }
};