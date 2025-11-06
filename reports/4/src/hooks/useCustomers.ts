import { createCrudHooks } from "./useCrud";
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from "@/services/api/customersApi";
import type { Customer } from "@/types/customer";

export const {
  useGetAllEntities: useGetAllCustomers,
  useGetEntityById: useGetCustomerById,
  useCreateEntity: useCreateCustomer,
  useUpdateEntity: useUpdateCustomer,
  useDeleteEntity: useDeleteCustomer,
} = createCrudHooks<Customer>({
  queryKey: ["customers"],
  getAll: getCustomers,
  getById: getCustomerById,
  create: createCustomer,
  update: updateCustomer,
  delete: deleteCustomer,
});
