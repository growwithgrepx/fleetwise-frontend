import { createCrudHooks } from './useCrud';
import { servicesVehicleTypePriceApi } from '@/services/api/servicesVehicleTypePriceApi';
import type { ServicesVehicleTypePrice, ServicesVehicleTypePriceFormData } from '@/types/servicesVehicleTypePrice';
import { useQuery } from '@tanstack/react-query';

const servicesVehicleTypePriceApiWrapper = {
  queryKey: ['servicesVehicleTypePrice'],
  getAll: servicesVehicleTypePriceApi.getAll,
  getById: servicesVehicleTypePriceApi.getById,
  create: servicesVehicleTypePriceApi.create,
  update: (id: string | number, data: ServicesVehicleTypePriceFormData) => servicesVehicleTypePriceApi.update(Number(id), data),
  delete: (id: string | number) => servicesVehicleTypePriceApi.delete(Number(id)),
};

export const {
  useGetAllEntities: useGetAllServicesVehicleTypePrice,
  useGetEntityById: useGetServicesVehicleTypePriceById,
  useCreateEntity: useCreateServicesVehicleTypePrice,
  useUpdateEntity: useUpdateServicesVehicleTypePrice,
  useDeleteEntity: useDeleteServicesVehicleTypePrice,
} = createCrudHooks<ServicesVehicleTypePrice>(servicesVehicleTypePriceApiWrapper);

// Custom hook to fetch services vehicle type prices by service ID
export const useGetServicesVehicleTypePricesByServiceId = (serviceId: string) => {
  return useQuery<ServicesVehicleTypePrice[]>({
    queryKey: ['servicesVehicleTypePrice', 'service', serviceId],
    queryFn: () => servicesVehicleTypePriceApi.getByServiceId(serviceId),
    enabled: !!serviceId,
  });
};