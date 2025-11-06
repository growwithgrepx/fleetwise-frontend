import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createServiceWithAllPricing, updateServiceWithAllPricing } from '@/services/api';
import type { ServiceWithAllPricingFormData } from '@/services/api/servicesWithAllPricingApi';

export const useCreateServiceWithAllPricing = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ServiceWithAllPricingFormData) => createServiceWithAllPricing(data),
    onSuccess: () => {
      // Invalidate and refetch services and services-vehicle-type-prices
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['servicesVehicleTypePrice'] });
    },
  });
};

export const useUpdateServiceWithAllPricing = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: number; data: ServiceWithAllPricingFormData }) => 
      updateServiceWithAllPricing(serviceId, data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch services and services-vehicle-type-prices
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['servicesVehicleTypePrice'] });
      // Also invalidate the specific service query
      queryClient.invalidateQueries({ queryKey: ['services', variables.serviceId] });
      // Also invalidate the specific service-vehicle-type-prices query
      queryClient.invalidateQueries({ queryKey: ['servicesVehicleTypePrice', 'service', variables.serviceId.toString()] });
    },
  });
};