import { createCrudHooks } from "./useCrud";
import { getDrivers, getDriver, createDriver, updateDriver, deleteDriver } from "@/services/api/driversApi";
import type { Driver } from "@/lib/types";
import { downloadDriverBillPDF } from "@/services/api/driversApi";

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

export const useDownloadDriverBill = () => {
  return {
    downloadPDF: (billId: number) => downloadDriverBillPDF(billId)
  };
};
