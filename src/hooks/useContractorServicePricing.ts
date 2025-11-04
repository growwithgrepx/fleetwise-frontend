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
      console.log('Fetched contractor pricing data:', pricing); // Debug log
      console.log('Fetched contractor pricing data length:', pricing.length); // Debug log
      console.log('First few pricing records:', pricing.slice(0, 5)); // Debug log
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
  
  console.log('=== DEBUGGING DATA STRUCTURES ===');
  console.log('vehicleTypes:', vehicleTypes);
  console.log('services:', services);
  console.log('pricingData:', pricingData);
  console.log('vehicleTypes type:', typeof vehicleTypes, 'length:', vehicleTypes.length);
  console.log('services type:', typeof services, 'length:', services.length);
  console.log('pricingData type:', typeof pricingData, 'length:', pricingData.length);
  
  // Log first item of each with full details
  if (vehicleTypes.length > 0) {
    console.log('First vehicleType:', vehicleTypes[0]);
    console.log('First vehicleType keys:', Object.keys(vehicleTypes[0]));
  }
  if (services.length > 0) {
    console.log('First service:', services[0]);
    console.log('First service keys:', Object.keys(services[0]));
  }
  if (pricingData.length > 0) {
    console.log('First pricingData:', pricingData[0]);
    console.log('First pricingData keys:', Object.keys(pricingData[0]));
  }
  
  console.log('useContractorPricingMatrix input data:', { 
    contractorId,
    vehicleTypesCount: vehicleTypes.length, 
    servicesCount: services.length, 
    pricingDataCount: pricingData.length,
    isLoading: isLoadingVehicleTypes || isLoadingServices || isLoadingPricing
  }); // Debug log
  
  // Log first few items of each data set
  console.log('First few vehicleTypes:', vehicleTypes.slice(0, 3)); // Debug log
  console.log('First few services:', services.slice(0, 3)); // Debug log
  console.log('First few pricingData:', pricingData.slice(0, 3)); // Debug log
  
  // Transform the flat pricing data into a matrix structure
  const pricingMatrix = services.map(service => {
    console.log('Processing service:', service); // Debug log
    const servicePricing = vehicleTypes.map(vehicleType => {
      console.log('Processing vehicleType:', vehicleType); // Debug log
      
      // Find pricing with more explicit matching
      let pricing = null;
      for (const p of pricingData) {
        console.log(`Comparing pricing item:`, p, `with service:`, service, `and vehicleType:`, vehicleType); // Debug log
        const serviceIdMatch = parseInt(String(p.service_id)) === parseInt(String(service.id));
        const vehicleTypeIdMatch = parseInt(String(p.vehicle_type_id)) === parseInt(String(vehicleType.id));
        console.log(`Service ID match: ${serviceIdMatch} (${p.service_id} == ${service.id})`); // Debug log
        console.log(`Vehicle Type ID match: ${vehicleTypeIdMatch} (${p.vehicle_type_id} == ${vehicleType.id})`); // Debug log
        
        if (serviceIdMatch && vehicleTypeIdMatch) {
          pricing = p;
          console.log('Found matching pricing:', pricing); // Debug log
          break;
        }
      }
      
      const result = {
        vehicle_type_id: vehicleType.id,
        service_id: service.id,
        cost: pricing ? parseFloat(String(pricing.cost)) : 0,
        id: pricing?.id
      };
      console.log('Generated pricing entry:', result); // Debug log
      return result;
    });
    
    const matrixRow = {
      service_id: service.id,
      service_name: service.name,
      pricing: servicePricing
    };
    console.log('Generated matrix row:', matrixRow); // Debug log
    return matrixRow;
  });
  
  console.log('Generated complete pricingMatrix:', pricingMatrix); // Debug log
  
  return {
    vehicleTypes,
    services,
    pricingMatrix,
    isLoading: isLoadingVehicleTypes || isLoadingServices || isLoadingPricing,
    refetch
  };
}