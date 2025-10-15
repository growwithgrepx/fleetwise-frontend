"use client";
import React, { useMemo, useState, useRef } from "react"; 
import { useRouter } from "next/navigation";
import { Job, JobFormData } from "@/types/job";
import {
  EntityTableColumn,
  EntityTableAction,
} from "@/components/organisms/EntityTable";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog";
import JobDetailCard from "@/components/organisms/JobDetailCard";
import { DollarSign, Eye, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import JobForm from "@/components/organisms/JobForm";
import toast from 'react-hot-toast';
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useBills } from "@/hooks/useBills";
import { useGetAllCustomers } from "@/hooks/useCustomers";
import { JobEntityTable } from "@/components/organisms/JobBillingTable";
import { CustomerJobEntityTable } from "@/components/organisms/CustomerJobEntityTable";
import { JobOrInvoice } from "@/types/job";
import { Invoice } from "@/types/types";
import { useJobs } from "@/hooks/useJobs";
import { BillingErrorBoundary } from "@/components/organisms/BillingErrorBoundary";
import CountFetcher from "@/components/organisms/CountFetcher";
import axios from "axios";
import PartialPaymentModal from "@/components/organisms/PartialPaymentModal";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { useCallback } from "react";
import classNames from "classnames";
import { useQueryClient } from "@tanstack/react-query";

// Column configuration for Unbilled Jobs table (simple, filterable)
const unBillColumns: EntityTableColumn<Job & { stringLabel?: string }>[] = [
  {
    label: "Job Id",
    accessor: "job_id",
    filterable: true,
    stringLabel: "Job Id",
  },
  {
    label: "Customer Name",
    accessor: "customer_name",
    filterable: true,
    stringLabel: "Customer",
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
  // Removed Status column
];

// Column configuration for Jobs table (simple, filterable)
const unPaidColumns = [
  {
    label: "Invoice ID",
    accessor: "id",   
    filterable: true,
    stringLabel: "Invoice #",
  },
   {
    label: "Customer Id",
    accessor: "customer_id",
    filterable: false,
    stringLabel: "Customer",
  },
  {
    label: "Customer Name",
    accessor: "customer_name",
    filterable: false,
    stringLabel: "Customer",
  },
  {
    label: "Total Amount",
    accessor: "total_amount",
    filterable: false,
    stringLabel: "Total Amount",
  },
   {
    label: "Remaining Amount",
    accessor: "remaining_amount_invoice",
    filterable: false,
    stringLabel: "Remaining Amount",
  },
  {
    label: "Date",
    accessor: "date",
    filterable: false,
    stringLabel: "Pickup",
  },
  {
    accessor: "status",
    label: "Status",
    render: (job: Invoice) => (
      <span
        className={`px-2 py-1 rounded-md text-xs font-medium
          ${job.status === "Unpaid" ? "bg-red-100 text-red-700" : ""}
          ${job.status === "Paid" ? "bg-green-100 text-green-700" : ""}
          ${job.status === "Partially Paid" ? "bg-yellow-100 text-yellow-700" : ""} text-sm whitespace-nowrap`
        }
      >
        {job.status}
      </span>
    ),
  },

  // Removed Status column
];

// Column configuration for Customer's Jobs table (simple, filterable)
const customerColumns: EntityTableColumn<Job & { stringLabel?: string }>[] = [
  {
    label: "Invoice #",
    accessor: "id",   
    filterable: true,
    stringLabel: "Invoice #",
  },
  {
    label: "Customer",
    accessor: "customer_name",
    filterable: true,
    stringLabel: "Customer",
  },

  {
    label: "Customer",
    accessor: "customer_id",
    filterable: false,
    stringLabel: "Customer",
  },
  {
    label: "Total Amount",
    accessor: "total_amount",
    filterable: false,
    stringLabel: "Total Amount",
  },
  {
    label: "Date",
    accessor: "date",
    filterable: false,
    stringLabel: "Pickup",
  },
  // {
  //   label: "Status",
  //   accessor: "status",
  //   filterable: false,
  //   stringLabel: "Status",
  // },

];

const getBillActions = (
  router: AppRouterInstance,
  handleDelete: (id: string | number) => void,
  isDeleting: (item: Job) => boolean,
  handleView: (job: Job | Invoice) => void,
  handleEdit: (job: Job) => void,
  handlePaid: (item: Invoice | Job) => void,
  handleUnPaidInvoiceDownload: (invoice_id: number) => void,
  handlePaidInvoiceDownload: (invoice_id: number) => void,
  handleDeleteUnpaidInvoice: (invoice_id: number) => void,
  handlePartialPayment: (invoice_id: number) => void,
  status: string | undefined
): EntityTableAction<JobOrInvoice>[] => {
  const actions: EntityTableAction<JobOrInvoice>[] = [
    {
      label: "View",
      icon: <Eye className="w-5 h-5 text-primary" />,
      onClick: handleView,
      ariaLabel: "View job details",
      title: "View",
    },
  ];

  if (status === "Unpaid") {
    actions.push(
      // {
      //   label: "Confirm Paid",
      //   icon: <Pencil className="w-5 h-5 text-yellow-500" />,
      //   onClick: (item) => handlePaid(item),
      //   ariaLabel: "Confirm Paid",
      //   title: "Confirm Paid",
      // },
      {
        label: "Partial Payment",
        icon: <DollarSign className="w-5 h-5 text-green-500" />,
        onClick: (row) => handlePartialPayment((row as Invoice).id),
        ariaLabel: "Record Partial Payment",
        title: "Partial Payment",
      },
      {
        label: "Delete",
        icon: <Trash2 className="w-5 h-5 text-red-500" />,
        onClick: (job) => handleDeleteUnpaidInvoice(job.id),
        ariaLabel: "Delete job",
        title: "Delete",
        disabled: (row) => (row as Invoice).status !== "Unpaid"
      },
      // {
      //   label: "Download Invoice",
      //   icon: <ArrowDownTrayIcon className="w-5 h-5 text-red-500" />,
      //   onClick: (invoice) => handleUnPaidInvoiceDownload(invoice.id),
      //   ariaLabel: "Download Invoice",
      //   title: "Download Invoice",
      // }
      {
  label: "Download Invoice",
  icon: <ArrowDownTrayIcon className="w-5 h-5 text-red-500" />,
  onClick: (invoice) => {
    if (invoice.status === "Unpaid") {
      handleUnPaidInvoiceDownload(invoice.id);
    } else if (invoice.status === "Partially Paid" ) {
      handleUnPaidInvoiceDownload(invoice.id);
    } else {
      console.warn("Unknown invoice status:", invoice.status);
    }
  },
  ariaLabel: "Download Invoice",
  title: "Download Invoice",
}

    );
  }
  if (status === "Paid") {
    
    actions.push({
      label: "View Payments",
      icon: <DollarSign className="w-5 h-5 text-green-500" />,
      onClick: (invoice) => handlePartialPayment((invoice as Invoice).id),
      ariaLabel: "View Payment Details", 
      title: "View Payments",
    },
    {
      label: "Download Invoice",
      icon: <ArrowDownTrayIcon className="w-5 h-5 text-red-500" />,
      onClick: (invoice) => handleUnPaidInvoiceDownload(invoice.id),
      ariaLabel: "Download Invoice",
      title: "Download Invoice",
    });
  }

  return actions;
};

const getCustomerJobActions = (
  router: AppRouterInstance,
  handleDelete: (id: string | number) => void,
  isDeleting: (item: Job) => boolean,
  handleView: (job: Job | Invoice) => void,
  handleEdit: (job: Job) => void,
  handleCustomerJobRemove: (job_id: number | null) => void,
  handleDeleteUnpaidInvoice: (invoice_id: number) => void,
  handlePartialPayment: (invoice_id: number) => void,
  status: string | undefined,
  paidOrUnpaidJobs: any[] | undefined
): EntityTableAction<JobOrInvoice>[] => {
  const actions: EntityTableAction<JobOrInvoice>[] = [];
  
  if (status === "Unpaid") {
    actions.push({
    label: "Delete",
    icon: <Trash2 className="w-5 h-5 text-red-500" />,
    onClick: (item: JobOrInvoice) => {
      // Safely extract id whether it's a Job or Invoice
      const jobId =
        typeof item === "object" && item && "id" in item ? item.id : undefined;
      if (jobId != null) handleCustomerJobRemove(jobId);
    },
    ariaLabel: "Delete job",
    title: "Delete",
    disabled: (row: JobOrInvoice) => {
      if ('invoice' in row) {
        // it's a Job - check the current invoice status from main data
        const currentInvoice = paidOrUnpaidJobs?.find(inv => inv.id === row.invoice_id);
        const invoiceStatus = currentInvoice?.status ?? row.invoice?.status ?? "";
        return invoiceStatus !== "Unpaid";
      } else {
        // it's an Invoice - check the invoice status directly
        return (row.status ?? "") !== "Unpaid";
      }
    }
  });
  }

  return actions;
};



const BillPage = () => {
  const router = useRouter();
  const { data: allCustomers = [], isLoading: isCustomersLoading, error: customersError } = useGetAllCustomers();
  const { updateJobAsync } = useJobs();
  const [selectedCustomerId, setSelectedCustomerId] = useState<null | number>(
    null
  );
  const {
    unbilledJobs,
    isLoading,
    error,
    paidOrUnpaidJobs,
    generateInvoice,
    updateInvoiceAsync,
    removeJob,
    unPaidInvoiceDownload,
    paidInvoiceDownload,
    deleteUnpaidInvoice,
    updateBillingState,
    billingState,
    clearFilters,
  } = useBills();
  // console.log("payu", paidOrUnpaidJobs);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPaidOpen, setConfirmPaidOpen] = useState(false);
  const [confirmCustomerRemoveOpen, setConfirmCustomerRemoveOpen] =
    useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingCustomerJobRemoveId, setpendingCustomerJobRemoveId] = useState<
    number | null
  >(null);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [unpaidExpandedInvoiceId, setUnpaidExpandedInvoiceId] = useState<
    number | null
  >(null);
  const [sortBy, setSortBy] = useState<string>("pickup_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tableFilters, setTableFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debouncedFilters = useDebounce(tableFilters, 300);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [editInvoice, setEditInvoice] = useState<{
    id: number | null;
    status: string;
  }>({ id: null, status: "Paid" });
  // Comment out edit modal state since edit functionality is removed for unbilled jobs
  // const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirmPaidModal, setShowConfirmPaidModal] = useState(false);
  // Comment out editJob state since edit functionality is removed for unbilled jobs
  // const [editJob, setEditJob] = useState<Job | null>(null);
  const [showConfirmCustomerRemoveModal, setShowConfirmCustomerRemoveModal] =
    useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [selectedInvoicesJobs, setSelectedInvoicesJobs] = useState<Job[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null); 
  const [formData, setFormData] = useState<JobFormData>(() => {
 
    const defaultValues: JobFormData | any = {
      customer_name: "",
      customer_email: null,
      customer_mobile: "",
      customer_reference: "",
      passenger_name: "",
      passenger_email: null,
      passenger_mobile: "",
      service_type: "Corporate Charter",
      service_id: 0,
      pickup_date: "",
      pickup_time: "",
      pickup_location: "",
      dropoff_location: "",
      vehicle_type: "",
      vehicle_number: "",
      driver_id: 0,
      payment_mode: "cash",
      status: "new",
      message: "",
      remarks: "",
      has_additional_stop: false,
      additional_stops: "",
      base_price: 0,
      base_discount_percent: 0,
      customer_discount_percent: 0,
      additional_discount_percent: 0,
      additional_charges: 0,
      final_price: undefined, // Remove this line
      invoice_number: "",
      sub_customer_id: undefined,
      sub_customer_name: "",
      locations: [],
      extra_services: [],
      customer_id: undefined,
      has_request: false,
      type_of_service: "",
    };
    // If we have job data, merge it with defaults
    return defaultValues;
  });

  // inside BillPage component, near other state:
const tableRef = useRef<HTMLDivElement | null>(null);
const jumpToTable = () => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
const setTabAndScroll = (tab: "unbilled" | "Unpaid") => {
  handleTabChange(tab);
  setSelectedJobs([]);
  setTableFilters({});
  setSelectedCustomerId(null);
  setExpandedJobId(null);         
  setUnpaidExpandedInvoiceId(null);
  jumpToTable();
};

  // Delete Unpaid Invoice
  const [showConfirmUnPaidInvoiceModal, setShowConfirmUnPaidInvoiceModal] =
    useState(false);
  const [confirmUnPaidInvoiceOpen, setConfirmUnPaidInvoiceOpen] =
    useState(false);
  const [unPaidInvoiceId, setUnPaidInvoiceId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTabChange = (value: string) => {
    setSelectedJobs([]);
    setSelectedCustomerId(null);
    setTableFilters({});
    // setSelectedInvoicesJobs([]);
    updateBillingState({
      currentTab: value,
      customer_id: null,
      pagination: { page: page, pageSize: pageSize },
      filters: {},
      selectedJobs: selectedJobs,
    });
  };

  const handleFilterChange = (col: string, value: string) => {
    setTableFilters((prev) => ({ ...prev, [col]: value }));
    setPage(1);
  };

  const handleClearFilter = (col: string) => {
    setTableFilters((prev) => ({ ...prev, [col]: "" }));
    setPage(1);
  };

  const handleDelete = (id: string | number) => {
    setPendingDeleteId(Number(id));
    setConfirmOpen(true);
  };
  

  const handleView = (job: Job | Invoice) => {
    // if("invoice_id" in job){
    //   setExpandedJobId(expandedJobId === job.invoice_id ? null : job.invoice_id);
    // }
    setExpandedJobId(expandedJobId === job.id ? null : job.id);
    console.log("unpaidExpanded", unpaidExpandedInvoiceId)
    setUnpaidExpandedInvoiceId(unpaidExpandedInvoiceId === job.id ? null : job.id)
  };
  
//   const handleView = (job: Job | Invoice) => {
//   const isExpanded = expandedJobId === job.id;
//   setExpandedJobId(isExpanded ? null : job.id);

//   // if it's an invoice row, load its jobs
//   if ("jobs" in job) {
//     setSelectedInvoicesJobs([]);
//   }
// };

  // Placeholder function for handleEdit since edit action is removed for unbilled jobs
  const handleEdit = (job: Job) => {
    // Edit functionality is intentionally disabled for unbilled jobs
    console.log("Edit functionality is disabled for unbilled jobs");
  };
  const handlePaid = (invoice: Invoice) => {
    setEditInvoice({ id: invoice.id, status: "Paid" });
    setConfirmPaidOpen(true);
    setShowConfirmPaidModal(true);
  };
   const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);  
  const handlePartialPayment = async (invoiceId: number) => {
  console.log("Recording Partial Payment for Invoice ID:", invoiceId);
  if (selectedInvoiceId !== null) return;
  try {
    const res = await axios.get(`/api/invoices/${invoiceId}`);
    console.log("Invoice data for partial payment:", res.data);
    setSelectedInvoiceId(invoiceId);
  } catch (err) {
    console.error("Error fetching invoice:", err);
    toast.error("Failed to fetch invoice details");
  }
};


const handleClosePartialPaymentModal = () => {
  setSelectedInvoiceId(null);
  console.log("Invalidating queries for refresh...");
};


  const handleInputChange = (field: keyof JobFormData, value: number) => {
    setFormData((prev: JobFormData) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Comment out handleSaveEdit since edit functionality is removed for unbilled jobs
  // const handleSaveEdit = async (updated: JobFormData) => {
  //   if (!editJob) return;
  //   try {
  //     await updateJobAsync({ id: editJob.id, data: updated });
  //     toast.success('Job updated successfully!');
  //     setShowEditModal(false);
  //     setEditJob(null);
  //   } catch (error) {
  //     toast.error((error as Error)?.message || "Failed to update job");
  //   }
  // };
  const handleUpdateInvoice = async () => {
    try {
      await updateInvoiceAsync(editInvoice);
      toast.success("Invoice updated successfully");
      setShowConfirmPaidModal(false);
      // setEditJob(null);
      clearFilters();
      setTableFilters({});
      setSelectedCustomerId(null);
      setSelectedJobs([]);
      updateBillingState({
        currentTab: billingState.currentTab,
        customer_id: null,
        pagination: { page: page, pageSize: pageSize },
        filters: {},
        selectedJobs: selectedJobs,
        refreshKey: Date.now(),
      });
    } catch (error) {
      console.log("error", error);

      toast.error((error as Error)?.message || "Failed to update invoice");
    }
  };

  // Comment out handleCancelEdit since edit functionality is removed for unbilled jobs
  // const handleCancelEdit = () => {
  //   setShowEditModal(false);
  //   setEditJob(null);
  // };

  const handleUnPaidInvoiceDownload = async (invoice_id: number) => {
    unPaidInvoiceDownload(invoice_id);
  };
  const handlePaidInvoiceDownload = async (invoice_id: number) => {
    paidInvoiceDownload(invoice_id);
  };

  const handleCustomerJobRemove = (id: number | null) => {
    if(id === null) return;
    console.log("handleCustomerJobRemove id", id);
    setpendingCustomerJobRemoveId(Number(id));
    setConfirmCustomerRemoveOpen(true);
    setShowConfirmCustomerRemoveModal(true);
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const confirmPaid = async () => {
    handleUpdateInvoice();
    setShowConfirmPaidModal(false);
  };
 const confirmCustomerJobRemove = async () => {
  try {
    console.log("Removing Job ID:", pendingCustomerJobRemoveId);
    // Wait for backend to confirm removal
    await removeJob(Number(pendingCustomerJobRemoveId));

    // Only update frontend if backend succeeds
    const updatedJobs = selectedInvoicesJobs.filter(
      (job: Job) => job.id !== pendingCustomerJobRemoveId
    );
    console.log("Updated Jobs after removal: ", updatedJobs);
    setSelectedInvoicesJobs(updatedJobs);
    setShowConfirmCustomerRemoveModal(false);
  } catch (error) {
    console.error("Failed to remove job:", error);
    alert("Failed to remove job. Please try again later.");
  }
};

//   const confirmCustomerJobRemove = async () => {
//   if (pendingCustomerJobRemoveId === null) return;
//   try {
//     await removeJob(pendingCustomerJobRemoveId); // ensure this is awaited
//     const updatedJobs = selectedInvoicesJobs.filter(
//       (job: Job) => job.id !== pendingCustomerJobRemoveId
//     );
//     setSelectedInvoicesJobs(updatedJobs);
//     setShowConfirmCustomerRemoveModal(false);
//     setpendingCustomerJobRemoveId(null);
//   } catch (err) {
//     console.error("Failed to delete job:", err);
//     toast.error("Failed to delete job. Please try again.");
//   }
// };

  // const confirmDelete = async () => {
  //   if (pendingDeleteId == null) return;
  //   setDeletingId(pendingDeleteId);
  //   setConfirmOpen(false);
  //   try {
  //     // await deleteJobAsync(pendingDeleteId);
  //   } catch (err) {
  //     // Error handled by react-query's onError and toast
  //   } finally {
  //     setDeletingId(null);
  //     setPendingDeleteId(null);
  //   }
  // };
  const handleJobSelection = (jobs: Job[]) => {
    setSelectedJobs(jobs);
  };
  // const handleInvoiceSelection = (jobs: Invoice[]) => {
  //   setSelectedInvoicesJobs(jobs);
  // }

  const isSameCustomer = useMemo(() => {
    const uniqueCustomerIds = [
      ...new Set(selectedJobs.map((job) => job.customer_id)),
    ];
    return uniqueCustomerIds.length === 1;
  }, [selectedJobs]);

// inside BillPage component
const queryClient = useQueryClient();

const handleGenerateInvoice = async () => {
  if (!isSameCustomer) {
    toast.error("Selected jobs must be for the same customer.");
    return;
  }

  const finalPayload = {
    job_ids: selectedJobs.map((job) => job.id),
    customer_id: selectedJobs[0]?.customer_id || null,
  };

  try {
    setIsGenerating(true);
    await generateInvoice(finalPayload);
   
    await Promise.all([
  // billing lists
  queryClient.invalidateQueries({ queryKey: ["unbilled"] }),         
  queryClient.invalidateQueries({ queryKey: ["paidOrUnpaidJobs"] }),  
  queryClient.invalidateQueries({ queryKey: ["jobs"], refetchType: "active" }),
]);

    // UI cleanup
    setExpandedJobId(null);
    setSelectedCustomerId(null);
    setSelectedJobs([]);

    updateBillingState({
      currentTab: "unbilled",
      customer_id: null,
      pagination: { page, pageSize },
      filters: { ...tableFilters },
      selectedJobs: [],
      refreshKey: Date.now(), // keep if your hook reads it in query key
    });

    // toast.success("Invoice generated successfully");
  } catch (error: any) {
    toast.error(error?.message || "Failed to generate invoice");
  } finally {
    setIsGenerating(false);
  }
};


  // Delete Unpaid Invoice
  const handleDeleteUnpaidInvoice = (id: string | number) => {
    setUnPaidInvoiceId(Number(id));
    setConfirmUnPaidInvoiceOpen(true);
    setShowConfirmUnPaidInvoiceModal(true);

  };

  const confirmUnpaidInvoiceDelete = async () => {
    deleteUnpaidInvoice(unPaidInvoiceId);
    setShowConfirmUnPaidInvoiceModal(false);
  };
  
// const invoice: Invoice = {
//   id: 1,
//   customer_id: 123,
//   date: "2025-08-29",
//   status: "Unpaid",
//   total_amount: 1000,
//   jobs: [
//     { id: 11, customer_id: 123, service_type: "Taxi" } as Job, // Example Job
//   ],
//   customer_name: "John Doe",
// };

// Your selection handler
// const [paidJobs, setPaidJobs] = useState<Job[]>([]);
// paidOrUnpaidJobs?.forEach((invoice: Job) => {
//   if (invoice && Array.isArray(invoice)) {
//     invoice.forEach((job) => { job.invoice_id = invoice.id; });
//     setPaidJobs((prev) => [...prev, ...invoice]);
//     console.log("Processed jobs for invoice:", invoice.id, invoice);
//     console.log("Current paidJobs state:", paidJobs);
//   }});

// const handleOnSelectionRow = (jobs: Invoice[] | Job | Job[] | undefined) => {
//   if (!jobs) return;

//   const jobsArray = Array.isArray(jobs) ? jobs : [jobs];

//   console.log("Selected Rows: ", jobsArray);
  
//   const updatedJobs = jobsArray.map((job) => {
//   const customer = allCustomers.find((c) => c.id === job.customer_id);
//     return {
//       ...job,
//       customer_id: job.customer_id,
//       invoice_id: job.invoice_id || job.id,
//       status: job.status,
//       // date: new Date(job.date).toISOString().split('T')[0],
//       // remaining_amount: job.remaining_amount,
//       customer_name: customer?.name || "",
//     };
//   });
//   console.log("Updated Jobs with Customer Names: ", updatedJobs);
//   console.log('updatedJobs type:', typeof updatedJobs, Array.isArray(updatedJobs) ? 'array' : 'not an array');
//   setSelectedInvoicesJobs(updatedJobs);
// };
// const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>([]);
const handleOnSelectionRow = useCallback((jobs: any[]) => {
  const updatedJobs = (jobs || []).map((job) => {
  const customer = allCustomers.find((c) => c.id === job.customer_id);
  console.log("job in selection", job, job.invoice?.remaining_amount);
    return {
      ...job,
      customer_name: customer?.name || "Unknown Customer",
      customer_id: job.invoice?.customer_id || job.customer_id,
      invoice_id: job.invoice.id || job.id,
      invoice: {
        ...job.invoice,
        status: job.invoice?.status || "Unpaid"
      },
      date: new Date(job.invoice?.date).toISOString().split('T')[0],
      total_amount: `$${job.final_price.toFixed(2)}`,
      // remaining_amount: `$${(job.invoice?.remaining_amount)}`,
    };
  });
//  setSelectedRowIds(updatedJobs.map((j) => j.id));
  setSelectedInvoicesJobs(updatedJobs);
}, [allCustomers]);





// const handleOnSelectionRow = (jobs: Job[]) => {
//   if (!jobs || !Array.isArray(jobs)) {
//     setSelectedInvoicesJobs([]);
//     return;
//   }

//   const updatedJobs = jobs.map((job) => {
//     if (!job) return null;
//     const customer = allCustomers.find((c) => c.id === job.customer_id);
//     return {
//       ...job,
//       customer_name: customer?.name || "Unknown Customer",
//     };
//   }).filter(Boolean) as Job[];

//   setSelectedInvoicesJobs(updatedJobs);
// };

  // Utility to get date range for the last 3 months
const getPastThreeMonths = (currentDate: Date) => {
  const months = [];
  for (let i = 0; i < 3; i++) {
    const month = subMonths(currentDate, i);
    months.push({
      label: format(month, "MMMM yyyy"), // e.g., "August 2025"
      value: format(month, "yyyy-MM"), // e.g., "2025-08"
      start: startOfMonth(month),
      end: endOfMonth(month),
    });
  }
  return months;
};


  // Apply filters to bills
  // const jobsWithCustomerName = (
  //   billingState.currentTab === "unbilled"
  //     ? unbilledJobs ?? []
  //     : paidOrUnpaidJobs ?? []
  // ).map((job) => {
  //   const customer = allCustomers.find((c) => c.id === job.id);
  //   console.log(customer)
  //   console.log("paidOrUnpaidJobsfu",paidOrUnpaidJobs)
  //   return {
  //     ...job,
  //     customer_id: job.customer_id,
  //     customer_name: customer?.name || "",
  //     invoice_id: job.invoice_id || job.id,
  //     status: job.status,
  //     // remaining_amount: job.remaining_amount,
  //     total_amount: job.total_amount,

  //   };
  // });

   const jobsWithCustomerName = (
    billingState.currentTab === "unbilled"
      ? unbilledJobs ?? []
      : paidOrUnpaidJobs ?? []
  ).map((job) => {
    const customer = allCustomers?.find((c) => c.id === job.customer_id);
    console.log("paidOrUnpaidJobs1", job, job.remaining_amount_invoice, job.remaining_amount);

    return {
      ...job,
      job_id: job.id,
      customer_name: customer?.name || "",
      invoice_id: job.invoice_id || job.id,
      status: job.status,
      total_amount: job.total_amount,
      remaining_amount: job.remaining_amount_invoice ?? 0.00 ,   //remaining_amount: job.remaining_amount_invoice ?? 0.00,
      date: job.date,
    };
  }) ?? [];



console.log("jobsWithCustomerName", jobsWithCustomerName);


const filteredJobs = jobsWithCustomerName.filter((job) => {
  let monthMatch = true;

  if (billingState.currentTab !== "unbilled" && selectedMonth) {
    const selectedMonthData = getPastThreeMonths(new Date()).find(
      (m) => m.value === selectedMonth
    );
    if (selectedMonthData && job.date) {
      try {
        const jobDate = new Date(job.date);
        if (!isNaN(jobDate.getTime())) {
          monthMatch =
            jobDate >= selectedMonthData.start && jobDate <= selectedMonthData.end;
        } else {
          console.warn(`Invalid date for invoice ${job.invoice_id}:`, job.date);
          monthMatch = true; // keep invalid dates
        }
      } catch (e) {
        console.warn(`Error parsing date for invoice ${job.invoice_id}:`, job.date, e);
        monthMatch = true;
      }
    }
  }

  const customerMatch =
    selectedCustomerId == null || job.customer_id === selectedCustomerId;

  const filterMatch = Object.entries(debouncedFilters).every(
    ([col, val]) =>
      !val || String(job[col] ?? "").toLowerCase().includes(val.toLowerCase())
  );

  let statusMatch = true;
  if (billingState.currentTab === "Unpaid") {
    statusMatch = job.status === "Unpaid" || job.status === "Partially Paid";
  } else if (billingState.currentTab === "Paid") {
    statusMatch = job.status === "Paid";
  }
  // If "unbilled" → skip filtering by status (already handled above)

  console.log(`Filtering job ${job.invoice_id}:`, {
    monthMatch,
    customerMatch,
    filterMatch,
    statusMatch,
    job,
  });

  return monthMatch && customerMatch && filterMatch && statusMatch;
});

const showResetFilter = filteredJobs.length === 0 && (selectedCustomerId !== null || Object.keys(debouncedFilters).length > 0);

  // Sort jobs
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
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

  const handleCustomerChange = (value: number) => {
    setSelectedCustomerId(Number(value));
    updateBillingState({
      currentTab: billingState.currentTab,
      customer_id: value,
      pagination: { page: page, pageSize: pageSize },
      filters: { ...tableFilters },
      selectedJobs: selectedJobs,
    });
  };


const useCompletedCount = () =>{
  return useQuery({
    queryKey: ["completedCount"],
    queryFn: async () => {
      const res = await axios.get("/api/jobs/unbilled");
      return res?.data?.total ?? 0;
    },
    refetchInterval: 5000, // auto-poll every 5s
  });
}

const { data: completedCount = 0 } = useCompletedCount();

  const SelectField: React.FC<{
    label: string;
    value: string | number | undefined;
    onChange: (value: string) => void;
    options: { value: string | number; label: string }[];
    required?: boolean;
    error?: string;
    className?: string;
  }> = ({
    label,
    value,
    onChange,
    options,
    required,
    error,
    className = "",
  }) => (
    <div className={`space-y-1 flex ${className}`}>
      <label className="block text-sm font-medium text-gray-300 m-auto whitespace-nowrap">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <select
        value={selectedCustomerId ?? ""}
        onChange={(e) => handleCustomerChange(Number(e.target.value))}
        className={`
            w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ms-2
            ${error ? "border-red-500" : ""}
          `}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.value === ""}
            className="bg-gray-700"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );

  // customer filtering logic

  // Build customer “chips” with counts for the current tab’s dataset
type Status = "Unpaid" | "Partially Paid" | "Paid" | (string & {});
type SortMode = "count" | "alpha";
const [chipSort, setChipSort] = useState<SortMode>("count");

type CustCounts = {
  name: string;
  total: number;    // all rows for this customer (good for "unbilled" view)
  unpaid: number;   // strictly Unpaid
  partial: number;  // Partially Paid 
};

// 1) One-pass aggregation over rows (only when data changes)
const countsByCustomer = useMemo(() => {
  const rows = jobsWithCustomerName ?? [];
  const m = new Map<number, CustCounts>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cid = r?.customer_id;
    if (!cid) continue;

    let entry = m.get(cid);
    if (!entry) {
      entry = {
        name: r.customer_name || "Unknown",
        total: 0,
        unpaid: 0,
        partial: 0,
      };
      m.set(cid, entry);
    }

    // count all rows for this customer (for "unbilled" tab usage)
    entry.total += 1;

    // bucket by status for invoice tabs
    const s = (r.status as Status) || "";
    if (s === "Unpaid") entry.unpaid += 1;
    else if (s === "Partially Paid") entry.partial += 1;
  }

  return m;
}, [jobsWithCustomerName]);

// 2) Stable alphabetical order computed once per data change
const sortedCustomers = useMemo(() => {
  const arr = Array.from(countsByCustomer, ([id, c]) => ({ id, name: c.name }));
  arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
}, [countsByCustomer]);

// 3) Cheap chip list for the current tab (no scanning jobs)
const customerChips = useMemo(() => {
  const pickCount = (c: CustCounts) => {
    const tab = billingState.currentTab;
    if (tab === "unbilled") return c.total;
    if (tab === "Unpaid")   return c.unpaid + c.partial;
    return c.total;
  };

  const arr = sortedCustomers.map(({ id, name }) => {
    const c = countsByCustomer.get(id)!;
    return { id, name, count: pickCount(c) };
  });
   arr.sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
   return arr
}, [sortedCustomers, countsByCustomer, billingState.currentTab]);

const totalCustomers = customerChips.length;


// card components css
type Tone = "green" | "blue" | "pink" | "yellow" | "red";

const toneMap: Record<Tone, string> = {
  green:  "from-emerald-700 to-emerald-600",
  blue:   "from-sky-700 to-sky-600",
  pink:   "from-fuchsia-700 to-fuchsia-600",
  yellow: "from-amber-600 to-amber-500",
  red:    "from-rose-600 to-rose-500",
};

const Card: React.FC<{
  title: string;
  value: React.ReactNode;      // allow number OR string
  sub?: string;
  tone: Tone;
  onClick?: () => void;        // make it clickable
  active?: boolean;            // highlight when current
  className?: string;
}> = ({ title, value, sub, tone, onClick, active, className }) => {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      className={classNames(
        "rounded-xl p-5 text-white bg-gradient-to-br shadow-lg select-none transition",
        "focus:outline-none hover:brightness-110",
        // equal, neutral outline so blue ≈ pink visually
        active ? "ring-2 ring-white/25" : "ring-1 ring-white/10",
        toneMap[tone],
        className
      )}
    >
      <div className="text-sm/5 opacity-90">{title}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-xs/5 mt-1 opacity-80">{sub}</div> : null}
    </div>
  );
};


  // Pagination logic
  const total = sortedJobs.length;
  const paginatedJobs = sortedJobs.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

   const clientSideCounts = useMemo(() => {
  if (billingState.currentTab !== "unbilled") {
    let unpaid = 0;
    let partiallyPaid = 0;
    let paid = 0;

    const jobsToCount = selectedMonth ? filteredJobs : jobsWithCustomerName; // Use all jobs if no month selected

    jobsToCount.forEach((job) => {
      if (job.status === "Unpaid" || job.status === "Partially Paid") unpaid += 1;
      if (job.status === "Paid") paid += 1;
      if (job.status === "Partially Paid") partiallyPaid += 1; // Count Partially Paid as well
    });

    return { Unpaid: unpaid, Paid: paid , PartiallyPaid: partiallyPaid};
  }
  return null;
}, [filteredJobs, jobsWithCustomerName, billingState.currentTab, selectedMonth]);

  if (error) return <div>Failed to load jobs. Error: {error.message}</div>;

  return (
    <BillingErrorBoundary>
        <div className="max-w-7xl mx-auto px-2 py-6 w-full flex flex-col gap-4">
        {/* Updated header without Generate Invoice button */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Payment Management</h1>
          {billingState.currentTab === "unbilled" && (
            <div className="text-sm text-text-secondary">
              {/* Button moved to table header */}
            </div>
          )}
        </div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Jobs Not Invoiced */}
  <CountFetcher
    apiUrl="/api/jobs/unbilled"
    render={(counts) => (
      <Card
        tone="blue"
        title="Jobs Not Invoiced"
        value={counts?.total ?? 0}
        sub="Awaiting invoice"
        onClick={() => setTabAndScroll("unbilled")}
        active={billingState.currentTab === "unbilled"}
      />
    )}
  />

  {/* Invoice Pending Payments (Unpaid + Partially Paid) */}
  <CountFetcher
    apiUrl="/api/invoices/unpaid"
    statusFilter={["Unpaid", "Partially Paid"]}
    render={(fc) => (
      <Card
        tone="red"
        title="Invoice Pending Payments"
        value={(fc?.Unpaid ?? 0) + (fc?.["Partially Paid"] ?? 0)}
        sub="Unpaid + Partially Paid"
        onClick={() => setTabAndScroll("Unpaid")}
        active={billingState.currentTab === "Unpaid"}
      />
    )}
  />
</div>



{/* Customer filter chips bar */}
<div className="bg-background pt-2 pb-2 px-4 rounded-t-xl">
  <div className="flex items-center justify-between gap-2 mb-2">
    <h2 className="text-sm font-semibold text-white/80">Filter by Customer</h2>
  </div>

  {/*
    Show at most 2 rows * 8 cols = 16 cells total.
    We reserve 1 cell for "All Customers", so show up to 15 customers.
  */}
  {(() => {
    const PER_ROW = 8;
    const MAX_ROWS = 2;
    const MAX_VISIBLE_CUSTOMERS = PER_ROW * MAX_ROWS - 1; // minus "All Customers"
    const cappedChips = customerChips.slice(0, MAX_VISIBLE_CUSTOMERS);

    return (
      <div className="grid grid-cols-8 gap-1.5">
        {/* All Customers cell */}
        <button
          onClick={() => {
            setSelectedCustomerId(null);
            setTableFilters({});
          }}
          className={`w-full px-2 py-3 min-h-12
            flex flex-col items-center justify-center text-center gap-0.5
            rounded-lg border transition break-words
            ${selectedCustomerId == null
              ? "bg-primary text-white border-primary"
              : "bg-background-light text-white/90 border-border-color hover:bg-primary/30"}`}
        >
          <span className="text-[13px] font-medium leading-tight">All Customers</span>
          <span className="text-xs opacity-70 mt-0.5">({totalCustomers})</span>
        </button>

        {/* Up to 15 customers so total = 16 cells (2 rows x 8 cols) */}
        {cappedChips
        .filter((c) => {
    const count = Number(c.count) || 0;
    console.log(`Customer ${c.name}: count=${count}, type=${typeof c.count}`); // Debug logging
    return count > 0;
  })
        .map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedCustomerId(c.id);
              setTableFilters({});
            }}
            title={c.name}
            className={`w-full px-2 py-3 min-h-12
              flex flex-col items-center justify-center text-center gap-0.5
              rounded-lg border transition break-words
              ${selectedCustomerId === c.id
                ? "bg-primary text-white border-primary"
                : "bg-background-light text-white/90 border-border-color hover:bg-primary/30"}`}
          >
            <span className="text-[13px] font-medium leading-tight">{c.name}</span>
            <span className="text-xs opacity-70 mt-0.5">({c.count})</span>
          </button>
        ))}
      </div>
    );
  })()}
</div>


        
        <div className="flex items-center justify-between mb-2">
          {billingState.currentTab === "unbilled" ? (
            <div className="text-sm text-text-secondary">
              Showing {total === 0 ? 0 : startIdx}-{endIdx} of {total} jobs
            </div>
          ) : (
            <div className="text-sm text-text-secondary">
              Showing {total === 0 ? 0 : startIdx}-{endIdx} of {total} jobs
            </div>
          )}
          <div className="flex items-center gap-2">
            {showResetFilter && (
              <button 
                onClick={() => {
                  clearFilters();
                  setTableFilters({});
                  setSelectedCustomerId(null);
                  setSelectedJobs([]);
                  setExpandedJobId(null);
                  setUnpaidExpandedInvoiceId(null);
                }}
                className="ml-4 text-blue-400 hover:text-blue-300 underline"
              >
                Reset filters
              </button>
            )}
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


        <div className="flex-grow rounded-xl shadow-lg bg-background-light border border-border-color overflow-hidden">
          <div className="w-full overflow-x-auto md:overflow-x-visible">
            {billingState.currentTab === "unbilled" ? (
              <JobEntityTable
                columns={unBillColumns.map((col) => ({
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
                  // Custom filter for customer_name column
                  renderFilter: (value: string, onChange: (v: string) => void) => {
                    if (col.accessor === 'customer_name') {
                      return (
                        <div className="relative flex items-center">
                          <select
                            className="w-full bg-background-light border-border-color text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary rounded px-2 py-1 text-xs mt-1 pr-6"
                            value={value}
                            onChange={e => onChange(e.target.value)}
                          >
                            <option value="">All Customers</option>
                            {isCustomersLoading ? (
                              <option value="">Loading customers...</option>
                            ) : (
                              allCustomers.map(customer => (
                                <option key={customer.id} value={customer.name}>
                                  {customer.name}
                                </option>
                              ))
                            )}
                          </select>
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
                      );
                    }
                    
                    // Default filter for other columns
                    return (
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
                    );
                  },
                }))}
                data={paginatedJobs}
                isLoading={isLoading}
                actions={getBillActions(
                  router,
                  handleDelete,
                  (job: Job) => deletingId === job.id,
                  handleView,
                  handleEdit,
                  handlePaid,
                  handleUnPaidInvoiceDownload,
                  handlePaidInvoiceDownload,
                  handleDeleteUnpaidInvoice,
                  handlePartialPayment,
                  billingState.currentTab
                )}
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
                total={total}
                onPageChange={setPage}
                showGenerateInvoice={true}
                onGenerateInvoice={handleGenerateInvoice}
                isGenerateInvoiceDisabled={!isSameCustomer || selectedJobs.length === 0}
                generateInvoiceTooltip={selectedJobs.length === 0 
                  ? "Please select one or more jobs to generate an invoice" 
                  : "Please select jobs from the same customer to generate an invoice"}
              />
            ) : (
              <JobEntityTable
                columns={unPaidColumns.filter(col => !(billingState.currentTab === "Paid" && col.accessor === "remaining_amount_invoice"))
                  .map(
                  (col) => ({
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
                  // Custom filter for customer_name column
                  renderFilter: (value: string, onChange: (v: string) => void) => {
                    if (col.accessor === 'customer_name') {
                      return (
                        <div className="relative flex items-center">
                          <select
                            className="w-full bg-background-light border-border-color text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary rounded px-2 py-1 text-xs mt-1 pr-6"
                            value={value}
                            onChange={e => onChange(e.target.value)}
                          >
                            <option value="">All Customers</option>
                            {isCustomersLoading ? (
                              <option value="">Loading customers...</option>
                            ) : (
                              allCustomers.map(customer => (
                                <option key={customer.id} value={customer.name}>
                                  {customer.name}
                                </option>
                              ))
                            )}
                          </select>
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
                      );
                    }
                    
                    // Default filter for other columns
                    return (
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
                    );
                  },
                }))}
                data={paginatedJobs}
                isLoading={isLoading}
                actions={getBillActions(
                  router,
                  handleDelete,
                  (job: Job) => deletingId === job.id,
                  handleView,
                  handleEdit,
                  handlePaid,
                  handleUnPaidInvoiceDownload,
                  handlePaidInvoiceDownload,
                  handleDeleteUnpaidInvoice,
                  handlePartialPayment,
                  billingState.currentTab
                )}
                onSelectionChange={handleJobSelection}
                renderExpandedRow={(job) => (
                  <div className="py-6 px-8">
                    <CustomerJobEntityTable
                      columns={customerColumns.map((col) => ({
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
                              placeholder={`Filter ${(
                                col.stringLabel || col.accessor
                              )
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
                      }))}
                      data={selectedInvoicesJobs}
                      isLoading={isLoading}
                      actions={getCustomerJobActions(
                        router,
                        handleDelete,
                        (job: Job) => deletingId === job.id,
                        handleView,
                        handleEdit,
                        handleCustomerJobRemove,
                        handleDeleteUnpaidInvoice,
                        handlePartialPayment,
                        billingState.currentTab,
                        paidOrUnpaidJobs
                      )}
                      rowClassName={(invoice) =>
                        expandedJobId === invoice.customer_id ? "bg-primary/10" : ""
                      }
                      onRowClick={handleView}
                      expandedRowId={expandedJobId}
                      page={page}
                      pageSize={pageSize}
                      total={total}
                      onPageChange={setPage}
                      filters={tableFilters}
                      onFilterChange={handleFilterChange}
                    />
                  </div>
                )}
                rowClassName={(job) =>
                  expandedJobId === job.id ? "bg-primary/10" : ""
                }
                onRowClick={handleView}
                expandedRowId={unpaidExpandedInvoiceId}
                filters={tableFilters}
                onFilterChange={handleFilterChange}
                onSelectionRow={handleOnSelectionRow}
                selectedRowIds={selectedJobs.map(job => job.id)}
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={setPage}
                showGenerateInvoice={billingState.currentTab === "unbilled"}
                onGenerateInvoice={handleGenerateInvoice}
                isGenerateInvoiceDisabled={!isSameCustomer || selectedJobs.length === 0}
                generateInvoiceTooltip={selectedJobs.length === 0 
                  ? "Please select one or more jobs to generate an invoice" 
                  : "Please select jobs from the same customer to generate an invoice"}
              />
            )}
          </div>
        </div>
        {showConfirmPaidModal && (
          <ConfirmDialog
            open={confirmPaidOpen}
            title="Confirm Paid?"
            description="Are you sure you want to paid this invoice? This action cannot be undone."
            confirmLabel="Paid"
            cancelLabel="Cancel"
            onConfirm={confirmPaid}
            onCancel={() => {
              setConfirmPaidOpen(false);
              setPendingDeleteId(null);
            }}
          />
        )}
         {/* Render modal conditionally */}
      {selectedInvoiceId && (
        <PartialPaymentModal
          invoice={{ id: selectedInvoiceId }}
          onClose={handleClosePartialPaymentModal}
          onPaymentSuccess={() => {
           // setSelectedInvoicesJobs([]);
      // setSelectedInvoiceId(null);
      // setSelectedRowIds([]);
        updateBillingState({
          ...billingState,
          refreshKey: Date.now(),
        });
      }}
        />
      )}

        {showConfirmCustomerRemoveModal && (
          <ConfirmDialog
            open={confirmCustomerRemoveOpen}
            title="Remove Job?"
            description="Are you sure you want to remove this job? This action cannot be undone."
            confirmLabel="Remove"
            cancelLabel="Cancel"
            onConfirm={confirmCustomerJobRemove}
            onCancel={() => {
              setConfirmCustomerRemoveOpen(false);
              setpendingCustomerJobRemoveId(null);
            }}
          />
        )}
        {showConfirmUnPaidInvoiceModal && (
          <ConfirmDialog
            open={confirmUnPaidInvoiceOpen}
            title="Delete Invoice?"
            description="Are you sure you want to delete this invoice? This action cannot be undone."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={confirmUnpaidInvoiceDelete}
            onCancel={() => {
              setConfirmUnPaidInvoiceOpen(false);
              setUnPaidInvoiceId(null);
            }}
          />
        )}
        {/* <ConfirmDialog
          open={confirmOpen}
          title="Delete Job?"
          description="Are you sure you want to delete this job? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => {
            setConfirmOpen(false);
            setPendingDeleteId(null);
          }}
        /> */}
      </div>
    </BillingErrorBoundary>
  );
};

export default BillPage;