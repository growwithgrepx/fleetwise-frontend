"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as billsApi from "@/services/api/billingApi";
import { Job } from "@/types/job";
import toast from "react-hot-toast";
import { BillingState } from "@/types/types";

const DEBOUNCE_DELAY = 500; // ms

export const billKeys = {
  all: ["jobs"] as const,
  lists: (filters: BillingState) =>
    [...billKeys.all, "list", { ...filters }] as const,
  details: (id: number) => [...billKeys.all, "detail", id] as const,
};

export type UseJobsReturn = {
  // Queries
  unbilledJobs: Job[] | undefined;
  paidOrUnpaidJobs: any[] | undefined;
  isLoading: boolean;
  error: Error | null;
  generateInvoice: (data: { job_ids: number[]; customer_id: number | null }) => void;
  // Filter Actions
  updateBillingState: (filters: BillingState) => void;
  updateInvoiceAsync: (data: { id: number; status: string }) => void;
  clearFilters: () => void;
  removeJob: (id: number | null) => void;
  unPaidInvoiceDownload: (id: number | null) => void;
  paidInvoiceDownload: (id: number | null) => void;
  deleteUnpaidInvoice: (id: number | null) => void;
  billingState: BillingState;
};

export function useBills(): UseJobsReturn {
  const queryClient = useQueryClient();

  const [billingState, setBillingState] = useState<BillingState>({
    currentTab: "unbilled",
    pagination: { page: 1, pageSize: 10 },
    customer_id: null,
    filters: {},
    selectedJobs: [],
    refreshKey: null,
  });

  const [debouncedFilters, setDebouncedFilters] =
    useState<BillingState>(billingState);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const billingKeys = {
    paidOrUnpaid: (
      status?: string,
      customerId?: number | null,
      refreshKey?: number | null
    ) => ["paidOrUnpaidJobs", status, customerId, refreshKey] as const,
    unbilled: (
      status?: string,
      customerId?: number | null,
      refreshKey?: number | null
    ) => ["unbilled", status, customerId, refreshKey] as const,
  };

  const updateBillingState = useCallback(
    (newFilters: Partial<BillingState>) => {
      const withRefreshKey = {
        ...newFilters,
        refreshKey: Date.now(), // or any random number
      };
      setBillingState((prev) => ({ ...prev, ...withRefreshKey }));

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        setDebouncedFilters((prev) => ({ ...prev, ...withRefreshKey }));
      }, DEBOUNCE_DELAY);
    },
    [setBillingState, setDebouncedFilters]
  );

  const clearFilters = useCallback(() => {
    const clearState: BillingState = {
      currentTab: "unbilled",
      customer_id: null,
      pagination: { page: 1, pageSize: 10 },
      filters: {},
      selectedJobs: [],
    };
    setBillingState(clearState);
    setDebouncedFilters(clearState);

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, [setBillingState, setDebouncedFilters]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const getPaidOrUnpaidJobsQuery = useQuery({
    queryKey: billingKeys.paidOrUnpaid(
      billingState.currentTab,
      billingState.customer_id,
      billingState.refreshKey
    ),
    queryFn: () =>
      billsApi.getPaidOrUnpaidJobs({
        // status: billingState.currentTab,
        customer_id: billingState.customer_id,
      }),
    staleTime: 1000 * 60,
    enabled:
      billingState.currentTab == "Unpaid" || billingState.currentTab == "Paid",
  });
  console.log("getPaidOrUnpaidJobsQuery", getPaidOrUnpaidJobsQuery.data); 



  const getUnBilledJobsQuery = useQuery({
    queryKey: billingKeys.unbilled(
      billingState.currentTab,
      billingState.customer_id,
      billingState.refreshKey
    ),
    queryFn: () =>
      billsApi.getUnBilledJobs({
        status: billingState.currentTab,
        customer_id: billingState.customer_id,
      }),
    staleTime: 1000 * 60,
    enabled: billingState.currentTab == "unbilled",
  });

  // Mutations
  const generateInvoiceMutation = useMutation({
    mutationFn: (data: { job_ids: number[]; customer_id: number |null }) =>
      billsApi.generateInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.all });
      queryClient.refetchQueries({
        queryKey: billingKeys.unbilled(
          billingState.currentTab,
          billingState.customer_id,
          billingState.refreshKey
        ),
      });
      queryClient.refetchQueries({
        queryKey: billingKeys.paidOrUnpaid(
          billingState.currentTab,
          billingState.customer_id,
          billingState.refreshKey
        ),
      });
      toast.success("Invoice download successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create job: ${error.message}`);
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: (data: { id: number; status: string }) =>
      billsApi.updateInvoiceStatus(data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: billKeys.all });
      // queryClient.invalidateQueries({
      //   queryKey: billKeys.lists(debouncedFilters),
      // });
      toast.success("Invoice updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update job: ${error.message}`);
    },
  });

  const RemoveJobMutation = useMutation({
    mutationFn: (id: number | null) => billsApi.removeJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.all });
      toast.success("Job Removed successfully");
      queryClient.refetchQueries({
        queryKey: billingKeys.paidOrUnpaid(
          billingState.currentTab,
          billingState.customer_id,
          billingState.refreshKey
        ),
      });
    },

    onError: (error: Error) => {
      toast.error(`Failed to remove job: ${error.message}`);
    },
  });
  const DeleteUnpaidInvoiceMutation = useMutation({
    mutationFn: (id: number | null) => billsApi.deleteUnpaidInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billKeys.all });
      toast.success("Invoice Delete successfully");
      queryClient.refetchQueries({
        queryKey: billingKeys.paidOrUnpaid(
          billingState.currentTab,
          billingState.customer_id,
          billingState.refreshKey
        ),
      });
    },

    onError: (error: Error) => {
      toast.error(`Failed to remove job: ${error.message}`);
    },
  });

  const getUnPaidInvoiceDownloadQuery = useMutation({
    mutationFn: (id: number | null) => billsApi.getUnpaidInvoice(id),
    onSuccess: (data: Blob) => {
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setTimeout(() => URL.revokeObjectURL(url), 1000 * 60);
      toast.success("Invoice downloaded successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to download invoice: ${error.message}`);
    },
  });
  const getPaidInvoiceDownloadQuery = useMutation({
    mutationFn: (id: number | null) => billsApi.getPaidInvoice(id),
    onSuccess: (data: Blob) => {
      const blob = new Blob([data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");

      setTimeout(() => URL.revokeObjectURL(url), 1000 * 60);
      toast.success("Invoice Download successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to download invoices: ${error.message}`);
    },
  });
  //console.log('getPaidOrUnpaidJobsQuery1',getPaidOrUnpaidJobsQuery.data)
  return {
    unbilledJobs: getUnBilledJobsQuery.data?.items ?? [],
    paidOrUnpaidJobs: getPaidOrUnpaidJobsQuery.data?.items ?? [],
    isLoading: getUnBilledJobsQuery.isLoading,
    error: getUnBilledJobsQuery.error,
    updateInvoiceAsync: updateInvoiceMutation.mutateAsync,
    updateBillingState,
    generateInvoice: generateInvoiceMutation.mutate,
    clearFilters,
    removeJob: RemoveJobMutation.mutate,
    unPaidInvoiceDownload: getUnPaidInvoiceDownloadQuery.mutate,
    paidInvoiceDownload: getPaidInvoiceDownloadQuery.mutate,
    deleteUnpaidInvoice: DeleteUnpaidInvoiceMutation.mutate,
    billingState,
  };
}
