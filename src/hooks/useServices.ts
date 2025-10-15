import { createCrudHooks } from './useCrud';
import { getServices, getServiceById, createService, updateService, deleteService } from '@/services/api';
import type { Service } from '@/lib/types';

const serviceApi = {
  queryKey: ['services'],
  getAll: getServices,
  getById: (id: string | number) => getServiceById(Number(id)),
  create: createService,
  update: (id: string | number, data: Partial<Service>) => updateService(Number(id), data),
  delete: (id: string | number) => deleteService(Number(id)),
};

export const {
  useGetAllEntities: useGetAllServices,
  useGetEntityById: useGetServiceById,
  useCreateEntity: useCreateService,
  useUpdateEntity: useUpdateService,
  useDeleteEntity: useDeleteService,
} = createCrudHooks<Service>(serviceApi);