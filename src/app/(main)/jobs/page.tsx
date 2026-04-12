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
import { Eye, Pencil, Trash2, Copy, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import JobForm from '@/components/organisms/JobForm';
import toast from 'react-hot-toast';
import { parseJobText } from '@/utils/jobTextParser';
import { useUser } from '@/context/UserContext';
import NotAuthorizedPage from '@/app/not-authorized/page';

// Import refactored components and hooks
import { JobStatusTabs, type JobStatus } from '@/components/molecules/JobStatusTabs';
import { CustomerFilterButtons } from '@/components/molecules/CustomerFilterButtons';
import { DriverFilterButtons } from '@/components/molecules/DriverFilterButtons'; // Job Page Compact Layout
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
    customerCounts,
    // NEW – Job Page Compact Layout
    driverCounts,
    jobDrivers,
  } = useJobsData(isDriver);

  const { setCopiedJobData } = useCopiedJob();
  const [openCreateFromTextModal, setOpenCreateFromTextModal] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  
  // Date filter state
  const [pickupDateFrom, setPickupDateFrom] = useState('');
  const [pickupDateTo, setPickupDateTo] = useState('');

  // ── Job Page Compact Layout additions ─────────────────────────────────────
  // Driver filter (backend-side via driver_name filter)
  const [selectedDriver, setSelectedDriver] = useState('');

  // Time-of-day filter (frontend-side, applied after backend fetch)
  const [pickupTimeFrom, setPickupTimeFrom] = useState('');
  const [pickupTimeTo, setPickupTimeTo] = useState('');

  // Quick-date helper: set date range to today
  const handleQuickToday = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setPickupDateFrom(today);
    setPickupDateTo(today);
    setPage(1);
  }, [setPage]);

  // Quick-date helper: set date range to tomorrow
  const handleQuickTomorrow = useCallback(() => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    setPickupDateFrom(tomorrow);
    setPickupDateTo(tomorrow);
    setPage(1);
  }, [setPage]);

  // Quick-date helper: set date range to current week (Mon–Sun)
  const handleQuickThisWeek = useCallback(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    setPickupDateFrom(mon.toISOString().slice(0, 10));
    setPickupDateTo(sun.toISOString().slice(0, 10));
    setPage(1);
  }, [setPage]);

  // Quick-date helper: clear all date filters
  const handleQuickAllDates = useCallback(() => {
    setPickupDateFrom('');
    setPickupDateTo('');
    setPage(1);
  }, [setPage]);
  // ──────────────────────────────────────────────────────────────────────────

  // ===== Debounced Filters =====
  const debouncedSearch = useDebounce(search, 300);
  const debouncedLocalFilters = useDebounce(localFilters, 500);

  useEffect(() => {
    // Format dates properly for backend (YYYY-MM-DD)
    // HTML date inputs already return YYYY-MM-DD format, so no conversion needed
    // But we ensure they're sent correctly
    updateFilters({
      search: debouncedSearch,
      ...debouncedLocalFilters,
      pickup_date_start: pickupDateFrom || undefined,
      pickup_date_end: pickupDateTo || undefined,
      // Job Page Compact Layout: driver filter (backend-side)
      driver_name: selectedDriver === 'unassigned' ? '' : selectedDriver || undefined,
    });
  }, [debouncedSearch, debouncedLocalFilters, updateFilters, pickupDateFrom, pickupDateTo, selectedDriver]);

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

  const handleClearDateFilter = useCallback(() => {
    setPickupDateFrom('');
    setPickupDateTo('');
    setPage(1);
  }, []);

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

  // Job Page Compact Layout: frontend time-of-day filter (applied after backend date filter)
  const timeFilteredJobs = React.useMemo(() => {
    if (!pickupTimeFrom && !pickupTimeTo) return sortedJobs;
    return sortedJobs.filter((job) => {
      const t = (job.pickup_time || '').slice(0, 5); // 'HH:MM'
      if (pickupTimeFrom && t < pickupTimeFrom) return false;
      if (pickupTimeTo && t > pickupTimeTo) return false;
      return true;
    });
  }, [sortedJobs, pickupTimeFrom, pickupTimeTo]);

  // 'unassigned' driver filter is frontend-only (backend sends empty string which means all)
  const driverFilteredJobs = React.useMemo(() => {
    if (selectedDriver !== 'unassigned') return timeFilteredJobs;
    return timeFilteredJobs.filter((job) => !job.driver_name);
  }, [timeFilteredJobs, selectedDriver]);

  const paginationInfo = paginate(driverFilteredJobs);

  if (error) return <div>Error loading jobs</div>;
  if (["driver"].includes(role)) return <NotAuthorizedPage />;

  return (
    <div className="w-full flex flex-col gap-2 sm:gap-3 px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
      {!['driver'].includes(role) && (
        <EntityHeader
          title="Jobs"
          onAddClick={() => router.push('/jobs/new')}
          addLabel="Add Job"
          extraActions={
            <>
              <AnimatedButton onClick={() => router.push('/jobs/bulk-upload')} variant="outline" className="flex items-center text-xs">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Bulk Upload
              </AnimatedButton>
              <AnimatedButton onClick={() => setOpenCreateFromTextModal(true)} variant="outline" className="flex items-center text-xs">
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                Create from Text
              </AnimatedButton>
            </>
          }
          className="mb-1"
        />
      )}

      {/* ── Compact Filter Bar (Job Page Compact Layout) ───────────────────────────── */}
      <div className="flex flex-wrap items-end gap-2 bg-background-light border border-border-color rounded-lg px-3 py-2.5">
        {/* FREE TEXT SEARCH */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold text-text-secondary tracking-wide uppercase">Free Text Search</label>
          <Input
            placeholder="Search jobs, passengers, refs..."
            value={search}
            onChange={(e) => setSearch(e.target.value.trim())}
            className="w-56 text-xs h-8"
          />
        </div>

        <div className="w-px h-8 bg-border-color self-end" />

        {/* BY DATE & TIME */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold text-text-secondary tracking-wide uppercase">By Date &amp; Time</label>
          <div className="flex items-center gap-1.5">
            <input
              id="pickup-date-from"
              type="date"
              value={pickupDateFrom}
              onChange={(e) => { setPickupDateFrom(e.target.value); setPage(1); }}
              className="bg-background border border-border-color text-text-main rounded px-2 py-1 text-xs h-8 focus:ring-1 focus:ring-primary focus:border-transparent hover:border-primary/50 transition-all"
            />
            <input
              id="pickup-time-from"
              type="time"
              value={pickupTimeFrom}
              onChange={(e) => { setPickupTimeFrom(e.target.value); setPage(1); }}
              className="bg-background border border-border-color text-text-main rounded px-2 py-1 text-xs h-8 w-24 focus:ring-1 focus:ring-primary focus:border-transparent hover:border-primary/50 transition-all"
            />
            <span className="text-text-secondary text-xs">&mdash;</span>
            <input
              id="pickup-date-to"
              type="date"
              value={pickupDateTo}
              onChange={(e) => { setPickupDateTo(e.target.value); setPage(1); }}
              className="bg-background border border-border-color text-text-main rounded px-2 py-1 text-xs h-8 focus:ring-1 focus:ring-primary focus:border-transparent hover:border-primary/50 transition-all"
            />
            <input
              id="pickup-time-to"
              type="time"
              value={pickupTimeTo}
              onChange={(e) => { setPickupTimeTo(e.target.value); setPage(1); }}
              className="bg-background border border-border-color text-text-main rounded px-2 py-1 text-xs h-8 w-24 focus:ring-1 focus:ring-primary focus:border-transparent hover:border-primary/50 transition-all"
            />
            {(pickupDateFrom || pickupDateTo || pickupTimeFrom || pickupTimeTo) && (
              <button
                type="button"
                onClick={() => { handleClearDateFilter(); setPickupTimeFrom(''); setPickupTimeTo(''); }}
                className="text-text-secondary hover:text-red-400 transition-colors p-1 rounded hover:bg-background-dark"
                aria-label="Clear date/time filter"
                title="Clear date/time filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick-date buttons */}
        <div className="flex items-end gap-1 pb-0">
          {[
            { label: 'Today', action: handleQuickToday },
            { label: 'Tomorrow', action: handleQuickTomorrow },
            { label: 'This week', action: handleQuickThisWeek },
            { label: 'All dates', action: handleQuickAllDates },
          ].map(({ label, action }) => (
            <button
              key={label}
              type="button"
              onClick={action}
              className="px-2 py-1 text-xs rounded border border-border-color text-text-main hover:border-primary hover:text-primary bg-background h-8 transition-all whitespace-nowrap"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* ───────────────────────────────────────────────────────────────────────────── */}

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

      {/* Driver Filter Buttons – Job Page Compact Layout */}
      {!["customer", "driver"].includes(role) && (
        <DriverFilterButtons
          drivers={jobDrivers}
          counts={driverCounts}
          selectedDriver={selectedDriver}
          onChange={(name) => { setSelectedDriver(name); setPage(1); }}
        />
      )}

      {/* Pagination Info */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center sm:justify-between mb-2">
        <div className="text-xs sm:text-sm text-text-secondary">
          Showing {paginationInfo.total === 0 ? 0 : paginationInfo.startIdx}-{paginationInfo.endIdx} of {paginationInfo.total}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-xs sm:text-sm text-text-secondary whitespace-nowrap">Rows per page:</label>
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
      <div className="flex-grow rounded-lg sm:rounded-xl shadow-lg bg-background-light border border-border-color overflow-hidden flex flex-col">
        <div className="w-full flex-grow flex flex-col min-w-0">
          <div className="overflow-x-auto flex-grow" style={{ WebkitOverflowScrolling: 'touch' }}>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 py-3 sm:py-4 border-t border-border-color px-2 sm:px-4">
            <div className="flex items-center justify-center sm:justify-end gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-2 py-1 text-xs sm:text-sm rounded-lg font-medium transition-colors border border-border-color text-text-main hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &lt;
              </button>
              {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-2 py-1 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
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
                className="px-2 py-1 text-xs sm:text-sm rounded-lg font-medium transition-colors border border-border-color text-text-main hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showEditModal && editJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto py-4">
          <div className="w-[95vw] bg-background-light rounded-xl shadow-2xl relative flex flex-col" style={{ maxHeight: "90vh" }}>
            <button
  className="absolute right-4 top-[0px] text-text-secondary hover:text-text-main leading-[2rem] font-light"
  onClick={handleCancelEdit}
  aria-label="Close edit modal"
>
  ×
</button>

                
            <JobForm
              job={editJob}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              isLoading={false}
              isModal={true}
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