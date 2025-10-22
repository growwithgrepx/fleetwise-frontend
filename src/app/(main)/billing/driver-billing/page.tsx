"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Job } from "@/types/job";
import { Driver } from "@/lib/types";
import { JobEntityTable } from "@/components/organisms/JobBillingTable";
import { EntityTableColumn } from "@/components/organisms/JobBillingTable";
import { useGetAllDrivers } from "@/hooks/useDrivers";
import toast from "react-hot-toast";
import { ArrowUp, ArrowDown, Eye, Trash2, DollarSign } from "lucide-react";
import JobDetailCard from "@/components/organisms/JobDetailCard";
import * as billsApi from "@/services/api/billingApi";

// Column configuration for Driver Billable Jobs table
const driverBillableColumns: EntityTableColumn<Job & { stringLabel?: string }>[] = [
  {
    label: "Job Id",
    accessor: "id",
    filterable: true,
    stringLabel: "Job Id",
  },
  {
    label: "Driver Name",
    accessor: "driver_name",
    filterable: true,
    stringLabel: "Driver",
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
    label: "Driver Name",
    accessor: "entity_name",
    filterable: true,
    stringLabel: "Driver",
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

const DriverBillingPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("pickup_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tableFilters, setTableFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [billsRefreshKey, setBillsRefreshKey] = useState(0);
  const [activeView, setActiveView] = useState<"jobs" | "bills">("jobs"); // New state to track active view
  
  // State for confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Fetch drivers
  const { data: drivers = [] } = useGetAllDrivers();

  // Invalidate and refetch queries when component mounts
  useEffect(() => {
    console.log("DriverBillingPage: Component mounted, invalidating and refetching queries");
    const refreshData = async () => {
      // Force immediate refresh of all data
      setBillsRefreshKey(prev => prev + 1); // Force refresh bills
      
      // Invalidate all relevant queries to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
      await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
      await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
      
      // Additional invalidation to ensure KPI cards update
      setTimeout(async () => {
        await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
        await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
        await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
      }, 100);
    };
    
    refreshData();
  }, [queryClient]);

  // Refetch data when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      console.log("DriverBillingPage: Window focused, invalidating and refetching queries");
      const refreshData = async () => {
        // Force immediate refresh of all data
        setBillsRefreshKey(prev => prev + 1); // Force refresh bills
        
        // Invalidate all relevant queries to ensure fresh data
        await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
        await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
        await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
        
        // Additional invalidation to ensure KPI cards update
        setTimeout(async () => {
          await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
          await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
          await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
        }, 100);
      };
      
      refreshData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [queryClient]);

  // Fetch billable jobs for selected driver
  const { data: driverBillableJobsResponse, isLoading: isDriverJobsLoading, refetch: refetchDriverJobs } = useQuery({
    queryKey: ["driverBillableJobs", selectedDriverId],
    queryFn: async () => {
      const params: Record<string, any> = {};
      if (selectedDriverId) {
        params.driver_id = selectedDriverId;
      }
      const response = await billsApi.getDriverBillableJobs(params);
      return response;
    },
    placeholderData: keepPreviousData,
    enabled: true, // Always fetch driver jobs for this page
  });

  // Fetch all driver billable jobs for KPI calculation
  const { data: allDriverBillableJobsResponse } = useQuery({
    queryKey: ["allDriverBillableJobs"],
    queryFn: async () => {
      const response = await billsApi.getDriverBillableJobs({});
      return response;
    },
    placeholderData: keepPreviousData,
    enabled: true, // Always fetch to ensure KPI cards show correct total counts
  });

  const driverBillableJobs = driverBillableJobsResponse?.items || [];
  const totalDriverBillableJobs = driverBillableJobsResponse?.total || 0;
  const allDriverBillableJobs = allDriverBillableJobsResponse?.items || [];

  // Fetch generated bills
  const { data: generatedBillsResponse, isLoading: isBillsLoading, refetch: refetchBills } = useQuery({
    queryKey: ["generatedBills", billsRefreshKey],
    queryFn: async () => {
      // For driver billing, fetch driver bills
      const response = await billsApi.getDriverBills();
      
      // Process bills with entity names and job counts
      const billsWithDetails = response.items.map((bill: any) => {
        // For driver bills, get driver name from the driver property or jobs
        let entityName = "Unknown Driver";
        if (bill.driver && bill.driver.name) {
          entityName = bill.driver.name;
        } else if (bill.jobs && bill.jobs.length > 0 && bill.jobs[0].driver) {
          entityName = bill.jobs[0].driver.name;
        } else if (bill.jobs && bill.jobs.length > 0 && bill.jobs[0].driver_name) {
          entityName = bill.jobs[0].driver_name;
        } else if (bill.jobs && bill.jobs.length > 0) {
          // Fallback to driver ID if name is not available
          const driverId = bill.jobs[0].driver_id || 'N/A';
          entityName = `Driver #${driverId}`;
        }
        
        // Get job count from jobs array
        const jobCount = bill.jobs?.length || 0;
        return {
          ...bill,
          entity_name: entityName,
          total_amount: Number(bill.total_amount || 0),
          date: bill.date ? new Date(bill.date).toISOString().slice(0, 10) : "",
          job_count: jobCount,
          type: "Driver",
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

  // Process jobs with driver names
  const driverJobsWithEntityName = useMemo(() => {
    return driverBillableJobs.map((job: Job) => {
      const driver = drivers.find((d: Driver) => d.id === job.driver_id);
      return {
        ...job,
        driver_name: driver?.name || `Driver #${job.driver_id}`,
      };
    });
  }, [driverBillableJobs, drivers]);

  // Build driver "chips" with counts for jobs and bills
  type DriverChip = {
    id: number;
    name: string;
    jobCount: number;
    billCount: number;
    billJobCount: number; // Total jobs in all bills for this driver
  };

  const driverChips = useMemo(() => {
    const chipsMap = new Map<number, DriverChip>();
    
    // Initialize all drivers with zero counts
    drivers.forEach((driver: Driver) => {
      chipsMap.set(driver.id, {
        id: driver.id,
        name: driver.name,
        jobCount: 0,
        billCount: 0,
        billJobCount: 0,
      });
    });
    
    // Count jobs per driver, excluding internal drivers
    // Use allDriverBillableJobs instead of driverBillableJobs to ensure all drivers show correct counts
    allDriverBillableJobs
      .filter((job: Job) => {
        const driver = drivers.find(d => d.id === job.driver_id);
        return driver;
      })
      .forEach((job: Job) => {
        if (job.driver_id) {
          const current = chipsMap.get(job.driver_id) || {
            id: job.driver_id,
            name: drivers.find(d => d.id === job.driver_id)?.name || `Driver #${job.driver_id}`,
            jobCount: 0,
            billCount: 0,
            billJobCount: 0,
          };
          current.jobCount += 1;
          chipsMap.set(job.driver_id, current);
        }
      });
    
    // Count bills per driver
    generatedBills
      .forEach((bill: any) => {
        // For driver bills, get driver ID from the driver property or first job
        let driverId = null;
        if (bill.driver && bill.driver.id) {
          driverId = bill.driver.id;
        } else if (bill.jobs && bill.jobs.length > 0) {
          if (bill.jobs[0].driver && bill.jobs[0].driver.id) {
            driverId = bill.jobs[0].driver.id;
          } else if (bill.jobs[0].driver_id) {
            driverId = bill.jobs[0].driver_id;
          }
        }
        
        if (driverId) {
          const current = chipsMap.get(driverId) || {
            id: driverId,
            name: drivers.find(d => d.id === driverId)?.name || `Driver #${driverId}`,
            jobCount: 0,
            billCount: 0,
            billJobCount: 0,
          };
          current.billCount += 1;
          current.billJobCount += bill.job_count || 0;
          chipsMap.set(driverId, current);
        }
      });
    
    // Convert to array and filter based on active view
    const chipsArray = Array.from(chipsMap.values());
    if (activeView === "jobs") {
      // Only show drivers that have at least 1 job
      return chipsArray.filter(driver => driver.jobCount > 0);
    } else if (activeView === "bills") {
      // Only show drivers that have at least 1 bill
      return chipsArray.filter(driver => driver.billCount > 0);
    }
    
    return chipsArray;
  }, [allDriverBillableJobs, generatedBills, drivers, activeView]);

  // Refetch data when view changes to ensure chips show current counts
  useEffect(() => {
    const refreshData = async () => {
      // Force immediate refresh of all data
      setBillsRefreshKey(prev => prev + 1); // Force refresh bills
      
      // Invalidate all relevant queries to ensure chips show current counts
      await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
      await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
      await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
      
      // Additional invalidation to ensure KPI cards update
      setTimeout(async () => {
        await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
        await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
        await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
      }, 100);
    };
    
    refreshData();
  }, [activeView, queryClient]);

  // Get current jobs
  const currentJobs = driverJobsWithEntityName;
  // Use allDriverBillableJobsResponse.total to ensure KPI cards show total counts
  const totalCurrentJobs = allDriverBillableJobsResponse?.total || 0;
  const isLoading = isDriverJobsLoading;
  const selectedEntityId = selectedDriverId;
  
  // Filter jobs based on selected entity
  const filteredJobs = useMemo(() => {
    if (selectedEntityId) {
      return currentJobs.filter((job: Job) => job.driver_id === selectedEntityId);
    }
    return currentJobs;
  }, [currentJobs, selectedEntityId]);

  // Filter bills based on selected entity
  const filteredBills = useMemo(() => {
    if (selectedDriverId) {
      return generatedBills.filter((bill: any) => {
        // For driver bills, get driver ID from the driver property or first job
        let driverId = null;
        if (bill.driver && bill.driver.id) {
          driverId = bill.driver.id;
        } else if (bill.jobs && bill.jobs.length > 0) {
          if (bill.jobs[0].driver && bill.jobs[0].driver.id) {
            driverId = bill.jobs[0].driver.id;
          } else if (bill.jobs[0].driver_id) {
            driverId = bill.jobs[0].driver_id;
          }
        }
        return driverId === selectedDriverId;
      });
    } else {
      // For driver billing with no specific driver selected, show all driver bills
      return generatedBills;
    }
  }, [generatedBills, selectedDriverId]);

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

  // Total drivers
  const totalDrivers = useMemo(() => {
    // Return total number of drivers, not just those with jobs
    return drivers.length;
  }, [drivers]);

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
      
      // Check if all selected jobs have the same driver
      const driverIds = [...new Set(selectedJobs.map(job => job.driver_id).filter(id => id !== undefined))];
      
      if (driverIds.length === 0) {
        toast.error("Selected jobs must have a driver assigned");
        return;
      }
      
      if (driverIds.length > 1) {
        toast.error("All selected jobs must belong to the same driver");
        return;
      }

      // Get the driver ID from the selected jobs
      const driverId = driverIds[0];
      
      if (!driverId) {
        toast.error("Selected jobs must have a valid driver");
        return;
      }

      const response = await billsApi.generateDriverBill({
        driver_id: driverId,
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
      
      // Force immediate refresh of all data
      setBillsRefreshKey(prev => prev + 1); // Force refresh bills
      
      // Invalidate all relevant queries to ensure KPI cards update
      await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
      await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
      await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
      
      // Additional invalidation to ensure KPI cards update
      setTimeout(async () => {
        await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
        await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
        await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
      }, 100);
      
      setTimeout(async () => {
        await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
        await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
        await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
      }, 500);
    } catch (error: any) {
      console.error("Error generating bill:", error);
      toast.error(error?.response?.data?.error || "Failed to generate bill");
    }
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
          
          // Force immediate refresh of all data
          setBillsRefreshKey(prev => prev + 1); // Force refresh bills
          
          // Invalidate all relevant queries to ensure KPI cards update
          await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          
          // Additional invalidation to ensure KPI cards update
          setTimeout(async () => {
            await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          }, 100);
          
          setTimeout(async () => {
            await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          }, 500);
        } catch (error: any) {
          console.error("Error marking bill as paid:", error);
          toast.error(error?.response?.data?.error || "Failed to mark bill as paid");
        }
      }
    });
    setIsConfirmModalOpen(true);
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
          
          // Force immediate refresh of all data
          setBillsRefreshKey(prev => prev + 1); // Force refresh bills
          
          // Invalidate all relevant queries to ensure KPI cards update
          await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
          await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
          await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          
          // Additional invalidation to ensure KPI cards update
          setTimeout(async () => {
            await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
            await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
            await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          }, 100);
          
          setTimeout(async () => {
            await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
            await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
            await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          }, 500);
        } catch (error: any) {
          console.error("Error removing job from bill:", error);
          toast.error(error?.response?.data?.error || "Failed to remove job from bill");
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
    
    // Allow deletion of bills with 'Generated' status
    if (bill.status !== 'Generated') {
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
          
          // Force immediate refresh of all data
          setBillsRefreshKey(prev => prev + 1); // Force refresh bills
          
          // Invalidate all relevant queries to ensure KPI cards update
          await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
          await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
          await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          
          // Additional invalidation to ensure KPI cards update
          setTimeout(async () => {
            await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
            await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
            await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          }, 100);
          
          setTimeout(async () => {
            await queryClient.invalidateQueries({ queryKey: ["driverBillableJobs"] });
            await queryClient.invalidateQueries({ queryKey: ["allDriverBillableJobs"] });
            await queryClient.invalidateQueries({ queryKey: ["generatedBills"] });
          }, 500);
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
    <div className="max-w-7xl mx-auto px-2 py-6 w-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Driver Payment Management</h1>
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
            {totalGeneratedBills}
          </div>
          <div className="text-xs/5 mt-1 opacity-80">Total bills generated</div>
        </div>
      </div>

      {/* Driver filter chips bar */}
      <div className="bg-background pt-2 pb-2 px-4 rounded-t-xl">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold text-white/80">
            Filter by Driver
          </h2>
        </div>

        {(() => {
          const PER_ROW = 8;
          const MAX_ROWS = 2;
          const MAX_VISIBLE_DRIVERS = PER_ROW * MAX_ROWS - 1; // minus "All Drivers"
          const cappedChips = driverChips.slice(0, MAX_VISIBLE_DRIVERS);

          return (
            <div className="grid grid-cols-8 gap-1.5">
              {/* All Drivers cell */}
              <button
                onClick={() => setSelectedDriverId(null)}
                className={`w-full px-2 py-3 min-h-12
                  flex flex-col items-center justify-center text-center gap-0.5
                  rounded-lg border transition break-words
                  ${selectedDriverId == null
                    ? "bg-primary text-white border-primary"
                    : "bg-background-light text-white/90 border-border-color hover:bg-primary/30"}`}
              >
                <span className="text-[13px] font-medium leading-tight">All Drivers</span>
                <span className="text-xs opacity-70 mt-0.5">
                  {activeView === "jobs" 
                    ? `(${driverChips.reduce((sum, d) => sum + d.jobCount, 0)})`
                    : `(${driverChips.reduce((sum, d) => sum + d.billJobCount, 0)})`}
                </span>
              </button>

              {/* Up to 15 drivers so total = 16 cells (2 rows x 8 cols) */}
              {cappedChips
                .map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDriverId(d.id)}
                    title={d.name}
                    className={`w-full px-2 py-3 min-h-12
                      flex flex-col items-center justify-center text-center gap-0.5
                      rounded-lg border transition break-words
                      ${selectedDriverId === d.id
                        ? "bg-primary text-white border-primary"
                        : "bg-background-light text-white/90 border-border-color hover:bg-primary/30"}`}
                  >
                    <span className="text-[13px] font-medium leading-tight">{d.name}</span>
                    <span className="text-xs opacity-70 mt-0.5">
                      ({activeView === "jobs" ? d.jobCount : d.billJobCount})
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
                columns={driverBillableColumns.map((col) => ({
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
                              <th className="px-3 py-2 text-left">Amount</th>
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
                                <td className="px-3 py-2">{formatCurrency(Math.abs(Number(job.job_cost || 0) - Number(job.cash_to_collect || 0)))}</td>
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

export default DriverBillingPage;