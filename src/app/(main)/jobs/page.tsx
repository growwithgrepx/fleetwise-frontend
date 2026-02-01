"use client";

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJobs } from '@/hooks/useJobs';
import * as jobsApi from '@/services/api/jobsApi';
import { useCopiedJob } from '@/context/CopiedJobContext';
import { Job, JobFormData, ApiJob } from '@/types/job';
import { safeStringValue } from '@/utils/jobNormalizer';
import { EntityTable, EntityTableColumn, EntityTableAction } from '@/components/organisms/EntityTable';
import { createStandardEntityActions } from '@/components/common/StandardActions';
import { EntityHeader } from '@/components/organisms/EntityHeader';
import { CreateJobFromTextModal } from '@/components/organisms/CreateJobFromTextModal';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { PlusCircle, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { Input } from '@/components/atoms/Input';
import JobDetailCard from '@/components/organisms/JobDetailCard';
import { Eye, Pencil, Trash2, Copy } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import JobForm from '@/components/organisms/JobForm';
import toast from 'react-hot-toast';
import { parseJobText } from '@/utils/jobTextParser';
import { useUser } from '@/context/UserContext';
import NotAuthorizedPage from '@/app/not-authorized/page';

// Import refactored components and hooks
import { JobStatusTabs, type JobStatus } from '@/components/molecules/JobStatusTabs';
import { CustomerFilterButtons } from '@/components/molecules/CustomerFilterButtons';
import { useJobFiltering } from '@/hooks/useJobFiltering';
import { useJobSorting } from '@/hooks/useJobSorting';
import { useJobPagination } from '@/hooks/useJobPagination';
import { useJobDeletion } from '@/hooks/useJobDeletion';
import { useJobEditing } from '@/hooks/useJobEditing';
import { useJobsData } from '@/hooks/useJobsData';
import { useJobActions } from '@/hooks/useJobActions';
import { getJobTableColumns } from '@/lib/jobTableConfig';

// Job status configuration
const jobStatuses: JobStatus[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'On The Way', value: 'otw' },
  { label: 'On Site', value: 'ots' },
  { label: 'On Board', value: 'pob' },
  { label: 'Completed', value: 'jc' },
  { label: 'Stand-Down', value: 'sd' },
  { label: 'Canceled', value: 'canceled' }
];

const JobsPage = () => {
  const router = useRouter();
  const { jobs, isLoading, error, updateFilters, deleteJobAsync, updateJobAsync, filters } = useJobs();
  const { user } = useUser();
  const role = (user?.roles?.[0]?.name || "guest").toLowerCase();
  const isDriver = role === "driver";

  // ===== Use Refactored Hooks =====
  const {
    search,
    setSearch,
    localFilters,
    handleFilterChange,
    handleTabChange: handleStatusTabChange
  } = useJobFiltering();

  const {
    sortBy,
    sortDir,
    handleSort,
    getSortedJobs
  } = useJobSorting();

  const {
    page,
    pageSize,
    setPage,
    setPageSize,
    paginate
  } = useJobPagination(10);

  const {
    deletingId,
    setDeletingId,
    confirmOpen,
    setConfirmOpen,
    pendingDeleteId,
    handleDelete,
    handleCancelDelete,
    resetDeletion
  } = useJobDeletion();

  const {
    editJob,
    showEditModal,
    setShowEditModal,
    handleEdit,
    handleCancelEdit
  } = useJobEditing();

  const {
    filteredCustomers,
    statusCounts,
    customerCounts
  } = useJobsData(isDriver);

  const { setCopiedJobData } = useCopiedJob();
  const [openCreateFromTextModal, setOpenCreateFromTextModal] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);

  // ===== Debounced Filters =====
  const debouncedSearch = useDebounce(search, 300);
  const debouncedLocalFilters = useDebounce(localFilters, 500);

  useEffect(() => {
    updateFilters({
      search: debouncedSearch,
      ...debouncedLocalFilters
    });
  }, [debouncedSearch, debouncedLocalFilters, updateFilters]);

  // ===== Get Job Actions =====
  const jobActions = useJobActions({
    role,
    onView: (job: Job) => {
      setExpandedJobId(expandedJobId === job.id ? null : job.id);
    },
    onEdit: handleEdit,
    onDelete: handleDelete,
    onCopy: async (job: Job) => {
      try {
        const latestJob = await jobsApi.getJobById(job.id);
        if (!latestJob) {
          toast.error('Job not found - it may have been deleted');
          return;
        }
        
        const { id, ...jobCopyWithoutId } = latestJob;
        const jobCopy = {
          ...jobCopyWithoutId,
          status: 'new' as const,
          invoice_id: null,
          invoice_number: undefined,
          penalty: 0,
          vehicle_id: 0,
          driver_id: 0,
          driver_contact: '',
        };
        
        setCopiedJobData(jobCopy);
        toast.success('Job copied! Redirecting to new job form...');
        router.push('/jobs/new');
      } catch (apiError: any) {
        toast.error(apiError.response?.data?.error || 'Failed to copy job');
      }
    },
    isDeleting: (job: Job) => deletingId === job.id
  });

  // ===== Table Columns =====
  const columns = useMemo<EntityTableColumn<ApiJob & { stringLabel?: string }>[]>(
    () => getJobTableColumns(search),
    [search]
  );

  // ===== Handlers =====
  const handleTabChange = useCallback((value: string) => {
    const statusValue = value === 'all' ? undefined : value;
    handleStatusTabChange(statusValue);
  }, [handleStatusTabChange]);

  const handleImmediateFilterChange = useCallback((col: string, value: string) => {
    updateFilters({ ...filters, [col]: value });
    handleFilterChange(col, value);
    setPage(1);
  }, [filters, handleFilterChange, updateFilters]);

  const handleClearFilter = useCallback((col: string) => {
    handleFilterChange(col, '');
    setPage(1);
  }, [handleFilterChange]);

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return;
    setDeletingId(pendingDeleteId);
    setConfirmOpen(false);
    try {
      await deleteJobAsync(pendingDeleteId);
    } catch (err) {
      // Error handled elsewhere
    } finally {
      resetDeletion();
    }
  };

  const handleSaveEdit = async (updated: JobFormData) => {
    if (!editJob) return;
    try {
      await updateJobAsync({ id: editJob.id, data: updated });
      toast.success('Job updated successfully');
      setShowEditModal(false);
      handleCancelEdit();
    } catch (error: any) {
      console.error('Failed to update job:', error);
    }
  };

  const handleCreateJobFromText = (text: string) => {
    const parseResult = parseJobText(text);
    if (parseResult.errors) {
      toast.error(`Parse errors: ${parseResult.errors.join(', ')}`);
      return;
    }
    setCopiedJobData(parseResult.data);
    router.push('/jobs/new');
    setOpenCreateFromTextModal(false);
  };

  // ===== Process and Paginate Jobs =====
  const sortedJobs = getSortedJobs(jobs ?? []);
  const paginationInfo = paginate(sortedJobs);

  if (error) return <div>Error loading jobs</div>;
  if (["driver"].includes(role)) return <NotAuthorizedPage />;

  return (
    <div className="mx-auto px-4 py-6 w-full flex flex-col gap-4">
      {!["driver"].includes(role) && (
        <EntityHeader
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

      {/* Search Bar */}
      <div className="mb-4">
        <Input
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value.trim())}
          className="max-w-md"
        />
      </div>

      {/* Status Tabs */}
      <JobStatusTabs
        statuses={jobStatuses}
        counts={statusCounts}
        activeStatus={localFilters.status}
        onChange={handleTabChange}
      />

      {/* Customer Filter Buttons */}
      {!["customer", "driver"].includes(role) && (
        <CustomerFilterButtons
          customers={filteredCustomers}
          counts={customerCounts}
          selectedCustomer={localFilters.customer_name || ''}
          onChange={(customerName) => handleImmediateFilterChange('customer_name', customerName)}
        />
      )}

      {/* Pagination Info */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-text-secondary">
          Showing {paginationInfo.total === 0 ? 0 : paginationInfo.startIdx}-{paginationInfo.endIdx} of {paginationInfo.total}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-xs text-text-secondary">Rows per page:</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-background-light border border-border-color text-text-main rounded px-2 py-1 text-xs"
          >
            {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="flex-grow rounded-xl shadow-lg bg-background-light border border-border-color overflow-hidden flex flex-col">
        <div className="w-full flex-grow table-responsive">
          <div className="min-w-[900px]">
            <EntityTable
            data={paginationInfo.paginatedJobs}
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
                    className="w-full bg-background-light border border-border-color text-text-main placeholder-text-secondary focus:ring-2 focus:ring-primary rounded px-2 py-1 text-xs mt-1 pr-6"
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
            isLoading={isLoading}
            actions={jobActions}
            renderExpandedRow={(job) => (
              <div className="py-6 px-8">
                <JobDetailCard job={job} />
              </div>
            )}
            rowClassName={(job) => expandedJobId === job.id ? 'bg-primary/10' : ''}
            onRowClick={(job) => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
            expandedRowId={expandedJobId}
            filters={localFilters}
            onFilterChange={handleFilterChange}
          />
        </div>
      </div>

        {/* Page Navigation - Inside Table Container */}
        {paginationInfo.totalPages > 1 && (
          <div className="hidden md:flex items-center justify-end gap-1 py-4 border-t border-border-color px-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-2 py-1 text-sm rounded-lg font-medium transition-colors border border-border-color text-text-main hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &lt;
            </button>
            {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-2 py-1 text-sm rounded-lg font-medium transition-colors ${
                  pageNum === page
                    ? 'bg-primary text-white'
                    : 'border border-border-color text-text-main hover:border-primary'
                }`}
              >
                {pageNum}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(paginationInfo.totalPages, page + 1))}
              disabled={page === paginationInfo.totalPages}
              className="px-2 py-1 text-sm rounded-lg font-medium transition-colors border border-border-color text-text-main hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &gt;
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && editJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md sm:max-w-2xl mx-3 sm:mx-4 p-4 sm:p-6 max-h-[90vh] overflow-y-auto bg-background-light rounded-xl shadow-2xl relative">
            <button
              className="absolute top-4 right-4 text-text-secondary hover:text-text-main"
              onClick={handleCancelEdit}
              aria-label="Close edit modal"
            >
              &times;
            </button>
            <JobForm
              job={editJob}
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
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default JobsPage;
