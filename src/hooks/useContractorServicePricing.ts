import { useQuery } from '@tanstack/react-query';
import { getContractorPricing } from '@/services/api/contractorsApi';

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
