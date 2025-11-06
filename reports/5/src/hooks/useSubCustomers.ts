import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSubCustomers, createSubCustomer } from '@/services/api/customersApi';
import type { SubCustomer, SubCustomerFormData } from '@/types/customer';

export function useSubCustomers(customerId: number) {
  const queryClient = useQueryClient();

  const { data: subCustomers = [], isLoading, isError } = useQuery<SubCustomer[]>({
    queryKey: ['subCustomers', customerId],
    queryFn: () => getSubCustomers(customerId),
    enabled: !!customerId, // Only run the query if a customerId is provided
  });

  const { mutate: addSubCustomer } = useMutation({
    mutationFn: (newSubCustomer: SubCustomerFormData) => createSubCustomer(newSubCustomer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subCustomers', customerId] });
    },
  });

  return { subCustomers, isLoading, isError, addSubCustomer };
}
