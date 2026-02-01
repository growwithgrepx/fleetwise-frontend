"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJobs } from '@/hooks/useJobs';
import { Job, JobFormData } from '@/types/job';
import { EntityTable, EntityTableColumn, EntityTableAction } from '@/components/organisms/EntityTable';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { Eye, RotateCcw, X, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import JobDetailCard from '@/components/organisms/JobDetailCard';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';
import { Input } from '@/components/atoms/Input';
import * as jobsApi from '@/services/api/jobsApi';
import { useCopiedJob } from '@/context/CopiedJobContext';
import { UpdateJobStatusModal } from '@/components/molecules/UpdateJobStatusModal';
import { useQueryClient } from '@tanstack/react-query';
import { jobKeys } from '@/hooks/useJobs';
import { useUser } from '@/context/UserContext';
import NotAuthorizedPage from '@/app/not-authorized/page';
// Column configuration for Jobs table (simple, filterable)
// Only Job ID, Customer, Status as requested
const columns: EntityTableColumn<Job & { stringLabel?: string }>[] = [
  { label: 'Job ID', accessor: 'id', filterable: true, stringLabel: 'Job ID', width: '80px' },
  { label: 'Customer', accessor: 'customer_name', filterable: true, stringLabel: 'Customer' },
  { label: 'Status', accessor: 'status', filterable: true, stringLabel: 'Status' },
];

// Row-level actions (view / cancel / re-instate / update status)
const getJobActions = (
  router: AppRouterInstance,
  handleView: (job: Job) => void,
  handleCancel: (job: Job) => void,
  handleReinstate: (job: Job) => void,
  handleUpdateStatus: (job: Job) => void,
): ((row: Job) => EntityTableAction<Job>[]) => {
  return (job: Job) => {
    const actions: EntityTableAction<Job>[] = [
      {
        label: 'View',
        icon: <Eye className="w-5 h-5 text-primary" />,
        onClick: handleView,
        ariaLabel: 'View job details',
        title: 'View',
      }
    ];
    
    // Show Update Status action for all jobs except those in terminal states (sd, jc)
    // This includes canceled jobs now
    if (job.status !== 'sd' && job.status !== 'jc') {
      actions.push({
        label: 'Update Status',
        icon: <RefreshCw className="w-5 h-5 text-blue-500" />,
        onClick: () => handleUpdateStatus(job),
        ariaLabel: 'Update job status',
        title: 'Update Status',
      });
    }
    
    // Only show Cancel action for non-canceled jobs
    if (job.status !== 'canceled') {
      actions.push({
        label: 'Cancel',
        icon: <X className="w-5 h-5 text-red-500" />,
        onClick: () => handleCancel(job),
        ariaLabel: 'Cancel job',
        title: 'Cancel',
      });
    }
    
    // Only show Re-instate action for canceled jobs
    if (job.status === 'canceled') {
      actions.push({
        label: 'Re-instate',
        icon: <RotateCcw className="w-5 h-5 text-green-500" />,
        onClick: () => handleReinstate(job),
        ariaLabel: 'Re-instate job',
        title: 'Re-instate',
      });
    }
    
    return actions;
  };
};

const ManageJobsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jobs, isLoading, error, updateFilters, filters, updateJobAsync, deleteJobAsync, cancelJobAsync, reinstateJobAsync } = useJobs();
  const { setCopiedJobData } = useCopiedJob();
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('pickup_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});
  const debouncedLocalFilters = useDebounce(localFilters, 500);
  const debouncedSearch = useDebounce(search, 500);

  // Update server-side filters when search or local filters change
  React.useEffect(() => {
    updateFilters({
      search: debouncedSearch,
      ...debouncedLocalFilters
    });
  }, [debouncedSearch, debouncedLocalFilters, updateFilters]);
  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
  const [jobToProcess, setJobToProcess] = useState<Job | null>(null);
  const [bulkCancelDialogOpen, setBulkCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updateStatusModalOpen, setUpdateStatusModalOpen] = useState(false);
  const [jobToUpdate, setJobToUpdate] = useState<Job | null>(null);
  const { user } = useUser();
  const role = (user?.roles?.[0]?.name || "guest").toLowerCase();
    

  // Cancellation reasons
  const cancellationReasons = [
    "Customer Request",
    "Driver Unavailable",
    "Operational Issue",
    "Entered in Error"
  ];

  // Update API filters when search or column filters change (debounced)
  // Merged into single effect to prevent race conditions where concurrent updates could overwrite each other
  React.useEffect(() => {
    updateFilters({
      search: debouncedSearch,
      ...debouncedLocalFilters
    });
  }, [debouncedSearch, debouncedLocalFilters, updateFilters]);

  const handleFilterChange = (col: string, value: string) => {
    // Update local state immediately (for UI responsiveness)
    setLocalFilters((prev) => ({ ...prev, [col]: value }));
    setPage(1);
  };

  const handleClearFilter = (col: string) => {
    // Clear local filter immediately
    setLocalFilters((prev) => ({ ...prev, [col]: '' }));
    setPage(1);
  };

  const handleView = (job: Job) => {
    setExpandedJobId(expandedJobId === job.id ? null : job.id);
  };

  const handleCancel = (job: Job) => {
    setJobToProcess(job);
    setCancelDialogOpen(true);
  };

  const handleReinstate = (job: Job) => {
    setJobToProcess(job);
    setReinstateDialogOpen(true);
  };

  const handleDelete = (id: string | number) => {
    setPendingDeleteId(Number(id));
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return;
    setDeletingId(pendingDeleteId);
    setConfirmOpen(false);
    try {
      await deleteJobAsync(pendingDeleteId);
    } catch (err) {
      // Error handled by react-query's onError and toast
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  };

  const handleCopy = async (job: Job) => {
    try {
      // Fetch the latest job data from the API to ensure we have up-to-date information
      const latestJob = await jobsApi.getJobById(job.id);
      
      // Check if we received valid job data
      if (!latestJob) {
        toast.error('Job not found - it may have been deleted');
        return;
      }
      
      // Use object destructuring to properly exclude the id field from the copied object
      const { id, ...jobCopyWithoutId } = latestJob;
      const jobCopy = {
        ...jobCopyWithoutId,
        // Clear date/time fields (require new user input)
        pickup_date: '',
        pickup_time: '',

        // Reset job status to default
        status: 'new' as const,

        // Reset invoice related fields
        invoice_id: null,
        invoice_number: undefined,

        // Reset financial fields
        penalty: 0,
        // Note: cash_collected field doesn't exist in Job interface, but if it did, it would be reset here

        // Reset vehicle assignment (keep vehicle_type/vehicle_type_id so form retains the selected type)
        vehicle_id: 0,
        driver_id: 0,
        // keep vehicle_type and vehicle_type_id from the fetched job so the new form is pre-filled
        driver_contact: '',

        // Preserve important fields that should be copied
        service_type: latestJob.service_type ?? latestJob.service?.name ?? '',
        customer_remark: latestJob.customer_remark ?? undefined,
        remarks: latestJob.customer_remark ?? undefined, // Ensure remarks are copied
        sub_customer_name: latestJob.sub_customer_name || '',
        booking_ref: latestJob.booking_ref || '',
      };
      
      // Ensure vehicle_type is a string when storing to context
      const vehicleTypeValue = typeof (jobCopy as any).vehicle_type === 'string'
        ? (jobCopy as any).vehicle_type
        : ((jobCopy as any).vehicle_type && (((jobCopy as any).vehicle_type.name) || ((jobCopy as any).vehicle_type.label))) || '';

      setCopiedJobData({ ...jobCopy, vehicle_type: vehicleTypeValue });
      
      toast.success('Job copied! Redirecting to new job form...');
      router.push('/jobs/new');
    } catch (apiError: any) {
      // Handle specific error cases with clearer user messaging
      if (apiError.response) {
        const status = apiError.response.status;
        if (status === 404) {
          toast.error('Job no longer exists and cannot be copied');
        } else if (status === 403) {
          toast.error('You do not have permission to copy this job');
        } else {
          toast.error(apiError.message || 'Failed to fetch job data for copying');
        }
      } else if (apiError.request) {
        // Network error - no response received
        toast.error('Network error - please check your connection and try again');
      } else {
        // Other error
        toast.error('Failed to fetch job data for copying');
      }
      return;
    }
  };

  const handleBulkCancel = () => {
    if (selectedJobs.length > 0) {
      setBulkCancelDialogOpen(true);
    }
  };

  const confirmCancel = async () => {
    if (!jobToProcess) return;
    
    try {
      await cancelJobAsync(jobToProcess.id, cancellationReason);
      
      toast.success('Job canceled successfully');
      setCancelDialogOpen(false);
      setJobToProcess(null);
      setCancellationReason('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to cancel job');
    }
  };

  const confirmReinstate = async () => {
    if (!jobToProcess) return;
    
    try {
      await reinstateJobAsync(jobToProcess.id);
      
      toast.success('Job re-instated successfully');
      setReinstateDialogOpen(false);
      setJobToProcess(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to re-instate job');
    }
  };

  const confirmBulkCancel = async () => {
    if (!cancellationReason) {
      toast.error('Please select a cancellation reason');
      return;
    }
    
    try {
      // Process all selected jobs
      const promises = selectedJobs.map(jobId => {
        return cancelJobAsync(jobId, cancellationReason);
      });
      
      await Promise.all(promises);
      
      toast.success(`${selectedJobs.length} job(s) canceled successfully`);
      setBulkCancelDialogOpen(false);
      setSelectedJobs([]);
      setCancellationReason('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to cancel jobs');
    }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const statusLabels: Record<string, string> = {
    new: 'New',
    pending: 'Pending',
    confirmed: 'Confirmed',
    otw: 'On The Way',
    ots: 'On The Spot',
    pob: 'Passenger On Board',
    jc: 'Job Completed',
    sd: 'Stand Down',
    canceled: 'Canceled'
  };

  const handleUpdateStatus = (job: Job) => {
    // Check if job can be updated - moved validation to parent
    // Never open modal for invalid jobs to prevent accessibility flicker
    if (job.status === 'sd' || job.status === 'jc') {
      toast.error(`Cannot update status for a job in ${statusLabels[job.status]} state.`);
      return;
    }
    
    if (job.status === 'canceled') {
      toast.error('Cannot update status for a canceled job. Please re-instate the job first.');
      return;
    }
    
    // For all other jobs, open the modal
    setJobToUpdate(job);
    setUpdateStatusModalOpen(true);
  };

  // Filter jobs to exclude jc and sd status jobs (server handles other filters)
  // Apply filters to jobs and exclude jc and sd status jobs
  // Note: Column filters and search are now handled by the API via updateFilters
  // Only client-side filtering is for excluding completed/stand-down jobs
  //
  // TECHNICAL DEBT: Client-side filtering creates O(n) performance overhead.
  // Ideally, status exclusion should be handled by the backend API via an 'exclude_status' parameter.
  // Current implementation loads all filtered jobs into memory before filtering out jc/sd statuses.
  // For datasets >10k jobs, consider moving this to the backend to reduce memory usage and improve performance.
  const filteredJobs = (jobs ?? []).filter(job =>
    // Exclude jobs with jc (completed) or sd (stand-down) status
    job.status !== 'jc' && job.status !== 'sd'
  );

  // TECHNICAL DEBT: Client-side sorting creates O(n log n) performance overhead.
  // Ideally, sorting should be handled by the backend API via 'sortBy' and 'sortDir' parameters.
  // Current implementation sorts all filtered jobs in memory before pagination.
  // For datasets >10k jobs, consider moving this to the backend.
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

  // Pagination logic
  const total = sortedJobs.length;
  const paginatedJobs = sortedJobs.slice((page - 1) * pageSize, page * pageSize);
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

   if (["customer","driver"].includes(role)) {
    return <NotAuthorizedPage />;
  }

  if (error) return <div>Failed to load jobs. Error: {error.message}</div>;

  return (<div>
    <div className="w-full flex flex-col gap-4 px-4 sm:px-6 py-4 sm:py-6 max-w-full">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main">Manage Jobs</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <AnimatedButton 
            onClick={handleBulkCancel}
            disabled={selectedJobs.length === 0}
            className="flex items-center justify-center w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-sm sm:text-base px-4 py-2 max-w-full sm:max-w-none"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel Selected ({selectedJobs.length})
          </AnimatedButton>
        </div>
      </div>
      <div className="w-full px-2 sm:px-0">
        <Input
          placeholder="Search jobs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-background-light border-border-color text-text-main max-w-md sm:max-w-lg md:max-w-xl w-full"
          aria-label="Search jobs"
        />
      </div>
      <div className="hidden md:flex items-center justify-end gap-2">
        <div className="text-sm text-text-secondary">
          Showing {total === 0 ? 0 : startIdx}-{endIdx} of {total} jobs
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-xs text-text-secondary whitespace-nowrap">Rows per page:</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="bg-background-light border-border-color text-text-main rounded px-2 py-1 text-xs min-w-[70px]"
          >
            {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
      </div> 
      <div className="flex-grow rounded-xl shadow-lg bg-background-light border border-border-color overflow-hidden flex flex-col">
        <div className="w-full flex-grow table-responsive">
          <div className="min-w-[700px]">
            <EntityTable
            columns={columns.map(col => ({
              ...col,
              label: (
                <span className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort(col.accessor as string)}>
                  {col.label}
                  {sortBy === col.accessor ? (
                    sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />
                  ) : null}
                </span>
              ),
              filterable: true,
              stringLabel: col.stringLabel,
              renderFilter: (value: string, onChange: (v: string) => void) => (
                <div className="relative flex items-center">
                  <input
                    type="text"
                    className="w-full bg-background-light border-border-color text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary rounded px-2 py-1 text-xs mt-1 pr-6"
                    placeholder={`Filter ${(col.stringLabel || col.accessor).toString().toLowerCase()}...`}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                  />
                  {value && (
                    <button
                      type="button"
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-text-secondary hover:text-red-500 text-xs"
                      onClick={() => handleClearFilter(col.accessor as string)}
                      tabIndex={-1}
                      aria-label="Clear filter"
                    >
                      ×
                    </button>
                  )}
                </div>
              ),
            }))}
            data={paginatedJobs}
            isLoading={isLoading}
            actions={getJobActions(router, handleView, handleCancel, handleReinstate, handleUpdateStatus)}
            renderExpandedRow={(job) => (
              <div className="py-6 px-8">
                <JobDetailCard job={job} />
              </div>
            )}
            rowClassName={(job) => {
              let classes = '';
              if (expandedJobId === job.id) classes += 'bg-primary/10 ';
              if (job.status === 'canceled') classes += 'opacity-70 ';
              return classes;
            }}
            onRowClick={handleView}
            expandedRowId={expandedJobId}
            filters={localFilters}
            onFilterChange={handleFilterChange}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onSelectionChange={(selectedIds) => setSelectedJobs(selectedIds.map(id => Number(id)))}
          />
        </div>
      </div>
    </div> 
      
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background-light rounded-xl shadow-2xl max-w-7xl w-full mx-4 p-6 relative">
            <button
              className="absolute top-4 right-4 text-text-secondary hover:text-text-main"
              onClick={() => setShowEditModal(false)}
              aria-label="Close edit modal"
            >
              &times;
            </button>
            <div className="text-lg font-bold text-text-main mb-4">Edit Job</div>
            <div className="border-t border-border-color pt-4">
              <p className="text-text-secondary">Editing job functionality would be implemented here.</p>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="px-4 py-2 rounded bg-background-light border border-border-color text-text-main hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={() => setShowEditModal(false)}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Cancel Single Job Dialog */}
      {cancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md mx-3 sm:mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto bg-background-light border border-border-color rounded-lg shadow-xl animate-fade-in" role="dialog" aria-modal="true">
            <h2 className="text-base sm:text-lg font-bold text-text-main mb-2">Cancel Job</h2>
            <p className="text-text-secondary mb-4">Are you sure you want to cancel this job? Please select a reason for cancellation.</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-main mb-2">Cancellation Reason</label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm transition-colors bg-background-light border-border-color text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Select a reason</option>
                {cancellationReasons.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto">
              <button
                className="px-4 py-2 rounded bg-background-light border border-border-color text-text-main hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
                onClick={() => { setCancelDialogOpen(false); setJobToProcess(null); setCancellationReason(''); }}
              >
                Close
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 w-full sm:w-auto"
                onClick={confirmCancel}
                disabled={!cancellationReason}
              >
                Cancel Job
              </button>
            </div> 
          </div>
        </div>
      )}
      
      {/* Re-instate Job Dialog */}
      <ConfirmDialog
        open={reinstateDialogOpen}
        title="Re-instate Job"
        description="Are you sure you want to re-instate this job? This will restore the job to its previous status."
        confirmLabel="Re-instate Job"
        cancelLabel="Close"
        onConfirm={confirmReinstate}
        onCancel={() => { setReinstateDialogOpen(false); setJobToProcess(null); }}
      />
      
      {/* Bulk Cancel Dialog */}
      {bulkCancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md mx-3 sm:mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto bg-background-light border border-border-color rounded-lg shadow-xl animate-fade-in" role="dialog" aria-modal="true">
            <h2 className="text-base sm:text-lg font-bold text-text-main mb-2">Cancel Selected Jobs</h2>
            <p className="text-text-secondary mb-4">Are you sure you want to cancel {selectedJobs.length} selected job(s)? Please select a reason for cancellation.</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-main mb-2">Cancellation Reason</label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm transition-colors bg-background-light border-border-color text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Select a reason</option>
                {cancellationReasons.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto">
              <button
                className="px-4 py-2 rounded bg-background-light border border-border-color text-text-main hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
                onClick={() => { setBulkCancelDialogOpen(false); setCancellationReason(''); }}
              >
                Close
              </button>
              <button
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 w-full sm:w-auto"
                onClick={confirmBulkCancel}
                disabled={!cancellationReason}
              >
                Cancel Jobs
              </button>
            </div> 
          </div> 
        </div>
      )}
      
      {/* Update Job Status Modal */}
      {updateStatusModalOpen && jobToUpdate && (
        <UpdateJobStatusModal
          job={jobToUpdate}
          isOpen={updateStatusModalOpen}
          onClose={() => {
            setUpdateStatusModalOpen(false);
            setJobToUpdate(null);
          }}
          onStatusUpdated={() => {
            // Instead of refreshing the entire page, just invalidate the queries
            // This will cause react-query to refetch the data
            // Broadly invalidate all 'jobs' queries to ensure data consistency
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            
            // Close the modal
            setUpdateStatusModalOpen(false);
            setJobToUpdate(null);
          }}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Job?"
        description="Are you sure you want to delete this job? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
      />  
    </div>  
  
    </div>
  ); 
};

export default ManageJobsPage;