import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getContractorPricing, getContractorPricingByVehicleType, updateContractorPricingByVehicleType } from '@/services/api/contractorsApi';
import type { ContractorVehicleTypePricing } from '@/services/api/contractorsApi';
import { useGetAllVehicleTypes } from './useVehicleTypes';
import { useGetAllServices } from './useServices';

export function useContractorServicePricing(contractorId?: number) {
  return useQuery({
    queryKey: ['contractor_pricing', contractorId],
    queryFn: async () => {
      if (!contractorId) return [];
      const pricing = await getContractorPricing(contractorId);
      return pricing;
    },
    enabled: Boolean(contractorId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useContractorVehicleTypePricing(contractorId?: number) {
  return useQuery({
    queryKey: ['contractor_vehicle_type_pricing', contractorId],
    queryFn: async () => {
      if (!contractorId) return [];
      const pricing = await getContractorPricingByVehicleType(contractorId);
      return pricing;
    },
    enabled: Boolean(contractorId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateContractorVehicleTypePricing(contractorId: number) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ serviceId, vehicleTypeId, cost }: { serviceId: number; vehicleTypeId: number; cost: number }) => 
      updateContractorPricingByVehicleType(contractorId, serviceId, vehicleTypeId, cost),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor_vehicle_type_pricing', contractorId] });
    },
  });
}

export function useContractorPricingMatrix(contractorId?: number) {
  const { data: vehicleTypes = [], isLoading: isLoadingVehicleTypes } = useGetAllVehicleTypes();
  const { data: services = [], isLoading: isLoadingServices } = useGetAllServices();
  const { data: pricingData = [], isLoading: isLoadingPricing, refetch } = useContractorVehicleTypePricing(contractorId);
  
  // Removed debug logging for production performance and security
  
  // Transform the flat pricing data into a matrix structure
  const pricingMatrix = services.map(service => {
    const servicePricing = vehicleTypes.map(vehicleType => {
      // Find pricing with more explicit matching
      let pricing = null;
      for (const p of pricingData) {
        const serviceIdMatch = parseInt(String(p.service_id)) === parseInt(String(service.id));
        const vehicleTypeIdMatch = parseInt(String(p.vehicle_type_id)) === parseInt(String(vehicleType.id));
        
        if (serviceIdMatch && vehicleTypeIdMatch) {
          pricing = p;
          break;
        }
      }
      
      return {
        vehicle_type_id: vehicleType.id,
        service_id: service.id,
        cost: pricing ? parseFloat(String(pricing.cost)) : 0,
        id: pricing?.id
      };
    });
    
    return {
      service_id: service.id,
      service_name: service.name,
      pricing: servicePricing
    };
  });
  
  return {
    vehicleTypes,
    services,
    pricingMatrix,
    isLoading: isLoadingVehicleTypes || isLoadingServices || isLoadingPricing,
    refetch
  };
}