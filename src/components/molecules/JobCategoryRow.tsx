"use client";
import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronRightIcon, PencilIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { JobRowEditForm } from './JobRowEditForm';

export interface ExcelRow {
  row_number: number;
  customer: string;
  service: string;
  pickup_date: string;
  pickup_time?: string;
  pickup_location: string;
  dropoff_location: string;
  passenger_name?: string;
  status?: string;
  remarks?: string;
  error_message?: string;
  is_valid?: boolean;
  is_rejected?: boolean;
  job_id?: string;
  vehicle_type?: string;
  vehicle?: string;
  driver?: string;
  contractor?: string;
  customer_id?: number;
  [key: string]: any;
}

export interface ReferenceData {
  customers: Array<{ id: number; name: string }>;
  services: Array<{ id: number; name: string }>;
  vehicles: Array<{ id: number; name: string }>;
  drivers: Array<{ id: number; name: string }>;
  contractors: Array<{ id: number; name: string }>;
  vehicle_types: Array<{ id: number; name: string }>;
}

interface JobCategoryRowProps {
  row: ExcelRow;
  isSelected: boolean;
  isExpanded: boolean;
  isEditing: boolean;
  onToggleSelection: (rowNumber: number) => void;
  onToggleExpansion: (rowNumber: number) => void;
  onStartEditing: (row: ExcelRow) => void;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  editingDataRef: React.MutableRefObject<Record<number, ExcelRow>>;
  category: 'valid' | 'error' | 'xls_duplicate' | 'db_duplicate';
  referenceData?: ReferenceData;
  user?: any;
  userRole: string;
  isLoadingReferenceData?: boolean;
}

export function JobCategoryRow({
  row,
  isSelected,
  isExpanded,
  isEditing,
  onToggleSelection,
  onToggleExpansion,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  editingDataRef,
  category,
  referenceData,
  user,
  userRole,
  isLoadingReferenceData
}: JobCategoryRowProps) {
  return (
    <>
      <div
        className={clsx(
          'grid grid-cols-[40px_40px_80px_140px_1fr_1fr_1fr_1fr_140px_160px_200px] items-center px-4 py-3 border-b',
          'hover:bg-opacity-50 transition-colors',
          isSelected && 'bg-opacity-75',
          !isEditing && 'cursor-pointer'
        )}
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : (isExpanded ? 'rgba(0,0,0,0.05)' : 'transparent')
        }}
      >
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(row.row_number)}
            disabled={!!row.job_id}
            className="form-checkbox h-4 w-4 text-primary rounded focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
          />
        </div>

        {/* Expand/Collapse Button */}
        <button
          onClick={() => onToggleExpansion(row.row_number)}
          className="hover:bg-opacity-75 rounded transition-colors"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-5 h-5 text-text-secondary" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 text-text-secondary" />
          )}
        </button>

        {/* Status Icon */}
        <div>
          {row.is_valid ? (
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          ) : (
            <XCircleIcon className="w-5 h-5 text-red-500" />
          )}
        </div>

        {/* Row Number / DB Job ID */}
        <div className="text-left">
          {row.job_id ? (
            // Job was just created — show the real DB job ID
            <a
              href={`/jobs/${row.job_id.replace('JOB-', '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-bold hover:underline"
              style={{ color: 'var(--color-primary)' }}
              title="Open job"
            >
              JOB-{row.job_id.replace('JOB-', '')}
            </a>
          ) : category === 'db_duplicate' && row.error_message ? (
            // DB duplicate — extract and show the existing DB job ID(s)
            (() => {
              const match = row.error_message.match(/Job\s+(#[\d\s,and#]+)/i);
              return match ? (
                <p className="text-sm font-bold" style={{ color: '#ca8a04' }} title={row.error_message}>
                  {match[1]}
                </p>
              ) : (
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>#{row.row_number}</p>
              );
            })()
          ) : (
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>#{row.row_number}</p>
          )}
        </div>

        {/* Customer */}
        <div className="min-w-0 text-left">
          <p className="text-sm font-medium text-text-main truncate">{row.customer}</p>
        </div>

        {/* Service */}
        <div className="min-w-0 text-left">
          <p className="text-sm text-text-secondary truncate">{row.service}</p>
        </div>

        {/* Pickup Location */}
        <div className="min-w-0 text-left">
          <p className="text-sm text-text-secondary truncate" title={row.pickup_location}>
            {row.pickup_location}
          </p>
        </div>

        {/* Drop-off Location */}
        <div className="min-w-0 text-left">
          <p className="text-sm text-text-secondary truncate" title={row.dropoff_location}>
            {row.dropoff_location}
          </p>
        </div>

        {/* Pickup Date */}
        <div className="text-left">
          <p className="text-sm text-text-secondary">{row.pickup_date}</p>
        </div>

        {/* Pickup Time */}
        <div className="text-right pr-4">
          <p className="text-sm font-bold" style={{ color: '#22D3EE' }}>
            {row.pickup_time || '—'}
          </p>
        </div>

        {/* Actions / Status */}
        <div className="flex items-center gap-2 pl-4" onClick={(e) => e.stopPropagation()}>
          {row.job_id ? (
            <span className="text-xs font-semibold text-green-600">
              ✓ Created
            </span>
          ) : (
            <>
              {category === 'error' && !isEditing && (
                <span className="text-xs text-red-600 font-medium truncate" title={row.error_message || 'Invalid'}>
                  {row.error_message || 'Invalid'}
                </span>
              )}
              {(category === 'xls_duplicate' || category === 'db_duplicate') && !isEditing && (
                <span className="text-xs font-medium truncate" style={{ color: category === 'xls_duplicate' ? '#ea580c' : '#ca8a04' }}>
                  Duplicate
                </span>
              )}
              {!isEditing && (
                <button
                  onClick={() => onStartEditing(row)}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors flex-shrink-0"
                  title="Edit"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && !isEditing && (
        <div
          className="px-6 py-3 border-b"
          style={{
            backgroundColor: 'rgba(0,0,0,0.05)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div className="grid grid-cols-2 gap-3 text-xs leading-normal">
            <div>
              <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Customer:</span>
              <span className="ml-2" style={{ color: 'var(--color-text-main)' }}>{row.customer}</span>
            </div>
            <div>
              <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Service:</span>
              <span className="ml-2" style={{ color: 'var(--color-text-main)' }}>{row.service}</span>
            </div>
            <div>
              <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Pickup Date:</span>
              <span className="ml-2" style={{ color: 'var(--color-text-main)' }}>{row.pickup_date}</span>
            </div>
            {row.pickup_time && (
              <div>
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Pickup Time:</span>
                <span className="ml-2" style={{ color: 'var(--color-text-main)' }}>{row.pickup_time}</span>
              </div>
            )}
            <div className="col-span-2">
              <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Pickup Location:</span>
              <span className="ml-2" style={{ color: 'var(--color-text-main)' }}>{row.pickup_location}</span>
            </div>
            <div className="col-span-2">
              <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Dropoff Location:</span>
              <span className="ml-2" style={{ color: 'var(--color-text-main)' }}>{row.dropoff_location}</span>
            </div>
            {row.passenger_name && (
              <div>
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Passenger:</span>
                <span className="ml-2" style={{ color: 'var(--color-text-main)' }}>{row.passenger_name}</span>
              </div>
            )}
            {row.remarks && (
              <div className="col-span-2">
                <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>Remarks:</span>
                <span className="ml-2" style={{ color: 'var(--color-text-main)' }}>{row.remarks}</span>
              </div>
            )}
            {!row.is_valid && row.error_message && (
              <div className="col-span-2">
                <div className="flex gap-2 text-red-600">
                  <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    {row.error_message.includes(';') ? (
                      row.error_message.split(';').map((error, idx) => (
                        <div key={idx}>{error.trim()}</div>
                      ))
                    ) : (
                      <div>{row.error_message}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Form */}
      {isEditing && (
        <JobRowEditForm
          rowNumber={row.row_number}
          editingDataRef={editingDataRef}
          onCancelEditing={onCancelEditing}
          onSaveEditing={onSaveEditing}
          referenceData={referenceData}
          user={user}
          userRole={userRole}
          isLoadingReferenceData={isLoadingReferenceData}
        />
      )}
    </>
  );
}
