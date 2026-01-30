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
    <div className="w-full flex flex-col gap-4 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-4 sm:py-6 max-w-full">
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
      <div className="mb-4 w-full max-w-lg">
        <Input
          placeholder="Search jobs..."
          value={search}
          onChange={(e) => setSearch(e.target.value.trim())}
          className="w-full"
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
        <div className="text-sm text-text-secondary">
          Showing {paginationInfo.total === 0 ? 0 : paginationInfo.startIdx}-{paginationInfo.endIdx} of {paginationInfo.total}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="pageSize" className="text-xs text-text-secondary whitespace-nowrap">Rows per page:</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-background-light border border-border-color text-text-main rounded px-2 py-1 text-xs min-w-[70px]"
          >
            {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="flex-grow rounded-xl shadow-lg bg-background-light border border-border-color overflow-hidden">
        <div className="w-full overflow-x-auto">
          <div className="min-w-full sm:min-w-0">
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
              }))}
              isLoading={isLoading}
              actions={jobActions}
              renderExpandedRow={(job) => (
                <div className="py-4 sm:py-6 px-4 sm:px-8">
                  <JobDetailCard job={job} />
                </div>
              )}
              rowClassName={(job) => expandedJobId === job.id ? 'bg-primary/10' : ''}
              onRowClick={(job) => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
              expandedRowId={expandedJobId}
            />
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      {paginationInfo.totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 mt-4 flex-wrap">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 min-w-[44px] flex items-center justify-center"
          >
            Previous
          </button>
          {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1)
            .filter(pageNum => 
              pageNum === 1 || 
              pageNum === paginationInfo.totalPages || 
              (pageNum >= page - 1 && pageNum <= page + 1)
            )
            .map((pageNum, index, arr) => {
              const showEllipsis = index > 0 && pageNum - arr[index - 1] > 1;
              return (
                <React.Fragment key={pageNum}>
                  {showEllipsis && (
                    <span className="px-2 py-2 text-sm text-text-secondary">...</span>
                  )}
                  <button
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors min-w-[44px] flex items-center justify-center ${
                      pageNum === page
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                </React.Fragment>
              );
            })}
          <button
            onClick={() => setPage(Math.min(paginationInfo.totalPages, page + 1))}
            disabled={page === paginationInfo.totalPages}
            className="px-3 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 min-w-[44px] flex items-center justify-center"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {showEditModal && editJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background-light rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto mx-auto">
            <button
              className="absolute top-4 right-4 text-text-secondary hover:text-text-main z-10"
              onClick={handleCancelEdit}
              aria-label="Close edit modal"
            >
              &times;
            </button>
            <div className="p-4 sm:p-6">
              <JobForm
                job={editJob}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
                isLoading={false}
              />
            </div>
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
