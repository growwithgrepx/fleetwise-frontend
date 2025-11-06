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
      // Require at minimum customer and service
      if (!customerId || !serviceName) {
        return Promise.resolve(null);
      }
      // vehicleType is optional - backend will try vehicle-specific first, then fall back
      return getCustomerServicePricing(customerId, serviceName, vehicleType);
    },
    // Enable as long as customer and service are present
    // vehicleType can be undefined and backend will handle fallback
    enabled: !!customerId && !!serviceName,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry if pricing doesn't exist
  });
}