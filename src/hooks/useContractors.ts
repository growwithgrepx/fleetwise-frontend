import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createCrudHooks } from "./useCrud";
import { 
  getContractors, 
  getContractor, 
  createContractor, 
  createContractorWithPricing,
  updateContractor, 
  deleteContractor,
  getContractorPricing,
  updateContractorPricing,
  bulkUpdateContractorPricing
} from "@/services/api/contractorsApi";
import type { Contractor } from "@/lib/types";
import { downloadContractorBillPDF } from "@/services/api/contractorsApi";

export const {
  useGetAllEntities: useGetAllContractors,
  useGetEntityById: useGetContractorById,
  useCreateEntity: useCreateContractor,
  useUpdateEntity: useUpdateContractor,
  useDeleteEntity: useDeleteContractor,
} = createCrudHooks<Contractor>({
  queryKey: ["contractors"],
  getAll: getContractors,
  getById: getContractor,
  create: createContractor,
  update: updateContractor,
  delete: deleteContractor,
});

// Hook for creating contractor with pricing
export const useCreateContractorWithPricing = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createContractorWithPricing,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contractors"] }),
  });
};

// Additional hooks for contractor pricing
export const useGetContractorPricing = (contractorId: number) => {
  return { queryKey: ["contractor-pricing", contractorId], queryFn: () => getContractorPricing(contractorId) };
};

export const useUpdateContractorPricing = () => {
  return { mutationFn: ({ contractorId, serviceId, cost }: { contractorId: number, serviceId: number, cost: number }) => 
    updateContractorPricing(contractorId, serviceId, cost) 
  };
};

export const useBulkUpdateContractorPricing = () => {
  return { mutationFn: ({ contractorId, pricingData }: { contractorId: number, pricingData: { service_id: number; cost: number }[] }) => 
    bulkUpdateContractorPricing(contractorId, pricingData) 
  };
};


export const useDownloadContractorBill = () => {
  return {
    downloadPDF: (billId: number) => downloadContractorBillPDF(billId)
  };
};
