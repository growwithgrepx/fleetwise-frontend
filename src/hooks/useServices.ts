import { createCrudHooks } from './useCrud';
import { getServices, getServiceById, createService, updateService, deleteService } from '@/services/api';
import type { Service } from '@/lib/types';
import type { ServiceResponse } from '@/lib/apiTypes';

const serviceApi = {
  queryKey: ['services'],
  getAll: getServices,
  getById: (id: string | number) => getServiceById(Number(id)),
  create: async (data: Omit<Service, 'id'>) => {
    const response = await createService(data);
    return response.service;
  },
  update: (id: string | number, data: Partial<Service>) => updateService(Number(id), data),
  delete: (id: string | number) => deleteService(Number(id)),
};

// Extended hooks for service-specific needs
export const {
  useGetAllEntities: useGetAllServices,
  useGetEntityById: useGetServiceById,
  useCreateEntity: useCreateServiceBase,
  useUpdateEntity: useUpdateService,
  useDeleteEntity: useDeleteService,
} = createCrudHooks<Service>(serviceApi);

// Custom hook that returns both the service and message
export const useCreateService = () => {
  const mutation = useCreateServiceBase();
  
  return {
    ...mutation,
    mutateAsync: async (data: Omit<Service, 'id'>): Promise<ServiceResponse> => {
      const response = await createService(data);
      mutation.mutate(response.service as any); // Update the cache
      return response;
    }
  };
};