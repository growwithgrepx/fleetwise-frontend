import { createCrudHooks } from './useCrud';
import { getVehicles, getVehicleById, createVehicle, updateVehicle, deleteVehicle } from '@/services/api';
import type { Vehicle } from '@/lib/types';

const vehicleApi = {
  queryKey: ['vehicles'],
  getAll: getVehicles,
  getById: (id: string | number) => getVehicleById(Number(id)),
  create: createVehicle,
  update: (id: string | number, data: Partial<Vehicle>) => updateVehicle(Number(id), data),
  delete: (id: string | number) => deleteVehicle(Number(id)),
};

export const {
  useGetAllEntities: useGetAllVehicles,
  useGetEntityById: useGetVehicleById,
  useCreateEntity: useCreateVehicle,
  useUpdateEntity: useUpdateVehicle,
  useDeleteEntity: useDeleteVehicle,
} = createCrudHooks<Vehicle>(vehicleApi);