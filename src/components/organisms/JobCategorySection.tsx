"use client";
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { JobCategoryRow, type ExcelRow, type ReferenceData } from '@/components/molecules/JobCategoryRow';

interface JobCategorySectionProps {
  title: string;
  category: 'valid' | 'error' | 'xls_duplicate' | 'db_duplicate';
  rows: ExcelRow[];
  onConfirmUpload: (selectedRowNumbers: number[]) => Promise<void>;
  isLoading?: boolean;
  onUpdateRow?: (rowNumber: number, updatedRow: ExcelRow) => void;
  referenceData?: ReferenceData;
  user?: any;
  isLoadingReferenceData?: boolean;
}

type SortField = 'time' | 'arr_dep' | 'pickup_dropoff';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export default function JobCategorySection({
  title,
  category,
  rows,
  onConfirmUpload,
  isLoading = false,
  onUpdateRow,
  referenceData,
  user,
  isLoadingReferenceData = false
}: JobCategorySectionProps) {
  const [localLoading, setLocalLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const editingDataRef = React.useRef<Record<number, ExcelRow>>({});
  const userRole = (user?.roles?.[0]?.name || "guest").toLowerCase();

  const categoryConfig = {
    valid: {
      icon: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
      borderColor: 'border-green-500',
      bgColor: 'bg-green-50',
      buttonColor: 'bg-green-600 hover:bg-green-700'
    },
    error: {
      icon: <XCircleIcon className="w-6 h-6 text-red-500" />,
      borderColor: 'border-red-500',
      bgColor: 'bg-red-50',
      buttonColor: 'bg-red-600 hover:bg-red-700'
    },
    xls_duplicate: {
      icon: <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" />,
      borderColor: 'border-orange-500',
      bgColor: 'bg-orange-50',
      buttonColor: 'bg-orange-600 hover:bg-orange-700'
    },
    db_duplicate: {
      icon: <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />,
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-50',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
    }
  };

  const config = categoryConfig[category];

  // Sorting logic
  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      let comparison = 0;

      // Primary sort: Time (ascending by default)
      if (sortField === 'time') {
        const timeA = a.pickup_time || '';
        const timeB = b.pickup_time || '';
        comparison = timeA.localeCompare(timeB);
      }
      // Secondary sort: Arr/Dep (service type)
      else if (sortField === 'arr_dep') {
        const serviceA = a.service || '';
        const serviceB = b.service || '';
        comparison = serviceA.localeCompare(serviceB);
      }
      // Tertiary sort: Pick up / Drop off location
      else if (sortField === 'pickup_dropoff') {
        const pickupA = a.pickup_location || '';
        const pickupB = b.pickup_location || '';
        comparison = pickupA.localeCompare(pickupB);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [rows, sortField, sortDirection]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  const toggleRowSelection = useCallback((rowNumber: number) => {
    setSelectedRows(prev => {
      const newSelected = new Set(prev);
      newSelected.has(rowNumber) ? newSelected.delete(rowNumber) : newSelected.add(rowNumber);
      return newSelected;
    });
  }, []);

  const selectAllRows = useCallback(() => {
    setSelectedRows(new Set(rows.filter(row => !row.job_id).map(row => row.row_number)));
  }, [rows]);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const handleUpload = async () => {
    if (selectedRows.size === 0) {
      toast.error('Please select at least one row to upload');
      return;
    }
    setLocalLoading(true);
    try {
      await onConfirmUpload(Array.from(selectedRows));
    } finally {
      setLocalLoading(false);
    }
  };

  const toggleRowExpansion = useCallback((rowNumber: number) => {
    setExpandedRows(prev => {
      const newExpanded = new Set(prev);
      newExpanded.has(rowNumber) ? newExpanded.delete(rowNumber) : newExpanded.add(rowNumber);
      return newExpanded;
    });
  }, []);

  const startEditRow = useCallback((row: ExcelRow) => {
    editingDataRef.current[row.row_number] = { ...row };
    setEditingRow(row.row_number);
  }, []);

  const cancelEditRow = useCallback(() => {
    setEditingRow(null);
  }, []);

  const saveEditRow = useCallback(() => {
    if (editingRow !== null && editingDataRef.current[editingRow]) {
      onUpdateRow?.(editingRow, editingDataRef.current[editingRow]);
      setEditingRow(null);
    }
  }, [editingRow, onUpdateRow]);

  // Column header label: 'JOB #' for db_duplicate or if any row has been saved to DB, else 'SR #'
  const jobColumnLabel = category === 'db_duplicate' || rows.some(r => r.job_id) ? 'Job #' : 'SR #';

  if (rows.length === 0) return null;

  const totalPages = Math.ceil(sortedRows.length / ITEMS_PER_PAGE);
  
  // Clamp current page when rows change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [sortedRows.length, totalPages, currentPage]);

  const clampedPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const startIndex = (clampedPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedRows = sortedRows.slice(startIndex, endIndex);

  return (
    <div
      className={clsx(
        'border-l-4 rounded-lg p-6 shadow-md',
        config.borderColor,
        config.bgColor
      )}
      style={{
        backgroundColor: 'var(--color-bg-light)',
        borderColor: 'currentColor'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {config.icon}
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-main)' }}>
              {title}
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {selectedRows.size > 0 ? `${selectedRows.size} of ${rows.length}` : rows.length} row{rows.length !== 1 ? 's' : ''}
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedRows.size > 0 && (
            <button
              onClick={clearSelection}
              className="px-3 py-2 text-sm rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: 'rgba(0,0,0,0.1)',
                color: 'var(--color-text-secondary)'
              }}
              title="Clear selection"
            >
              Clear
            </button>
          )}
          {selectedRows.size < rows.length && (
            <button
              onClick={selectAllRows}
              className="px-3 py-2 text-sm rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: 'rgba(0,0,0,0.1)',
                color: 'var(--color-text-secondary)'
              }}
              title="Select all rows"
            >
              Select All
            </button>
          )}
          <button
            onClick={handleUpload}
            disabled={localLoading || isLoading || selectedRows.size === 0}
            className={clsx(
              'px-6 py-2 rounded-lg font-medium text-white transition-colors duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              config.buttonColor
            )}
          >
            {localLoading || isLoading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Uploading...</span>
              </span>
            ) : (
              `Upload (${selectedRows.size})`
            )}
          </button>
        </div>
      </div>

      {/* Verification Help Text */}
      <div
        className="mb-4 p-3 rounded-lg border"
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.05)',
          borderColor: 'rgba(59, 130, 246, 0.2)'
        }}
      >
        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <strong style={{ color: 'var(--color-text-main)' }}>💡 Tip:</strong> Jobs are automatically sorted by Pickup Time (earliest first). Click sort options to reorganize.
        </p>
      </div>

      {/* Sort Pills */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
          Sort by:
        </span>
        <div className="flex items-center gap-2">
          {[
            { field: 'time' as SortField, label: 'Time' },
            { field: 'arr_dep' as SortField, label: 'Arrival / Departure' },
            { field: 'pickup_dropoff' as SortField, label: 'Pickup / Drop-off' }
          ].map(({ field, label }) => {
            const isActive = sortField === field;
            const direction = isActive && sortDirection === 'desc' ? ' ↓' : isActive ? ' ↑' : '';
            
            return (
              <button
                key={field}
                onClick={() => handleSortChange(field)}
                className={clsx(
                  'px-4 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                    : 'bg-background text-text-main border-border-color hover:border-blue-600 hover:text-blue-600'
                )}
                style={isActive ? undefined : {
                  backgroundColor: 'var(--color-bg)',
                  color: 'var(--color-text-main)',
                  borderColor: 'var(--color-border)'
                }}
              >
                {label}{direction}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table Header */}
      <div
        className="grid grid-cols-[40px_40px_80px_140px_1fr_1fr_1fr_1fr_140px_160px_200px] items-center px-4 py-3 border-b-2 text-xs font-semibold uppercase tracking-wide"
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-secondary)'
        }}
      >
        {/* Checkbox - matches row checkbox area */}
        <div></div>
        
        {/* Expand button - matches row expand area */}
        <div></div>
        
        {/* Status icon - matches row status icon */}
        <div></div>
        
        {/* Job # */}
        <div className="text-left">{jobColumnLabel}</div>
        
        {/* Customer */}
        <div className="text-left">Customer</div>
        
        {/* Service */}
        <div className="text-left">Service</div>
        
        {/* Pickup Location */}
        <div className="text-left">Pickup Location</div>
        
        {/* Drop-off Location */}
        <div className="text-left">Drop-off Location</div>
        
        {/* Pickup Date */}
        <div className="text-left">Pickup Date</div>
        
        {/* Pickup Time */}
        <div className="text-right pr-4">
          <div className="flex items-center justify-end gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-bold">Pickup Time</span>
          </div>
        </div>
        
        {/* Status / Actions */}
        <div className="text-left pl-4">Status / Actions</div>
      </div>

      {/* Rows */}
      <div className="space-y-0">
        {paginatedRows.map((row) => (
          <JobCategoryRow
            key={row.row_number}
            row={row}
            isSelected={selectedRows.has(row.row_number)}
            isExpanded={expandedRows.has(row.row_number)}
            isEditing={editingRow === row.row_number}
            onToggleSelection={toggleRowSelection}
            onToggleExpansion={toggleRowExpansion}
            onStartEditing={startEditRow}
            onCancelEditing={cancelEditRow}
            onSaveEditing={saveEditRow}
            editingDataRef={editingDataRef}
            category={category}
            referenceData={referenceData}
            user={user}
            userRole={userRole}
            isLoadingReferenceData={isLoadingReferenceData}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="pt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Showing {startIndex + 1} to {Math.min(endIndex, sortedRows.length)} of {sortedRows.length} rows
          </div>
          <div className="pt-4 flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: currentPage === 1 ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.1)',
                color: 'var(--color-text-secondary)'
              }}
            >
              ← Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={clsx(
                    'px-2.5 py-1.5 text-sm rounded-lg font-medium transition-colors',
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-opacity-75'
                  )}
                  style={page !== currentPage ? {
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    color: 'var(--color-text-secondary)'
                  } : undefined}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: currentPage === totalPages ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.1)',
                color: 'var(--color-text-secondary)'
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
