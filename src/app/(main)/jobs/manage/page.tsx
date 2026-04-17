"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useJobs } from '@/hooks/useJobs';
import { Job } from '@/types/job';
import { EntityTable, EntityTableColumn, EntityTableAction } from '@/components/organisms/EntityTable';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { Eye, RotateCcw, X, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import JobDetailCardWithActions from '@/components/organisms/JobDetailCardWithActions';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';
import { Input } from '@/components/atoms/Input';
import * as jobsApi from '@/services/api/jobsApi';
import { useCopiedJob } from '@/context/CopiedJobContext';
import { UpdateJobStatusModal } from '@/components/molecules/UpdateJobStatusModal';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/context/UserContext';
import NotAuthorizedPage from '@/app/not-authorized/page';

const columns: EntityTableColumn<Job & { stringLabel?: string }>[] = [
  { label: 'Job ID', accessor: 'id', filterable: true, stringLabel: 'Job ID', width: '80px' },
  { label: 'Customer', accessor: 'customer_name', filterable: true, stringLabel: 'Customer' },
  { label: 'Status', accessor: 'status', filterable: true, stringLabel: 'Status' },
];

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
      },
    ];
    if (job.status !== 'sd' && job.status !== 'jc') {
      actions.push({
        label: 'Update Status',
        icon: <RefreshCw className="w-5 h-5 text-blue-500" />,
        onClick: () => handleUpdateStatus(job),
        ariaLabel: 'Update job status',
        title: 'Update Status',
      });
    }
    if (job.status !== 'canceled') {
      actions.push({
        label: 'Cancel',
        icon: <X className="w-5 h-5 text-red-500" />,
        onClick: () => handleCancel(job),
        ariaLabel: 'Cancel job',
        title: 'Cancel',
      });
    }
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

const CANCELLATION_REASONS = [
  'Customer Request',
  'Driver Unavailable',
  'Operational Issue',
  'Entered in Error',
];

const STATUS_LABELS: Record<string, string> = {
  new: 'New', pending: 'Pending', confirmed: 'Confirmed',
  otw: 'On The Way', ots: 'On The Spot', pob: 'Passenger On Board',
  jc: 'Job Completed', sd: 'Stand Down', canceled: 'Canceled',
};

const ManageJobsPage = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { jobs, isLoading, error, updateFilters, deleteJobAsync, cancelJobAsync, reinstateJobAsync } = useJobs();
  const { user } = useUser();
  const role = (user?.roles?.[0]?.name || 'guest').toLowerCase();

  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<string>('pickup_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});
  const debouncedLocalFilters = useDebounce(localFilters, 500);
  const debouncedSearch = useDebounce(search, 500);

  const [selectedJobs, setSelectedJobs] = useState<number[]>([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [reinstateDialogOpen, setReinstateDialogOpen] = useState(false);
  const [jobToProcess, setJobToProcess] = useState<Job | null>(null);
  const [bulkCancelDialogOpen, setBulkCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [updateStatusModalOpen, setUpdateStatusModalOpen] = useState(false);
  const [jobToUpdate, setJobToUpdate] = useState<Job | null>(null);

  React.useEffect(() => {
    updateFilters({ search: debouncedSearch, ...debouncedLocalFilters });
  }, [debouncedSearch, debouncedLocalFilters, updateFilters]);

  const handleFilterChange = (col: string, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [col]: value }));
    setPage(1);
  };

  const handleClearFilter = (col: string) => {
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
    setConfirmOpen(false);
    try {
      await deleteJobAsync(pendingDeleteId);
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleBulkCancel = () => {
    if (selectedJobs.length > 0) setBulkCancelDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (!jobToProcess) return;
    try {
      await cancelJobAsync(jobToProcess.id, cancellationReason);
      toast.success('Job canceled successfully');
      setCancelDialogOpen(false);
      setJobToProcess(null);
      setCancellationReason('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to cancel job');
    }
  };

  const confirmReinstate = async () => {
    if (!jobToProcess) return;
    try {
      await reinstateJobAsync(jobToProcess.id);
      toast.success('Job re-instated successfully');
      setReinstateDialogOpen(false);
      setJobToProcess(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to re-instate job');
    }
  };

  const confirmBulkCancel = async () => {
    if (!cancellationReason) { toast.error('Please select a cancellation reason'); return; }
    try {
      await Promise.all(selectedJobs.map(id => cancelJobAsync(id, cancellationReason)));
      toast.success(`${selectedJobs.length} job(s) canceled successfully`);
      setBulkCancelDialogOpen(false);
      setSelectedJobs([]);
      setCancellationReason('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to cancel jobs');
    }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const handleUpdateStatus = (job: Job) => {
    if (job.status === 'sd' || job.status === 'jc') {
      toast.error(`Cannot update status for a job in ${STATUS_LABELS[job.status]} state.`);
      return;
    }
    if (job.status === 'canceled') {
      toast.error('Cannot update status for a canceled job. Please re-instate it first.');
      return;
    }
    setJobToUpdate(job);
    setUpdateStatusModalOpen(true);
  };

  const filteredJobs = (jobs ?? []).filter(j => j.status !== 'jc' && j.status !== 'sd');

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const aVal = a[sortBy], bVal = b[sortBy];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortDir === 'asc' ? 1 : -1;
    if (bVal == null) return sortDir === 'asc' ? -1 : 1;
    let result = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string')
      result = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
    else if (typeof aVal === 'number' && typeof bVal === 'number')
      result = aVal - bVal;
    else result = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
    return sortDir === 'asc' ? result : -result;
  });

  const total = sortedJobs.length;
  const paginatedJobs = sortedJobs.slice((page - 1) * pageSize, page * pageSize);
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  if (['customer', 'driver'].includes(role)) return <NotAuthorizedPage />;
  if (error) return <div>Failed to load jobs. Error: {(error as Error).message}</div>;

  return (
    <div className="w-full flex flex-col gap-4 px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main">Manage Jobs</h1>
        <AnimatedButton
          onClick={handleBulkCancel}
          disabled={selectedJobs.length === 0}
          className="flex items-center justify-center bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-sm px-4 py-2"
        >
          <X className="mr-2 h-4 w-4" />
          Cancel Selected ({selectedJobs.length})
        </AnimatedButton>
      </div>

      <div className="w-full px-2 sm:px-0">
        <Input
          placeholder="Search jobs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-background-light border-border-color text-text-main max-w-md w-full"
          aria-label="Search jobs"
        />
      </div>

      <div className="hidden md:flex items-center justify-end gap-2">
        <div className="text-sm text-text-secondary">
          Showing {total === 0 ? 0 : startIdx}–{endIdx} of {total} jobs
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-xs text-text-secondary whitespace-nowrap">Rows per page:</label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="bg-background-light border-border-color text-text-main rounded px-2 py-1 text-xs"
          >
            {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-grow rounded-xl shadow-lg bg-background-light border border-border-color overflow-hidden flex flex-col">
        <div className="w-full flex-grow">
          <div className="min-w-[700px]">
            <EntityTable
              columns={columns.map(col => ({
                ...col,
                label: (
                  <span className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort(col.accessor as string)}>
                    {col.label}
                    {sortBy === col.accessor ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : null}
                  </span>
                ),
                filterable: true,
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
                      >×</button>
                    )}
                  </div>
                ),
              }))}
              data={paginatedJobs}
              isLoading={isLoading}
              actions={getJobActions(router, handleView, handleCancel, handleReinstate, handleUpdateStatus)}
              renderExpandedRow={(job) => (
                <div className="py-2 px-1">
                  <JobDetailCardWithActions
                    job={job}
                    onEdit={() => router.push(`/jobs/${job.id}/edit`)}
                  />
                </div>
              )}
              rowClassName={(job) => {
                let cls = '';
                if (expandedJobId === job.id) cls += 'bg-primary/10 ';
                if (job.status === 'canceled') cls += 'opacity-70 ';
                return cls;
              }}
              onRowClick={handleView}
              expandedRowId={expandedJobId}
              filters={localFilters}
              onFilterChange={handleFilterChange}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onSelectionChange={(ids) => setSelectedJobs(ids.map(Number))}
            />
          </div>
        </div>
      </div>

      {/* Cancel Single Job Dialog */}
      {cancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-3 w-full max-w-md rounded-lg border border-border-color bg-background-light p-4 shadow-xl sm:p-6">
            <h2 className="mb-2 text-base font-bold text-text-main">Cancel Job</h2>
            <p className="mb-4 text-text-secondary">Please select a reason for cancellation.</p>
            <select
              value={cancellationReason}
              onChange={e => setCancellationReason(e.target.value)}
              className="w-full rounded-lg border-border-color bg-background-light px-3 py-2 text-sm text-text-main mb-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select a reason</option>
              {CANCELLATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setCancelDialogOpen(false); setJobToProcess(null); setCancellationReason(''); }} className="px-4 py-2 rounded border border-border-color text-text-main hover:bg-background">Close</button>
              <button onClick={confirmCancel} disabled={!cancellationReason} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Cancel Job</button>
            </div>
          </div>
        </div>
      )}

      {/* Re-instate Dialog */}
      <ConfirmDialog
        open={reinstateDialogOpen}
        title="Re-instate Job"
        description="Are you sure you want to re-instate this job?"
        confirmLabel="Re-instate Job"
        cancelLabel="Close"
        onConfirm={confirmReinstate}
        onCancel={() => { setReinstateDialogOpen(false); setJobToProcess(null); }}
      />

      {/* Bulk Cancel Dialog */}
      {bulkCancelDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-3 w-full max-w-md rounded-lg border border-border-color bg-background-light p-4 shadow-xl sm:p-6">
            <h2 className="mb-2 text-base font-bold text-text-main">Cancel Selected Jobs</h2>
            <p className="mb-4 text-text-secondary">Cancel {selectedJobs.length} selected job(s)? Please select a reason.</p>
            <select
              value={cancellationReason}
              onChange={e => setCancellationReason(e.target.value)}
              className="w-full rounded-lg border-border-color bg-background-light px-3 py-2 text-sm text-text-main mb-4 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select a reason</option>
              {CANCELLATION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setBulkCancelDialogOpen(false); setCancellationReason(''); }} className="px-4 py-2 rounded border border-border-color text-text-main hover:bg-background">Close</button>
              <button onClick={confirmBulkCancel} disabled={!cancellationReason} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">Cancel Jobs</button>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {updateStatusModalOpen && jobToUpdate && (
        <UpdateJobStatusModal
          job={jobToUpdate}
          isOpen={updateStatusModalOpen}
          onClose={() => { setUpdateStatusModalOpen(false); setJobToUpdate(null); }}
          onStatusUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            setUpdateStatusModalOpen(false);
            setJobToUpdate(null);
          }}
        />
      )}

      {/* Delete Confirm */}
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

export default ManageJobsPage;
