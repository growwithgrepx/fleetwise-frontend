"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Job } from "@/types/job";
import { Contractor } from "@/lib/types";
import { JobEntityTable } from "@/components/organisms/JobBillingTable";
import { EntityTableColumn } from "@/components/organisms/JobBillingTable";
import { useGetAllContractors } from "@/hooks/useContractors";
import toast from "react-hot-toast";
import { ArrowUp, ArrowDown, Eye, Trash2, DollarSign } from "lucide-react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import JobDetailCard from "@/components/organisms/JobDetailCard";
import * as billsApi from "@/services/api/billingApi";
import { useDownloadContractorBill } from "@/hooks/useContractors";




// Column configuration for Contractor Billable Jobs table
const contractorBillableColumns: EntityTableColumn<Job & { stringLabel?: string }>[] = [
  {
    label: "Job Id",
    accessor: "id",
    filterable: true,
    stringLabel: "Job Id",
  },
  {
    label: "Contractor Name",
    accessor: "contractor_name",
    filterable: true,
    stringLabel: "Contractor",
  },
  {
    label: "Pickup",
    accessor: "pickup_location",
    filterable: true,
    stringLabel: "Pickup",
  },
  {
    label: "Drop-off",
    accessor: "dropoff_location",
    filterable: true,
    stringLabel: "Drop-off",
  },
  {
    label: "Pickup Date",
    accessor: "pickup_date",
    filterable: true,
    stringLabel: "Pickup Date",
  },
  {
    label: "Pickup Time",
    accessor: "pickup_time",
    filterable: true,
    stringLabel: "Pickup Time",
  },
  {
    label: "Actions",
    accessor: "actions",
    filterable: false,
    stringLabel: "Actions",
  },
];

// Column configuration for Generated Bills table
const generatedBillsColumns: EntityTableColumn<any>[] = [
  {
    label: "Bill ID",
    accessor: "id",
    filterable: true,
    stringLabel: "Bill ID",
  },
  {
    label: "Contractor Name",
    accessor: "entity_name",
    filterable: true,
    stringLabel: "Contractor",
  },
  {
    label: "Total Amount",
    accessor: "total_amount",
    filterable: false,
    stringLabel: "Total Amount",
  },
  {
    label: "Job Count",
    accessor: "job_count",
    filterable: false,
    stringLabel: "Job Count",
  },
  {
    label: "Date",
    accessor: "date",
    filterable: true,
    stringLabel: "Date",
  },
  {
    label: "Type",
    accessor: "type",
    filterable: true,
    stringLabel: "Type",
  },
  {
    label: "Status",
    accessor: "status",
    filterable: true,
    stringLabel: "Status",
  },
  {
    label: "Actions",
    accessor: "actions",
    filterable: false,
    stringLabel: "Actions",
  },
];

const ContractorBillingPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedContractorId, setSelectedContractorId] = useState<number | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("pickup_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tableFilters, setTableFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [billsRefreshKey, setBillsRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<"jobs" | "bills">("jobs"); // New state to track active view
  const { downloadPDF } = useDownloadContractorBill();
  // State for confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Fetch contractors
  const { data: contractors = [] } = useGetAllContractors();

  // Invalidate and refetch queries when component mounts
  useEffect(() => {
    console.log("ContractorBillingPage: Component mounted, invalidating and refetching queries");
    // Invalidate all relevant queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ["contractorBillableJobs"] });
    queryClient.invalidateQueries({ queryKey: ["allContractorBillableJobs"] });
    queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
    
    // Refetch the queries
    queryClient.refetchQueries({ queryKey: ["contractorBillableJobs"] });
    queryClient.refetchQueries({ queryKey: ["allContractorBillableJobs"] });
    queryClient.refetchQueries({ queryKey: ["generatedBills"] });
  }, [queryClient]);

  // Refetch data when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log("ContractorBillingPage: Window focused, invalidating and refetching queries");
      // Invalidate all relevant queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["contractorBillableJobs"] });
      queryClient.invalidateQueries({ queryKey: ["allContractorBillableJobs"] });
      queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
      
      // Refetch the queries
      queryClient.refetchQueries({ queryKey: ["contractorBillableJobs"] });
      queryClient.refetchQueries({ queryKey: ["allContractorBillableJobs"] });
      queryClient.refetchQueries({ queryKey: ["generatedBills"] });
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [queryClient]);

  // Fetch billable jobs for selected contractor
  const { data: contractorBillableJobsResponse, isLoading: isContractorJobsLoading, refetch: refetchContractorJobs } = useQuery({
    queryKey: ["contractorBillableJobs", selectedContractorId],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (selectedContractorId) {
        params.contractor_id = selectedContractorId;
      }
      const response = await axios.get("/api/jobs/contractor-billable", { params });
      return response.data;
    },
    placeholderData: keepPreviousData,
    enabled: true, // Always fetch contractor jobs for this page
  });

  // Fetch all contractor billable jobs for KPI calculation
  const { data: allContractorBillableJobsResponse } = useQuery({
    queryKey: ["allContractorBillableJobs"],
    queryFn: async () => {
      const response = await axios.get("/api/jobs/contractor-billable");
      return response.data;
    },
    placeholderData: keepPreviousData,
    enabled: true, // Always fetch to ensure KPI cards show correct total counts
  });

  const contractorBillableJobs = contractorBillableJobsResponse?.items || [];
  const totalContractorBillableJobs = contractorBillableJobsResponse?.total || 0;
  const allContractorBillableJobs = allContractorBillableJobsResponse?.items || [];

  // Fetch generated bills
  const { data: generatedBillsResponse, isLoading: isBillsLoading, refetch: refetchBills } = useQuery({
    queryKey: ["generatedBills", billsRefreshKey],
    queryFn: async () => {
      // For contractor billing, fetch contractor bills
      const response = await billsApi.getContractorBills();
      
      // Process bills with entity names and job counts
      const billsWithDetails = response.items.map((bill: any) => {
        // Determine if this is a contractor bill (should have contractor_id)
        const entityName = bill.contractor?.name || `Contractor #${bill.contractor_id}`;
        // Get job count from jobs (not bill_items)
        const jobCount = bill.jobs?.length || 0;
        return {
          ...bill,
          entity_name: entityName,
          total_amount: Number(bill.total_amount || 0),
          date: bill.date ? new Date(bill.date).toISOString().slice(0, 10) : "",
          job_count: jobCount,
          type: "Contractor",
        };
      });
      
      return {
        items: billsWithDetails,
        total: response.total
      };
    },
    placeholderData: keepPreviousData,
  });

  const generatedBills = generatedBillsResponse?.items || [];
  const totalGeneratedBills = generatedBillsResponse?.total || 0;

  // Process jobs with contractor names
  const contractorJobsWithEntityName = useMemo(() => {
    return contractorBillableJobs.map((job: Job) => {
      const contractor = contractors.find((c: Contractor) => c.id === job.contractor_id);
      return {
        ...job,
        contractor_name: contractor?.name || `Contractor #${job.contractor_id}`,
      };
    });
  }, [contractorBillableJobs, contractors]);

  // Build contractor "chips" with counts for jobs and bills
  type ContractorChip = {
    id: number;
    name: string;
    jobCount: number;
    billCount: number;
    billJobCount: number; // Total jobs in all bills for this contractor
  };

  const contractorChips = useMemo(() => {
    const chipsMap = new Map<number, ContractorChip>();
    
    // Initialize all contractors with zero counts, excluding internal contractors
    contractors
      .filter((contractor: Contractor) => !contractor.name.includes('(Internal)'))
      .forEach((contractor: Contractor) => {
        chipsMap.set(contractor.id, {
          id: contractor.id,
          name: contractor.name,
          jobCount: 0,
          billCount: 0,
          billJobCount: 0,
        });
      });
    
    // Count jobs per contractor, excluding internal contractors
    // Use allContractorBillableJobs instead of contractorBillableJobs to ensure all contractors show correct counts
    allContractorBillableJobs
      .filter((job: Job) => {
        const contractor = contractors.find(c => c.id === job.contractor_id);
        return contractor && !contractor.name.includes('(Internal)');
      })
      .forEach((job: Job) => {
        if (job.contractor_id) {
          const current = chipsMap.get(job.contractor_id) || {
            id: job.contractor_id,
            name: contractors.find(c => c.id === job.contractor_id)?.name || `Contractor #${job.contractor_id}`,
            jobCount: 0,
            billCount: 0,
            billJobCount: 0,
          };
          current.jobCount += 1;
          chipsMap.set(job.contractor_id, current);
        }
      });
    
    // Count bills per contractor, excluding internal contractors
    generatedBills
      .filter((bill: any) => bill.contractor_id) // Contractor bills have a contractor_id
      .filter((bill: any) => {
        const contractor = contractors.find(c => c.id === bill.contractor_id);
        return contractor && !contractor.name.includes('(Internal)');
      })
      .forEach((bill: any) => {
        const current = chipsMap.get(bill.contractor_id) || {
          id: bill.contractor_id,
          name: contractors.find(c => c.id === bill.contractor_id)?.name || `Contractor #${bill.contractor_id}`,
          jobCount: 0,
          billCount: 0,
          billJobCount: 0,
        };
        current.billCount += 1;
        current.billJobCount += bill.job_count || 0;
        chipsMap.set(bill.contractor_id, current);
      });
    
    // Convert to array and filter based on active view
    const chipsArray = Array.from(chipsMap.values());
    if (activeView === "jobs") {
      // Only show contractors that have at least 1 job
      return chipsArray.filter(contractor => contractor.jobCount > 0);
    } else if (activeView === "bills") {
      // Only show contractors that have at least 1 bill
      return chipsArray.filter(contractor => contractor.billCount > 0);
    }
    
    return chipsArray;
  }, [allContractorBillableJobs, generatedBills, contractors, activeView]);

  // Refetch data when view changes to ensure chips show current counts
  useEffect(() => {
    // Invalidate and refetch data when view changes to ensure chips show current counts
    queryClient.invalidateQueries({ queryKey: ["contractorBillableJobs"] });
    queryClient.invalidateQueries({ queryKey: ["allContractorBillableJobs"] });
    queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
    
    // Refetch data when view changes to ensure chips show current counts
    if (activeView === "jobs") {
      refetchContractorJobs();
    } else {
      refetchBills();
    }
  }, [activeView, refetchContractorJobs, refetchBills, queryClient]);

  // Get current jobs
  const currentJobs = contractorJobsWithEntityName;
  // Use allContractorBillableJobsResponse.total to ensure KPI cards show total counts
  const totalCurrentJobs = allContractorBillableJobsResponse?.total || 0;
  const isLoading = isContractorJobsLoading;
  const selectedEntityId = selectedContractorId;
  
  // Filter jobs based on selected entity
  const filteredJobs = useMemo(() => {
    if (selectedEntityId) {
      return currentJobs.filter((job: Job) => job.contractor_id === selectedEntityId);
    }
    return currentJobs;
  }, [currentJobs, selectedEntityId]);

  // Filter bills based on selected entity
  const filteredBills = useMemo(() => {
    if (selectedContractorId) {
      return generatedBills.filter((bill: any) => bill.contractor_id === selectedContractorId);
    } else {
      // For contractor billing with no specific contractor selected, show all contractor bills
      return generatedBills.filter((bill: any) => bill.contractor_id);
    }
  }, [generatedBills, selectedContractorId]);

  // Pagination
  const totalJobs = filteredJobs.length;
  const totalBills = filteredBills.length;
  
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, totalJobs);
  
  const startBillIdx = (page - 1) * pageSize + 1;
  const endBillIdx = Math.min(page * pageSize, totalBills);
  
  const paginatedJobs = useMemo(() => {
    const sorted = [...filteredJobs].sort((a, b) => {
      const aVal = a[sortBy as keyof Job];
      const bVal = b[sortBy as keyof Job];
      
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDir === 'asc' ? 1 : -1;
      if (bVal == null) return sortDir === 'asc' ? -1 : 1;
      
      let result = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        result = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        result = aVal - bVal;
      } else {
        result = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
      }
      
      return sortDir === 'asc' ? result : -result;
    });
    
    return sorted.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredJobs, sortBy, sortDir, page, pageSize]);
  
  const paginatedBills = useMemo(() => {
    const sorted = [...filteredBills].sort((a, b) => {
      const aVal = a[sortBy as keyof any];
      const bVal = b[sortBy as keyof any];
      
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDir === 'asc' ? 1 : -1;
      if (bVal == null) return sortDir === 'asc' ? -1 : 1;
      
      let result = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        result = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        result = aVal - bVal;
      } else {
        result = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
      }
      
      return sortDir === 'asc' ? result : -result;
    });
    
    return sorted.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredBills, sortBy, sortDir, page, pageSize]);

  // Total contractors
  const totalContractors = useMemo(() => {
    // Return total number of contractors, not just those with jobs
    // Exclude internal contractors
    return contractors.filter(contractor => !contractor.name.includes('(Internal)')).length;
  }, [contractors]);

  // Handlers
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  const handleFilterChange = (column: string, value: string) => {
    setTableFilters(prev => ({
      ...prev,
      [column]: value
    }));
    setPage(1); // Reset to first page when filter changes
  };

  const handleClearFilter = (column: string) => {
    setTableFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
    setPage(1); // Reset to first page when filter is cleared
  };

  const handleJobSelection = (jobs: Job[]) => {
    setSelectedJobs(jobs);
  };

  const handleView = (job: Job) => {
    setExpandedJobId(expandedJobId === job.id ? null : job.id);
  };

  // Generate bills for selected jobs
  const handleGenerateBills = async () => {
    // Check if any jobs are selected
    if (selectedJobs.length === 0) {
      toast.error("Please select at least one job");
      return;
    }

    try {
      const jobIds = selectedJobs.map(job => job.id);
      
      // Check if all selected jobs have the same contractor
      const contractorIds = [...new Set(selectedJobs.map(job => job.contractor_id).filter(id => id !== undefined))];
      
      if (contractorIds.length === 0) {
        toast.error("Selected jobs must have a contractor assigned");
        return;
      }
      
      if (contractorIds.length > 1) {
        toast.error("All selected jobs must belong to the same contractor");
        return;
      }

      // Get the contractor ID from the selected jobs
      const contractorId = contractorIds[0];
      
      if (!contractorId) {
        toast.error("Selected jobs must have a valid contractor");
        return;
      }

      const response = await billsApi.generateContractorBill({
        contractor_id: contractorId,
        job_id: jobIds
      });

      // Show appropriate success message based on response
      if (response?.message) {
        toast.success(response.message);
      } else {
        toast.success(`Successfully processed bill for ${selectedJobs.length} job(s)`);
      }
      
      // Clear selection
      setSelectedJobs([]);
      setExpandedJobId(null);
      
      // Refresh data - invalidate all relevant queries to ensure KPI cards update
      queryClient.invalidateQueries({ queryKey: ["contractorBillableJobs"] });
      queryClient.invalidateQueries({ queryKey: ["allContractorBillableJobs"] });
      queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
      
      // Also refetch the queries
      refetchContractorJobs();
      refetchBills();
    } catch (error: any) {
      console.error("Error generating bill:", error);
      toast.error(error?.response?.data?.error || "Failed to generate bill");
    }
  };

  // Remove job from bill handler
  const handleRemoveJobFromBill = async (billId: number, jobId: number) => {
    // Open confirmation modal instead of using window.confirm
    setConfirmModalData({
      title: "Remove Job from Bill",
      message: "Are you sure you want to remove this job from the bill?",
      onConfirm: async () => {
        try {
          await billsApi.removeJobFromBill(billId, jobId);
          toast.success("Job removed from bill successfully");
          
          // Refresh data - invalidate all relevant queries to ensure KPI cards update
          queryClient.invalidateQueries({ queryKey: ["contractorBillableJobs"] });
          queryClient.invalidateQueries({ queryKey: ["allContractorBillableJobs"] });
          queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          
          // Also refetch the queries
          refetchContractorJobs();
          refetchBills();
        } catch (error: any) {
          console.error("Error removing job from bill:", error);
          toast.error(error?.response?.data?.error || "Failed to remove job from bill");
        }
      }
    });
    setIsConfirmModalOpen(true);
  };

  // Mark bill as paid handler
  const handleMarkAsPaid = async (bill: any) => {
    // Open confirmation modal instead of using window.confirm
    setConfirmModalData({
      title: "Mark Bill as Paid",
      message: `Are you sure you want to mark this bill as paid?`,
      onConfirm: async () => {
        try {
          // Update bill status to 'Paid'
          await billsApi.updateBillStatus({ id: bill.id, status: 'Paid' });
          toast.success("Bill marked as paid successfully");
          
          // Refresh data - invalidate all relevant queries to ensure KPI cards update
          queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          
          // Also refetch the queries
          refetchBills();
        } catch (error: any) {
          console.error("Error marking bill as paid:", error);
          toast.error(error?.response?.data?.error || "Failed to mark bill as paid");
        }
      }
    });
    setIsConfirmModalOpen(true);
  };

  // Delete bill handler
  const handleDeleteBill = async (bill: any) => {
    // Prevent deletion of bills with 'Paid' status
    if (bill.status === 'Paid') {
      toast.error("Cannot delete bill with status: Paid");
      return;
    }
    
    // Allow deletion of bills with 'Generated' status (displayed as 'Unpaid')
    // Also allow deletion of bills with 'Unpaid' status
    if (bill.status !== 'Generated' && bill.status !== 'Unpaid') {
      toast.error(`Cannot delete bill with status: ${bill.status}`);
      return;
    }
    
    // Open confirmation modal instead of using window.confirm
    setConfirmModalData({
      title: "Delete Bill",
      message: "Are you sure you want to delete this bill? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await axios.delete(`/api/bills/${bill.id}`);
          toast.success("Bill deleted successfully. Jobs moved back to 'Jobs not in Bill' list.");
          
          // Refresh data - invalidate all relevant queries to ensure KPI cards update
          queryClient.invalidateQueries({ queryKey: ["contractorBillableJobs"] });
          queryClient.invalidateQueries({ queryKey: ["allContractorBillableJobs"] });
          queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          
          // Also refetch the queries
          refetchContractorJobs();
          refetchBills();
        } catch (error: any) {
          console.error("Error deleting bill:", error);
          toast.error(error?.response?.data?.error || "Failed to delete bill");
        }
      }
    });
    setIsConfirmModalOpen(true);
  };

  // Card components
  const Card: React.FC<{
    title: string;
    value: React.ReactNode;
    sub?: string;
    tone: "green" | "blue" | "pink" | "yellow" | "red";
    onClick?: () => void;
    active?: boolean;
    className?: string;
  }> = ({ title, value, sub, tone, onClick, active, className }) => {
    const toneMap: Record<string, string> = {
      green: "from-emerald-700 to-emerald-600",
      blue: "from-sky-700 to-sky-600",
      pink: "from-fuchsia-700 to-fuchsia-600",
      yellow: "from-amber-600 to-amber-500",
      red: "from-rose-600 to-rose-500",
    };

    return (
      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : -1}
        onClick={onClick}
        className={`rounded-xl p-5 text-white bg-gradient-to-br shadow-lg select-none transition
          focus:outline-none hover:brightness-110 cursor-pointer
          ${active ? "ring-2 ring-white/25" : "ring-1 ring-white/10"}
          ${toneMap[tone]}
          ${className || ""}`}
      >
        <div className="text-sm/5 opacity-90">{title}</div>
        <div className="text-3xl font-semibold mt-1">{value}</div>
        {sub ? <div className="text-xs/5 mt-1 opacity-80">{sub}</div> : null}
      </div>
    );
  };

  // Confirmation Modal Component
  const ConfirmModal: React.FC = () => {
    if (!isConfirmModalOpen || !confirmModalData) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background-light rounded-xl border border-border-color shadow-xl max-w-md w-full">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-text-main mb-2">{confirmModalData.title}</h3>
            <p className="text-text-secondary mb-6">{confirmModalData.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-border-color text-text-main hover:bg-background"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModalData.onConfirm();
                  setIsConfirmModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
    }).format(amount);
  };

  return (
    <div className="w-full flex flex-col gap-4 px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contractor Payment Management</h1>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Jobs not in Bill */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveView("jobs")}
          className={`rounded-xl p-5 text-white bg-gradient-to-br shadow-lg select-none transition
            focus:outline-none hover:brightness-110 cursor-pointer
            ${activeView === "jobs" ? "ring-2 ring-white/25" : "ring-1 ring-white/10"}
            from-sky-700 to-sky-600`}
        >
          <div className="text-sm/5 opacity-90">Jobs not in Bill</div>
          <div className="text-3xl font-semibold mt-1">
            {totalCurrentJobs}
          </div>
          <div className="text-xs/5 mt-1 opacity-80">Awaiting billing</div>
        </div>

        {/* Generated Bills */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveView("bills")}
          className={`rounded-xl p-5 text-white bg-gradient-to-br shadow-lg select-none transition
            focus:outline-none hover:brightness-110 cursor-pointer
            ${activeView === "bills" ? "ring-2 ring-white/25" : "ring-1 ring-white/10"}
            from-emerald-700 to-emerald-600`}
        >
          <div className="text-sm/5 opacity-90">Generated Bills</div>
          <div className="text-3xl font-semibold mt-1">
            {totalBills}
          </div>
          <div className="text-xs/5 mt-1 opacity-80">Total bills generated</div>
        </div>
      </div>

      {/* Contractor filter chips bar */}
      <div className="bg-background pt-2 pb-2 px-4 rounded-t-xl">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold text-white/80">
            Filter by Contractor
          </h2>
        </div>

        {(() => {
          const PER_ROW = 8;
          const MAX_ROWS = 2;
          const MAX_VISIBLE_CONTRACTORS = PER_ROW * MAX_ROWS - 1; // minus "All Contractors"
          const cappedChips = contractorChips.slice(0, MAX_VISIBLE_CONTRACTORS);

          return (
            <div className="grid grid-cols-8 gap-1.5">
              {/* All Contractors cell */}
              <button
                onClick={() => setSelectedContractorId(null)}
                className={`w-full px-2 py-3 min-h-12
                  flex flex-col items-center justify-center text-center gap-0.5
                  rounded-lg border transition break-words
                  ${selectedContractorId == null
                    ? "bg-primary text-white border-primary"
                    : "bg-background-light text-white/90 border-border-color hover:bg-primary/30"}`}
              >
                <span className="text-[13px] font-medium leading-tight">All Contractors</span>
                <span className="text-xs opacity-70 mt-0.5">
                  {activeView === "jobs" 
                    ? `(${contractorChips.reduce((sum, c) => sum + c.jobCount, 0)})`
                    : `(${contractorChips.reduce((sum, c) => sum + c.billJobCount, 0)})`}
                </span>
              </button>

              {/* Up to 15 contractors so total = 16 cells (2 rows x 8 cols) */}
              {cappedChips
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedContractorId(c.id)}
                    title={c.name}
                    className={`w-full px-2 py-3 min-h-12
                      flex flex-col items-center justify-center text-center gap-0.5
                      rounded-lg border transition break-words
                      ${selectedContractorId === c.id
                        ? "bg-primary text-white border-primary"
                        : "bg-background-light text-white/90 border-border-color hover:bg-primary/30"}`}
                  >
                    <span className="text-[13px] font-medium leading-tight">{c.name}</span>
                    <span className="text-xs opacity-70 mt-0.5">
                      ({activeView === "jobs" ? c.jobCount : c.billJobCount})
                    </span>
                  </button>
                ))}
            </div>
          );
        })()}
      </div>

      {/* Show Jobs Table when activeView is "jobs" */}
      {activeView === "jobs" && (
        <>
          {/* Table Info */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              {`Showing ${totalJobs === 0 ? 0 : startIdx}-${endIdx} of ${totalJobs} jobs`}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-xs text-text-secondary">
                Rows per page:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-background-light border-border-color text-text-main rounded px-2 py-1 text-xs md:w-20"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Bills Button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerateBills}
              disabled={selectedJobs.length === 0}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedJobs.length === 0
                  ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 text-white"
              }`}
            >
              Generate Bills ({selectedJobs.length} selected)
            </button>
          </div>

          {/* Jobs Table */}
          <div className="flex-grow rounded-xl shadow-lg bg-background-light border border-border-color overflow-hidden">
            <div className="w-full overflow-x-auto md:overflow-x-visible">
              <JobEntityTable
                columns={contractorBillableColumns.map((col) => ({
                  ...col,
                  label: (
                    <span
                      className="inline-flex items-center gap-1 cursor-pointer select-none"
                      onClick={() => handleSort(col.accessor as string)}
                    >
                      {col.label}
                      {sortBy === col.accessor ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="w-3 h-3 inline" />
                        ) : (
                          <ArrowDown className="w-3 h-3 inline" />
                        )
                      ) : null}
                    </span>
                  ),
                  filterable: true,
                  stringLabel: col.stringLabel,
                  renderFilter: (
                    value: string,
                    onChange: (v: string) => void
                  ) => (
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        className="w-full bg-background-light border-border-color text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary rounded px-2 py-1 text-xs mt-1 pr-6"
                        placeholder={`Filter ${(col.stringLabel || col.accessor)
                          .toString()
                          .toLowerCase()}...`}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                      />
                      {value && (
                        <button
                          type="button"
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-text-secondary hover:text-red-500 text-xs"
                          onClick={() =>
                            handleClearFilter(col.accessor as string)
                          }
                          tabIndex={-1}
                          aria-label="Clear filter"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ),
                  render: col.accessor === "actions" ? (row: Job) => (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(row);
                        }}
                        className="px-2 py-1 rounded-md border border-border-color hover:bg-background text-xs"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  ) : undefined,
                }))}
                data={paginatedJobs}
                isLoading={isLoading}
                onSelectionChange={handleJobSelection}
                renderExpandedRow={(job) => (
                  <div className="py-6 px-8">
                    <JobDetailCard job={job} />
                  </div>
                )}
                rowClassName={(job) =>
                  expandedJobId === job.id ? "bg-primary/10" : ""
                }
                onRowClick={handleView}
                expandedRowId={expandedJobId}
                filters={tableFilters}
                onFilterChange={handleFilterChange}
                selectedRowIds={selectedJobs.map(job => job.id)}
                page={page}
                pageSize={pageSize}
                total={totalJobs}
                onPageChange={setPage}
              />
            </div>
          </div>
        </>
      )}

      {/* Show Bills Table when activeView is "bills" */}
      {activeView === "bills" && (
        <>
          {/* Generated Bills Table Info */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary">
              {`Showing ${totalBills === 0 ? 0 : startBillIdx}-${endBillIdx} of ${totalBills} bills`}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="billsPageSize" className="text-xs text-text-secondary">
                Rows per page:
              </label>
              <select
                id="billsPageSize"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-background-light border-border-color text-text-main rounded px-2 py-1 text-xs md:w-20"
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generated Bills Table */}
          <div className="flex-grow rounded-xl shadow-lg bg-background-light border border-border-color overflow-hidden">
            <div className="w-full overflow-x-auto md:overflow-x-visible">
              <JobEntityTable
                columns={generatedBillsColumns.map((col) => ({
                  ...col,
                  label: (
                    <span
                      className="inline-flex items-center gap-1 cursor-pointer select-none"
                      onClick={() => handleSort(col.accessor as string)}
                    >
                      {col.label}
                      {sortBy === col.accessor ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="w-3 h-3 inline" />
                        ) : (
                          <ArrowDown className="w-3 h-3 inline" />
                        )
                      ) : null}
                    </span>
                  ),
                  filterable: true,
                  stringLabel: col.stringLabel,
                  renderFilter: (
                    value: string,
                    onChange: (v: string) => void
                  ) => (
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        className="w-full bg-background-light border-border-color text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary rounded px-2 py-1 text-xs mt-1 pr-6"
                        placeholder={`Filter ${(col.stringLabel || col.accessor)
                          .toString()
                          .toLowerCase()}...`}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                      />
                      {value && (
                        <button
                          type="button"
                          className="absolute right-1 top-1/2 -translate-y-1/2 text-text-secondary hover:text-red-500 text-xs"
                          onClick={() =>
                            handleClearFilter(col.accessor as string)
                          }
                          tabIndex={-1}
                          aria-label="Clear filter"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ),
                  render: col.accessor === "actions" ? (row: any) => (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (row.status !== 'Paid') {
                            handleMarkAsPaid(row);
                          }
                        }}
                        className={`px-2 py-1 rounded-md border text-xs ${row.status === 'Paid' ? 'border-green-500/50 bg-green-500/20 text-green-400 cursor-not-allowed' : 'border-border-color hover:bg-green-500/50 text-green-500'}`}
                        title={row.status === 'Paid' ? 'Already Paid' : 'Mark as Paid'}
                        disabled={row.status === 'Paid'}
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement view bill functionality
                          toast("View bill functionality to be implemented");
                        }}
                        className="px-2 py-1 rounded-md border border-border-color hover:bg-background text-xs"
                        title="View Bill"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBill(row);
                        }}
                        className={`px-2 py-1 rounded-md border text-xs ${row.status === 'Paid' ? 'border-gray-500/50 bg-gray-500/20 text-gray-400 cursor-not-allowed' : 'border-border-color hover:bg-red-500/50 text-red-500'}`}
                        title={row.status === 'Paid' ? 'Cannot delete paid bill' : 'Delete Bill'}
                        disabled={row.status === 'Paid'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
  onClick={(e) => {
    e.stopPropagation();
    toast.loading("Generating PDF...", { id: "pdf-download" });
    downloadPDF(row.id)
      .then(() => toast.success("PDF downloaded successfully", { id: "pdf-download" }))
      .catch(() => toast.error("Failed to download PDF", { id: "pdf-download" }));
  }}
  className="px-2 py-1 rounded-md border border-border-color hover:bg-primary/20 text-xs"
  title="Download PDF"
>

      <ArrowDownTrayIcon className="w-4 h-4" />
    </button>
                    </div>
                  ) : col.accessor === "job_count" ? (row: any) => (
                    <span>{row.job_count}</span>
                  ) : col.accessor === "total_amount" ? (row: any) => (
                    <span>{formatCurrency(row.total_amount)}</span>
                  ) : col.accessor === "type" ? (row: any) => (
                    <span>{row.type}</span>
                  ) : col.accessor === "status" ? (row: any) => (
                    <span className={`px-2 py-1 rounded text-xs ${row.status === 'Paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {row.status === 'Generated' ? 'Unpaid' : row.status || 'Unpaid'}
                    </span>
                  ) : undefined,
                }))}
                data={paginatedBills}
                isLoading={isBillsLoading}
                renderExpandedRow={(bill) => (
                  <div className="py-4 px-6">
                    <div className="rounded-lg border border-border-color bg-background-light overflow-hidden">
                      <h4 className="px-4 py-2 bg-background/60 font-medium">Jobs in this Bill</h4>
                      {bill.jobs && bill.jobs.length > 0 ? (
                        <table className="min-w-full text-sm">
                          <thead className="bg-background/40">
                            <tr>
                              <th className="px-3 py-2 text-left">Job ID</th>
                              <th className="px-3 py-2 text-left">Pickup</th>
                              <th className="px-3 py-2 text-left">Drop-off</th>
                              <th className="px-3 py-2 text-left">Pickup Date</th>
                              <th className="px-3 py-2 text-left">Net Amount</th>
                              <th className="px-3 py-2 text-left">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bill.jobs.map((job: any) => (
                              <tr key={job.id} className="border-t border-border-color hover:bg-background/20">
                                <td className="px-3 py-2">{job.id}</td>
                                <td className="px-3 py-2">{job.pickup_location || '-'}</td>
                                <td className="px-3 py-2">{job.dropoff_location || '-'}</td>
                                <td className="px-3 py-2">
                                  {job.pickup_date ? new Date(job.pickup_date).toISOString().slice(0, 10) : '-'}
                                </td>
                                <td className="px-3 py-2">{formatCurrency(Number(job.job_cost || 0) - Number(job.cash_to_collect || 0))}</td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => handleRemoveJobFromBill(bill.id, job.id)}
                                    className={`px-2 py-1 rounded-md border text-xs ${bill.status === 'Paid' ? 'border-gray-500/50 bg-gray-500/20 text-gray-400 cursor-not-allowed' : 'border-border-color hover:bg-red-500/50 text-red-500'}`}
                                    title={bill.status === 'Paid' ? 'Cannot remove job from paid bill' : 'Remove from Bill'}
                                    disabled={bill.status === 'Paid'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="px-4 py-6 text-center text-text-secondary">
                          No jobs found for this bill.
                        </div>
                      )}
                    </div>
                  </div>
                )}
                rowClassName={(bill) =>
                  "" // Removed expanded row styling
                }
                onRowClick={undefined} // Removed row click handler
                expandedRowId={undefined} // Removed expanded row ID
                filters={tableFilters}
                onFilterChange={handleFilterChange}
                selectedRowIds={[]} // No row selection for bills
                page={page}
                pageSize={pageSize}
                total={totalBills}
                onPageChange={setPage}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ContractorBillingPage;