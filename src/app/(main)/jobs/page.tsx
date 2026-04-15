"use client";

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJobs, jobKeys } from '@/hooks/useJobs';
import * as jobsApi from '@/services/api/jobsApi';
import { useCopiedJob } from '@/context/CopiedJobContext';
import { Job, JobFormData, ApiJob } from '@/types/job';
import {
  JobsEntityTable,
  type EntityTableColumn,
} from '@/components/organisms/jobs/JobsEntityTable';
import { EntityHeader } from '@/components/organisms/EntityHeader';
import { CreateJobFromTextModal } from '@/components/organisms/CreateJobFromTextModal';
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { ArrowUp, ArrowDown, ArrowUpDown, X, PlusCircle, Upload } from 'lucide-react';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { Input } from '@/components/atoms/Input';
import { MultiSelectDropdown, MultiSelectOption } from '@/components/atoms/MultiSelectDropdown';
import JobDetailCard from '@/components/organisms/JobDetailCard';
import { useDebounce } from '@/hooks/useDebounce';
import JobForm from '@/components/organisms/JobForm';
import toast from 'react-hot-toast';
import { parseJobText } from '@/utils/jobTextParser';
import { useUser } from '@/context/UserContext';
import NotAuthorizedPage from '@/app/not-authorized/page';

// Import refactored components and hooks
import { useJobFiltering } from '@/hooks/useJobFiltering';
import { useJobSorting } from '@/hooks/useJobSorting';
import { useJobPagination } from '@/hooks/useJobPagination';
import { useJobDeletion } from '@/hooks/useJobDeletion';
import { useJobEditing } from '@/hooks/useJobEditing';
import { useJobsData } from '@/hooks/useJobsData';
import { useJobsPageTableActions } from '@/hooks/useJobsPageTableActions';
import { getJobsPageTableColumns } from '@/lib/jobsPageTableConfig';
import { DriverFilterButtons } from '@/components/molecules/DriverFilterButtons';
import { Button } from '@/components/ui/button';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { UpdateJobStatusModal } from '@/components/molecules/UpdateJobStatusModal';
import { useQueryClient } from '@tanstack/react-query';

// Job status configuration
interface JobStatus {
  label: string;
  value: string;
}

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

const JOB_STATUS_LABELS: Record<string, string> = {
  new: 'New',
  pending: 'Pending',
  confirmed: 'Confirmed',
  otw: 'On The Way',
  ots: 'On The Spot',
  pob: 'Passenger On Board',
  jc: 'Job Completed',
  sd: 'Stand Down',
  canceled: 'Canceled',
};

const CANCELLATION_REASONS = [
  'Customer Request',
  'Driver Unavailable',
  'Operational Issue',
  'Entered in Error',
] as const;

const JobsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    jobs,
    isLoading,
    error,
    updateFilters,
    deleteJobAsync,
    updateJobAsync,
    filters,
    cancelJobAsync,
    reinstateJobAsync,
  } = useJobs();
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
    sorts,
    handleSort,
    removeSort,
    clearSorts,
    getSortedJobs
  } = useJobSorting();

  const {
    page,
    pageSize,
    setPage,
    setPageSize,
    paginate
  } = useJobPagination(50);

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
  const [datePreset, setDatePreset] = useState<'today' | 'tomorrow' | 'week' | 'custom' | null>(null);
  const [driverFilterKey, setDriverFilterKey] = useState('');

  const canManageLifecycle = !['driver', 'customer', 'guest'].includes(role);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
  const [jobToProcess, setJobToProcess] = useState<Job | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [updateStatusModalOpen, setUpdateStatusModalOpen] = useState(false);
  const [jobToUpdate, setJobToUpdate] = useState<Job | null>(null);

  // ── Job Page Compact Layout additions ─────────────────────────────────────
  // Multi-select filters for Customer and Driver
  const [selectedCustomers, setSelectedCustomers] = useState<(string | number)[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<(string | number)[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<(string | number)[]>([]);

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
    });
  }, [debouncedSearch, debouncedLocalFilters, updateFilters, pickupDateFrom, pickupDateTo]);

  const handleOpenCancelJob = useCallback((job: Job) => {
    setJobToProcess(job);
    setCancelDialogOpen(true);
  }, []);

  const handleOpenReinstate = useCallback((job: Job) => {
    setJobToProcess(job);
    setReinstateDialogOpen(true);
  }, []);

  const handleUpdateStatus = useCallback((job: Job) => {
    if (job.status === 'sd' || job.status === 'jc') {
      toast.error(
        `Cannot update status for a job in ${JOB_STATUS_LABELS[job.status]} state.`
      );
      return;
    }
    if (job.status === 'canceled') {
      toast.error(
        'Cannot update status for a canceled job. Please re-instate the job first.'
      );
      return;
    }
    setJobToUpdate(job);
    setUpdateStatusModalOpen(true);
  }, []);

  const confirmJobCancel = async () => {
    if (!jobToProcess) return;
    try {
      await cancelJobAsync(jobToProcess.id, cancellationReason);
      toast.success('Job canceled successfully');
      setCancelDialogOpen(false);
      setJobToProcess(null);
      setCancellationReason('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel job';
      toast.error(message);
    }
  };

  const confirmJobReinstate = async () => {
    if (!jobToProcess) return;
    try {
      await reinstateJobAsync(jobToProcess.id);
      toast.success('Job re-instated successfully');
      setReinstateDialogOpen(false);
      setJobToProcess(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to re-instate job';
      toast.error(message);
    }
  };

  // ===== Get Job Actions =====
  const jobActions = useJobsPageTableActions({
    role,
    canManageLifecycle,
    onToggleDetail: (job: Job) => {
      setExpandedJobId((prev) => (prev === job.id ? null : job.id));
    },
    onEdit: handleEdit,
    onDelete: handleDelete,
    onUpdateStatus: handleUpdateStatus,
    onCancelJob: handleOpenCancelJob,
    onReinstate: handleOpenReinstate,
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

  // ===== Table Columns (Jobs page only; multi-column sortable headers) =====
  const columns = useMemo<EntityTableColumn<ApiJob & { stringLabel?: string }>[]>(
    () =>
      getJobsPageTableColumns(search).map((col) => {
        const accessor = col.accessor as string;
        const sortIdx = sorts.findIndex((s) => s.col === accessor);
        const isActive = sortIdx !== -1;
        const activeSortEntry = isActive ? sorts[sortIdx] : null;
        const multiSort = sorts.length > 1;

        return {
          ...col,
          accessor: accessor as keyof (ApiJob & { stringLabel?: string }),
          label: (
            <span
              className="inline-flex cursor-pointer items-center gap-1 select-none group"
              onClick={() => handleSort(accessor)}
              title={
                !isActive
                  ? `Sort by ${col.stringLabel || accessor} (asc)`
                  : activeSortEntry!.dir === 'asc'
                  ? `Sort by ${col.stringLabel || accessor} (desc)`
                  : `Remove sort on ${col.stringLabel || accessor}`
              }
            >
              <span className="group-hover:text-primary transition-colors">
                {col.label as string}
              </span>
              {isActive ? (
                <span className="inline-flex items-center gap-0.5">
                  {/* Priority badge — only shown when 2+ columns are sorted */}
                  {multiSort && (
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary text-white text-[8px] font-bold leading-none">
                      {sortIdx + 1}
                    </span>
                  )}
                  {activeSortEntry!.dir === 'asc' ? (
                    <ArrowUp className="h-3 w-3 text-primary" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-primary" />
                  )}
                </span>
              ) : (
                <ArrowUpDown className="h-3 w-3 text-text-secondary/40 group-hover:text-primary/60 transition-colors" />
              )}
            </span>
          ),
        };
      }),
    [search, sorts, handleSort]
  );

  const driverFilterOptions = useMemo(() => {
    const list = jobs ?? [];
    const map = new Map<string, number>();
    let unassigned = 0;
    for (const j of list) {
      if (!j.driver_id) unassigned += 1;
      else {
        const n = ((j as Job & { driver_name?: string }).driver_name || '').trim() || 'Unknown';
        map.set(n, (map.get(n) || 0) + 1);
      }
    }
    const drivers = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({ key: label, label, count }));
    return { drivers, unassigned };
  }, [jobs]);

  const applyDatePreset = useCallback(
    (preset: 'today' | 'tomorrow' | 'week' | 'all') => {
      const now = new Date();
      if (preset === 'all') {
        setDatePreset(null);
        setPickupDateFrom('');
        setPickupDateTo('');
        setPage(1);
        return;
      }
      if (preset === 'today') {
        const d = format(now, 'yyyy-MM-dd');
        setPickupDateFrom(d);
        setPickupDateTo(d);
        setDatePreset('today');
        setPage(1);
        return;
      }
      if (preset === 'tomorrow') {
        const t = addDays(now, 1);
        const d = format(t, 'yyyy-MM-dd');
        setPickupDateFrom(d);
        setPickupDateTo(d);
        setDatePreset('tomorrow');
        setPage(1);
        return;
      }
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      setPickupDateFrom(format(start, 'yyyy-MM-dd'));
      setPickupDateTo(format(end, 'yyyy-MM-dd'));
      setDatePreset('week');
      setPage(1);
    },
    [setPage]
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

  const handleClearDateFilter = useCallback(() => {
    setPickupDateFrom('');
    setPickupDateTo('');
    setDatePreset(null);
    setPage(1);
  }, [setPage]);

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

  // Multi-select customer and driver filtering (frontend-side)
  const multiSelectFilteredJobs = React.useMemo(() => {
    let filtered = timeFilteredJobs;

    // Apply customer filter if any selected
    if (selectedCustomers.length > 0) {
      filtered = filtered.filter((job) =>
        job.customer_name && selectedCustomers.includes(job.customer_name)
      );
    }

    // Apply driver filter if any selected
    if (selectedDrivers.length > 0) {
      filtered = filtered.filter((job) =>
        job.driver_name && selectedDrivers.includes(job.driver_name)
      );
    }

    // Apply status filter if any selected
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((job) =>
        job.status && selectedStatuses.includes(job.status)
      );
    }

    return filtered;
  }, [timeFilteredJobs, selectedCustomers, selectedDrivers, selectedStatuses]);

  const paginationInfo = paginate(multiSelectFilteredJobs);

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
              title="Filter jobs from this date onwards (optional)"
            />
            <input
              id="pickup-time-from"
              type="time"
              value={pickupTimeFrom}
              onChange={(e) => { setPickupTimeFrom(e.target.value); setPage(1); }}
              className="bg-background border border-border-color text-text-main rounded px-2 py-1 text-xs h-8 w-24 focus:ring-1 focus:ring-primary focus:border-transparent hover:border-primary/50 transition-all"
              title="Filter jobs from this time onwards (optional)"
            />
            <span className="text-text-secondary text-xs">&mdash;</span>
            <input
              id="pickup-date-to"
              type="date"
              value={pickupDateTo}
              onChange={(e) => { setPickupDateTo(e.target.value); setPage(1); }}
              className="bg-background border border-border-color text-text-main rounded px-2 py-1 text-xs h-8 focus:ring-1 focus:ring-primary focus:border-transparent hover:border-primary/50 transition-all"
              title="Filter jobs up to this date (optional)"
            />
            <input
              id="pickup-time-to"
              type="time"
              value={pickupTimeTo}
              onChange={(e) => { setPickupTimeTo(e.target.value); setPage(1); }}
              className="bg-background border border-border-color text-text-main rounded px-2 py-1 text-xs h-8 w-24 focus:ring-1 focus:ring-primary focus:border-transparent hover:border-primary/50 transition-all"
              title="Filter jobs up to this time (optional)"
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

        {/* Quick-date buttons + Multi-select filters */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold text-text-secondary tracking-wide uppercase">Quick Filters</label>
          <div className="flex items-center gap-1.5">
            {/* Today & Tomorrow buttons */}
            <button
              type="button"
              onClick={handleQuickToday}
              className="px-2 py-1 text-xs rounded border border-border-color text-text-main hover:border-primary hover:text-primary bg-background h-8 transition-all whitespace-nowrap"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleQuickTomorrow}
              className="px-2 py-1 text-xs rounded border border-border-color text-text-main hover:border-primary hover:text-primary bg-background h-8 transition-all whitespace-nowrap"
            >
              Tomorrow
            </button>

            {/* Multi-select: Filter by Customer */}
            <MultiSelectDropdown
              options={filteredCustomers.map((c) => ({ id: c.name, label: c.name }))}
              selected={selectedCustomers}
              onChange={(selected) => { setSelectedCustomers(selected); setPage(1); }}
              placeholder="All Customers"
            />

            {/* Multi-select: Filter by Driver */}
            <MultiSelectDropdown
              options={jobDrivers.map((d) => ({ id: d.name, label: d.name }))}
              selected={selectedDrivers}
              onChange={(selected) => { setSelectedDrivers(selected); setPage(1); }}
              placeholder="All Drivers"
            />

            {/* Multi-select: Filter by Status */}
            <MultiSelectDropdown
              options={jobStatuses.filter(s => s.value !== 'all').map((s) => ({ id: s.value, label: s.label }))}
              selected={selectedStatuses}
              onChange={(selected) => { setSelectedStatuses(selected); setPage(1); }}
              placeholder="All Statuses"
            />
          </div>
        </div>
      </div>
      {/* ───────────────────────────────────────────────────────────────────────────── */}

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

      {/* Active sorts pill bar — shown when any column is sorted */}
      {sorts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap">
            Sorted by:
          </span>
          {sorts.map((s, idx) => {
            // Find the human-readable label for this column
            const colDef = getJobsPageTableColumns('').find(
              (c) => c.accessor === s.col
            );
            const label = colDef?.stringLabel || s.col;
            return (
              <span
                key={s.col}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
              >
                {/* Priority number when multiple sorts are active */}
                {sorts.length > 1 && (
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-primary text-white text-[7px] font-bold leading-none flex-shrink-0">
                    {idx + 1}
                  </span>
                )}
                <span>{label}</span>
                {s.dir === 'asc' ? (
                  <ArrowUp className="h-2.5 w-2.5" />
                ) : (
                  <ArrowDown className="h-2.5 w-2.5" />
                )}
                {/* Remove this single sort */}
                <button
                  type="button"
                  onClick={() => removeSort(s.col)}
                  className="hover:text-red-400 transition-colors ml-0.5"
                  aria-label={`Remove sort on ${label}`}
                  title={`Remove sort on ${label}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
          {/* Clear all button — only when 2+ sorts are active */}
          {sorts.length > 1 && (
            <button
              type="button"
              onClick={clearSorts}
              className="text-[10px] text-text-secondary hover:text-red-400 transition-colors underline underline-offset-2 whitespace-nowrap"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Jobs table (dedicated component — does not affect other pages) */}
      <div className="flex min-w-0 flex-grow flex-col rounded-xl border border-border-color bg-background-light">
        <div className="flex min-w-0 flex-col">
          <JobsEntityTable<ApiJob>
            data={paginationInfo.paginatedJobs}
            columns={columns}
            isLoading={isLoading}
            actions={jobActions}
            renderExpandedRow={(job) => (
              <div className="px-4 py-4 sm:px-8 sm:py-6">
                <JobDetailCard job={job} />
              </div>
            )}
            rowClassName={(job) =>
              [
                expandedJobId === job.id ? 'ring-1 ring-primary/30' : '',
                job.status === 'canceled' ? 'opacity-70' : '',
              ]
                .filter(Boolean)
                .join(' ')
            }
            onRowClick={(job) =>
              setExpandedJobId((prev) => (prev === job.id ? null : job.id))
            }
            expandedRowId={expandedJobId}
            filters={localFilters}
            onFilterChange={handleFilterChange}
          />
        </div>

        {paginationInfo.totalPages > 1 && (
          <div className="flex flex-col gap-2 border-t border-border-color px-2 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-4 sm:py-4">
            <div className="flex items-center justify-center gap-1 sm:justify-end">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border-color px-2 py-1 text-xs font-medium text-text-main transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
              >
                &lt;
              </button>
              {Array.from({ length: paginationInfo.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors sm:text-sm ${
                    pageNum === page
                      ? 'bg-primary text-white'
                      : 'border border-border-color text-text-main hover:border-primary'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage(Math.min(paginationInfo.totalPages, page + 1))}
                disabled={page === paginationInfo.totalPages}
                className="rounded-lg border border-border-color px-2 py-1 text-xs font-medium text-text-main transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
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

      {cancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            className="mx-3 max-h-[90vh] w-full max-w-md animate-fade-in overflow-y-auto rounded-lg border border-border-color bg-background-light p-4 shadow-xl sm:mx-4 sm:p-6"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="mb-2 text-base font-bold text-text-main sm:text-lg">
              Cancel Job
            </h2>
            <p className="mb-4 text-text-secondary">
              Are you sure you want to cancel this job? Please select a reason for
              cancellation.
            </p>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-text-main">
                Cancellation Reason
              </label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full rounded-lg border-border-color bg-background-light px-3 py-2 text-sm text-text-main transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select a reason</option>
                {CANCELLATION_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex w-full flex-col justify-end gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                className="w-full rounded border border-border-color bg-background-light px-4 py-2 text-text-main hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary sm:w-auto"
                onClick={() => {
                  setCancelDialogOpen(false);
                  setJobToProcess(null);
                  setCancellationReason('');
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="w-full rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 sm:w-auto"
                onClick={confirmJobCancel}
                disabled={!cancellationReason}
              >
                Cancel Job
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={reinstateDialogOpen}
        title="Re-instate Job"
        description="Are you sure you want to re-instate this job? This will restore the job to its previous status."
        confirmLabel="Re-instate Job"
        cancelLabel="Close"
        onConfirm={confirmJobReinstate}
        onCancel={() => {
          setReinstateDialogOpen(false);
          setJobToProcess(null);
        }}
      />

      {updateStatusModalOpen && jobToUpdate && (
        <UpdateJobStatusModal
          job={jobToUpdate}
          isOpen={updateStatusModalOpen}
          onClose={() => {
            setUpdateStatusModalOpen(false);
            setJobToUpdate(null);
          }}
          onStatusUpdated={() => {
            queryClient.invalidateQueries({ queryKey: jobKeys.all });
            setUpdateStatusModalOpen(false);
            setJobToUpdate(null);
          }}
        />
      )}
    </div>
  );
};

export default JobsPage;