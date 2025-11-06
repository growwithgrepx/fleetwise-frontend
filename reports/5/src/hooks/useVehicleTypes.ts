import { createCrudHooks } from './useCrud';
import { getVehicleTypes, getVehicleTypeById, createVehicleType, updateVehicleType, deleteVehicleType } from '@/services/api';
import type { VehicleType } from '@/lib/types';

const vehicleTypeApi = {
  queryKey: ['vehicleTypes'],
  getAll: getVehicleTypes,
  getById: (id: string | number) => getVehicleTypeById(Number(id)),
  create: createVehicleType,
  update: (id: string | number, data: Partial<VehicleType>) => updateVehicleType(Number(id), data),
  delete: (id: string | number) => deleteVehicleType(Number(id)),
};

export const {
  useGetAllEntities: useGetAllVehicleTypes,
  useGetEntityById: useGetVehicleTypeById,
  useCreateEntity: useCreateVehicleType,
  useUpdateEntity: useUpdateVehicleType,
  useDeleteEntity: useDeleteVehicleType,
} = createCrudHooks<VehicleType>(vehicleTypeApi);