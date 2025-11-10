import { useQuery } from '@tanstack/react-query';
import { getCustomerServicePricing } from '@/services/api/customerServicePricingApi';

export function useCustomerServicePricing(
  customerId: number | undefined,
  serviceName: string | undefined,
  vehicleType: string | undefined
) {
  return useQuery({
    queryKey: ['customerServicePricing', customerId, serviceName, vehicleType],
    queryFn: () => {
      // Require all three fields: customer, service, and vehicle type
      if (!customerId || !serviceName || !vehicleType) {
        return Promise.resolve(null);
      }
      return getCustomerServicePricing(customerId, serviceName, vehicleType);
    },
    // Only enable when all three fields are present
    // This ensures we only make ONE API call when customer, service, AND vehicle type are all selected
    enabled: !!customerId && !!serviceName && !!vehicleType,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if pricing doesn't exist
  });
}