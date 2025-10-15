import { createCrudHooks } from "./useCrud";
import { getDrivers, getDriver, createDriver, updateDriver, deleteDriver } from "@/services/api/driversApi";
import type { Driver } from "@/lib/types";

export const {
  useGetAllEntities: useGetAllDrivers,
  useGetEntityById: useGetDriverById,
  useCreateEntity: useCreateDriver,
  useUpdateEntity: useUpdateDriver,
  useDeleteEntity: useDeleteDriver,
} = createCrudHooks<Driver>({
  queryKey: ["drivers"],
  getAll: getDrivers,
  getById: getDriver,
  create: createDriver,
  update: updateDriver,
  delete: deleteDriver,
});