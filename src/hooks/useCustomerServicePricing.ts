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
      if (!customerId || !serviceName) {
        return Promise.resolve(null);
      }
      return getCustomerServicePricing(customerId, serviceName, vehicleType);
    },
    enabled: !!customerId && !!serviceName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if pricing doesn't exist
  });
}