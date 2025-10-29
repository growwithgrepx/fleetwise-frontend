"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useJobs } from '@/hooks/useJobs';
import { useQuery } from '@tanstack/react-query';
import * as jobsApi from '@/services/api/jobsApi';
import { api } from '@/lib/api';
import { useCopiedJob } from '@/context/CopiedJobContext';
import { Job, JobFormData, ApiJob } from '@/types/job';
import { safeStringValue } from '@/utils/jobNormalizer';
import { EntityTable, EntityTableColumn, EntityTableAction } from '@/components/organisms/EntityTable';
import { createStandardEntityActions } from '@/components/common/StandardActions';
import { EntityHeader } from '@/components/organisms/EntityHeader';
import { CreateJobFromTextModal } from '@/components/organisms/CreateJobFromTextModal';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { AnimatedButton } from "@/components/ui/AnimatedButton";

import { PlusCircle, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { Input } from '@/components/atoms/Input';
import { Tooltip } from '@radix-ui/react-tooltip';
import JobDetailCard from '@/components/organisms/JobDetailCard';
import { Eye, Pencil, Trash2, ArrowUp, ArrowDown, Copy } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import JobForm from '@/components/organisms/JobForm';
import toast from 'react-hot-toast';

import { parseJobText } from '@/utils/jobTextParser';

import { useUser } from '@/context/UserContext';
import NotAuthorizedPage from '@/app/not-authorized/page';


// Column configuration for Jobs table (simple, filterable)
const columns: EntityTableColumn<ApiJob & { stringLabel?: string }>[] = [
  { label: 'Job ID', accessor: 'id', filterable: true, stringLabel: 'Job ID', width: '80px' },
  { label: 'Customer', accessor: 'customer_name', filterable: true, stringLabel: 'Customer' },
  {
    label: 'Service',
    accessor: 'service_type',
    filterable: true,
    stringLabel: 'Service',
    render: (job: ApiJob) => {
      // Check for null explicitly since API returns service: null when not set
      // Use optional chaining and nullish coalescing for safe property access
      const serviceName = (job.service && job.service.name) ? job.service.name : (job.service_type ?? job.type_of_service);

      // Optional: Log missing data for debugging in development
      if (!serviceName && process.env.NODE_ENV === 'development') {
        console.warn('Missing service data for job:', job.id, job);
      }

      return <span>{serviceName || '-'}</span>;
    }
  },
  { label: 'Pickup', accessor: 'pickup_location', filterable: true, stringLabel: 'Pickup' },
  { label: 'Drop-off', accessor: 'dropoff_location', filterable: true, stringLabel: 'Drop-off' },
  { label: 'Pickup Date', accessor: 'pickup_date', filterable: true, stringLabel: 'Pickup Date' },
  { label: 'Pickup Time', accessor: 'pickup_time', filterable: true, stringLabel: 'Pickup Time' },
  // Removed Status column
];

// Row-level actions (view / edit / delete / copy)
const getJobActions = (
  router: AppRouterInstance,
  handleDelete: (id: number | string) => void,
  isDeleting: (item: ApiJob) => boolean,
  handleView: (job: ApiJob) => void,
  handleEdit: (job: ApiJob) => void,
  handleCopy: (job: ApiJob) => void,
): EntityTableAction<ApiJob>[] => [
  {
    label: 'View',
    icon: <Eye className="w-5 h-5 text-primary" />,
    onClick: handleView,
    ariaLabel: 'View job details',
    title: 'View',
  },
  {
    label: 'Edit',
    icon: <Pencil className="h-4 w-4 text-gray-600 dark:text-gray-300" />,
    onClick: (job) => handleEdit(job),
    ariaLabel: 'Edit job',
    title: 'Edit',
  },
  {
    label: 'Copy',
    icon: <Copy className="w-5 h-5 text-blue-500" />,
    onClick: (job) => handleCopy(job),
    ariaLabel: 'Copy job',
    title: 'Copy',
  },
  {
    label: 'Delete',
    icon: <Trash2 className="w-5 h-5 text-red-500" />,
    onClick: (job) => handleDelete(job.id),
    ariaLabel: 'Delete job',
    title: 'Delete',
    disabled: isDeleting,
  },
];

// Job status tabs for filtering the main jobs list
const jobStatuses = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'On The Way', value: 'otw' },
  { label: 'On Site', value: 'ots' },
  { label: 'On Board', value: 'pob' },
  { label: 'Completed', value: 'jc' },
  { label: 'Stand-Down', value: 'sd' },
  { label: 'Canceled', value: 'canceled' },
];

const JobsPage = () => {
  const router = useRouter();
  const { jobs, isLoading, error, updateFilters, deleteJobAsync, updateJobAsync, createJobAsync, filters } = useJobs();
  
  // Fetch all jobs without status filter for count calculation
  const { data: allJobsData } = useQuery({
    queryKey: ['jobs', 'all-status-counts'],
    queryFn: async () => {
      // Fetch all jobs with a large page size to get the full dataset
      const response = await api.get('/api/jobs/table?pageSize=10000');
      return response.data;
    },
  });
  
  // Fetch customers for customer filter buttons
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'list'],
    queryFn: async () => {
      const response = await api.get('/api/customers');
      return response.data;
    },
  });
  
  const allJobs = allJobsData?.items || [];
  const customers = customersData || [];
  
  // Calculate customer counts
  const customerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allJobs.forEach(job => {
      if (job.customer_name) {
        counts[job.customer_name] = (counts[job.customer_name] || 0) + 1;
      }
    });
    return counts;
  }, [allJobs]);
  
  // Sort customers by job count (descending)
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const countA = customerCounts[a.name] || 0;
      const countB = customerCounts[b.name] || 0;
      return countB - countA; // Descending order (max jobs first)
    });
  }, [customers, customerCounts]);
  
  // Filter customers to only show those with at least 1 job
  const filteredCustomers = useMemo(() => {
    return sortedCustomers.filter(customer => {
      const count = customerCounts[customer.name] || 0;
      return count > 0;
    });
  }, [sortedCustomers, customerCounts]);
  
  const { setCopiedJobData } = useCopiedJob();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [openCreateFromTextModal, setOpenCreateFromTextModal] = useState(false);
  const [sortBy, setSortBy] = useState<string>('pickup_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Local filter state for debouncing column filters before sending to API
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});
  const debouncedLocalFilters = useDebounce(localFilters, 500); // 500ms debounce for column filters
  const debouncedSearch = useDebounce(search, 500);

  // Version counter to cancel stale debounced filter updates (e.g., when user switches tabs)
  const filterVersionRef = React.useRef(0);

  // Standardized to 500ms to match localFilters debounce and prevent race conditions
  const debouncedFilters = useDebounce(filters, 500);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { user } = useUser();
  const role = (user?.roles?.[0]?.name || "guest").toLowerCase();

  // Update API filters when column filters change (debounced)
  // Not spreading filters to avoid stale closure bugs and infinite loops
  React.useEffect(() => {
    const currentVersion = filterVersionRef.current;
    const timeoutId = setTimeout(() => {
      // Only apply the update if version hasn't changed (no tab switch occurred)
      if (currentVersion === filterVersionRef.current) {
        updateFilters({
          ...debouncedLocalFilters
        });
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [debouncedLocalFilters, updateFilters]);

  // Update server-side filters when search or local filters change
  React.useEffect(() => {
    updateFilters({
      search: debouncedSearch,
      ...debouncedLocalFilters
    });
  }, [debouncedSearch, debouncedLocalFilters, updateFilters]);

  // Calculate status counts from all jobs, not filtered jobs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allJobs.forEach(job => {
      counts[job.status] = (counts[job.status] || 0) + 1;
    });

    // Calculate total count for "All" tab
    const totalCount = allJobs.length || 0;
    return { ...counts, all: totalCount };
  }, [allJobs]);

  const handleTabChange = (value: string) => {
    const statusValue = value === 'all' ? undefined : value;
    // Increment version to cancel any pending debounced filter updates
    filterVersionRef.current += 1;
    // Reset customer filter to "All Customers" when changing status filter

    setLocalFilters(prev => ({ ...prev, status: statusValue, customer_name: '' }));
  };

  // Immediate filter change (for button clicks like customer filter) - no debouncing
  const handleImmediateFilterChange = (col: string, value: string) => {
    updateFilters({ ...filters, [col]: value });
    setLocalFilters((prev) => ({ ...prev, [col]: value }));
    setPage(1);
  };

  // Debounced filter change (for text input in column filters)
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

  const handleDelete = (id: string | number) => {
    setPendingDeleteId(Number(id));
    setConfirmOpen(true);
  };

  const handleView = (job: Job) => {
    setExpandedJobId(expandedJobId === job.id ? null : job.id);
  };

  const handleEdit = (job: Job) => {
    setEditJob(job);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updated: JobFormData) => {
    if (!editJob) return;
    try {
      await updateJobAsync({ id: editJob.id, data: updated });
      toast.success('Job updated successfully');
      setShowEditModal(false);
      setEditJob(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update job');
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditJob(null);
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const handleCopy = async (job: Job) => {
    try {
      const latestJob = await jobsApi.getJobById(job.id);
      
      if (!latestJob) {
        toast.error('Job not found - it may have been deleted');
        return;
      }
      
      const { id, ...jobCopyWithoutId } = latestJob;
      
      // Use vehicle_type_name directly from the API response
      const vehicleTypeName = (latestJob as any).vehicle_type_name || '';
      
      console.log('[handleCopy] Using vehicle_type_name:', {
        vehicleTypeName,
        vehicle_type_id: (latestJob as any).vehicle_type_id
      });
      
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

        // Reset vehicle assignment
        vehicle_id: 0,
        driver_id: 0,
        // Use the vehicle_type_name string from API
        vehicle_type: vehicleTypeName,
        vehicle_type_id: (latestJob as any).vehicle_type_id,
        driver_contact: '',

        // Keep sub_customer_name and booking_ref from the original job
      };
      
      console.log('[handleCopy] Final jobCopy vehicle_type:', {
        value: jobCopy.vehicle_type,
        type: typeof jobCopy.vehicle_type
      });
      
      setCopiedJobData(jobCopy);
      
      toast.success('Job copied! Redirecting to new job form...');
      router.push('/jobs/new');
    } catch (apiError: any) {
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
        toast.error('Network error - please check your connection and try again');
      } else {
        toast.error('Failed to fetch job data for copying');
      }
    }
  };

  const handleCreateJobFromText = (text: string) => {
    const parseResult = parseJobText(text);
    if (parseResult.errors) {
      toast.error(parseResult.errors.join(', '));
      return;
    }
    setCopiedJobData(parseResult.data);
    router.push('/jobs/new');
    setOpenCreateFromTextModal(false);
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

  // Sort jobs (use server-filtered jobs directly)
  const sortedJobs = [...(jobs ?? [])].sort((a, b) => {
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

  if (error) return <div>Failed to load jobs. Error: {error.message}</div>;

  return (
    <div className="max-w-7xl mx-auto px-2 py-6 w-full flex flex-col gap-4">
     
     { !["driver"].includes(role) &&  (  <EntityHeader 
        title="Jobs" 
        onAddClick={() => router.push('/jobs/new')} 
        addLabel="Add Job"
        extraActions={
          <>
            <AnimatedButton onClick={() => router.push('/jobs/bulk-upload')} variant="outline" className="flex items-center">
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </AnimatedButton>
            <AnimatedButton onClick={() => setOpenCreateFromTextModal(true)} variant="outline" className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create from Text
            </AnimatedButton>
          </> 
        } 
        className="mb-4"
      /> 
      )}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-background pt-4 pb-4 rounded-t-xl">
        <div className="flex-1">
          <h3 className="font-bold text-text-main mb-3 px-4 py-2">Filter by status</h3>
          <div className="flex gap-2 w-full px-2">
            {jobStatuses.map((status) => (
              <button
                key={status.value}
                onClick={() => handleTabChange(status.value)}
                className={`px-3 py-2 rounded-lg text-sm transition-all flex-1 text-center flex flex-col items-center
                  ${(filters.status === status.value) || (status.value === 'all' && !filters.status)
                    ? 'bg-primary text-white shadow-lg' 
                    : 'bg-transparent text-text-main border border-border-color hover:border-primary'}`}
              >
                <span className="font-medium truncate max-w-full">{status.label}</span>
                <span className="text-xs bg-white/20 rounded-full px-2 py-1 mt-1">
                  {status.value === 'all' ? statusCounts.all || 0 : statusCounts[status.value] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      { !["customer", "driver"].includes(role) &&  (<div className="flex flex-col md:flex-row md:items-center gap-4 bg-background pt-4 pb-4 rounded-t-xl mt-4">
        <div className="flex-1">
          <h3 className="font-bold text-text-main mb-3 px-4 py-2">Filter by customer</h3>
          <div className="flex flex-wrap gap-2 px-4 max-h-[140px] overflow-hidden" style={{ maxWidth: '100%' }}>
            <button
              onClick={() => handleImmediateFilterChange('customer_name', '')}
              className={`px-2 py-2 rounded-lg text-sm transition-all min-w-[calc(12.5%-0.875rem)] flex-1 text-center flex flex-col items-center justify-center
                ${!filters.customer_name
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-transparent text-text-main border border-border-color hover:border-primary'}`}
              style={{ minWidth: 'calc(12.5% - 0.875rem)', flex: '1 1 calc(12.5% - 0.875rem)', maxWidth: 'calc(12.5% - 0.875rem)' }}
            >
              <span className="truncate w-full px-1">All Customers</span>
              <span className="text-xs bg-white/20 rounded-full px-2 py-1 mt-1">
                {allJobs.length || 0}
              </span>
            </button>
            {filteredCustomers.slice(0, 17).map((customer: any) => (
              <button
                key={customer.id}
                onClick={() => handleImmediateFilterChange('customer_name', customer.name)}
                className={`px-2 py-2 rounded-lg text-sm transition-all min-w-[calc(12.5%-0.875rem)] flex-1 text-center flex flex-col items-center justify-center
                  ${filters.customer_name === customer.name
                    ? 'bg-primary text-white shadow-lg' 
                    : 'bg-transparent text-text-main border border-border-color hover:border-primary'}`}
                style={{ minWidth: 'calc(12.5% - 0.875rem)', flex: '1 1 calc(12.5% - 0.875rem)', maxWidth: 'calc(12.5% - 0.875rem)' }}
              >
                <span className="truncate w-full px-1">{customer.name}</span>
                <span className="text-xs bg-white/20 rounded-full px-2 py-1 mt-1">
                  {customerCounts[customer.name] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div> )}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-text-secondary">
          Showing {total === 0 ? 0 : startIdx}-{endIdx} of {total} jobs
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-xs text-text-secondary">Rows per page:</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="bg-background-light border-border-color text-text-main rounded px-2 py-1 text-xs"
          >
            {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
      </div>
      <div className="flex-grow rounded-xl shadow-lg bg-background-light border border-border-color overflow-hidden">
        <div className="w-full overflow-x-auto md:overflow-x-visible">
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
            actions={getJobActions(router, handleDelete, (job: Job) => deletingId === job.id, handleView, handleEdit, handleCopy)}
            renderExpandedRow={(job) => (
              <div className="py-6 px-8">
                <JobDetailCard job={job} />
              </div>
            )}
            rowClassName={(job) => expandedJobId === job.id ? 'bg-primary/10' : ''}
            onRowClick={handleView}
            expandedRowId={expandedJobId}
            filters={localFilters}
            onFilterChange={handleFilterChange}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        </div>
      </div>
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-background-light rounded-xl shadow-2xl max-w-7xl w-full mx-4 p-6 relative">
            <button
              className="absolute top-4 right-4 text-text-secondary hover:text-text-main"
              onClick={handleCancelEdit}
              aria-label="Close edit modal"
            >
              &times;
            </button>
            <JobForm
              job={editJob!}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              isLoading={false}
            />
          </div>
        </div>
      )}
      <CreateJobFromTextModal
        isOpen={openCreateFromTextModal}
        onClose={() => setOpenCreateFromTextModal(false)}
        onSubmit={handleCreateJobFromText}
      />
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
  );
};

export default JobsPage;