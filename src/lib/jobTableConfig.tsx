/**
 * jobTableConfig.tsx
 * ------------------
 * Defines columns for the Jobs list table via EntityTable.
 *
 * Changes for "Job Page Compact Layout":
 *  – Added `driver_name` column (after Passenger)
 *  – Added `type_of_service` column (after Driver)
 *  – Renamed "Pickup Date" → "Date", "Pickup Time" → "Time"
 *  – Reduced column widths slightly for a more compact view
 *
 * Column order:
 *   Job ID | Booking Ref | Customer | Passenger | Driver | Service |
 *   Pickup | Drop-off | Date | Time | Status
 */
import React from 'react';
import { HighlightedCell } from '@/components/molecules/HighlightedCell';
import { EntityTableColumn } from '@/components/organisms/EntityTable';

export interface ApiJob {
  id: number | string;
  passenger_name: string;
  booking_ref?: string;
  customer_name: string;
  driver_name?: string;
  type_of_service?: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  pickup_time: string;
  status: string;
  [key: string]: any;
}

export const getJobTableColumns = (
  search: string,
): EntityTableColumn<ApiJob & { stringLabel?: string }>[] => [
  {
    label: 'Job ID',
    accessor: 'id',
    filterable: true,
    stringLabel: 'Job ID',
    width: '60px',
    render: (job: ApiJob) => <HighlightedCell text={job.id} searchTerm={search} maxWidth="60px" />,
  },
  {
    label: 'Booking Ref',
    accessor: 'booking_ref',
    filterable: true,
    stringLabel: 'Booking Ref',
    width: '100px',
    render: (job: ApiJob) => (
      <HighlightedCell text={job.booking_ref || '-'} searchTerm={search} maxWidth="100px" />
    ),
  },
  {
    label: 'Customer',
    accessor: 'customer_name',
    filterable: true,
    stringLabel: 'Customer',
    width: '130px',
    render: (job: ApiJob) => (
      <HighlightedCell text={job.customer_name} searchTerm={search} maxWidth="130px" />
    ),
  },
  {
    label: 'Passenger',
    accessor: 'passenger_name',
    filterable: true,
    stringLabel: 'Passenger',
    width: '120px',
    render: (job: ApiJob) => (
      <HighlightedCell text={job.passenger_name} searchTerm={search} maxWidth="120px" />
    ),
  },
  // ── NEW columns (Job Page Compact Layout) ────────────────────────────────
  {
    label: 'Driver',
    accessor: 'driver_name',
    filterable: true,
    stringLabel: 'Driver',
    width: '110px',
    render: (job: ApiJob) => (
      <HighlightedCell text={job.driver_name || '-'} searchTerm={search} maxWidth="110px" />
    ),
  },
  {
    label: 'Service',
    accessor: 'type_of_service',
    filterable: true,
    stringLabel: 'Service',
    width: '130px',
    render: (job: ApiJob) => (
      <HighlightedCell text={job.type_of_service || '-'} searchTerm={search} maxWidth="130px" />
    ),
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    label: 'Pickup',
    accessor: 'pickup_location',
    filterable: true,
    stringLabel: 'Pickup',
    width: '115px',
    render: (job: ApiJob) => (
      <HighlightedCell text={job.pickup_location} searchTerm={search} maxWidth="115px" />
    ),
  },
  {
    label: 'Drop-Off',
    accessor: 'dropoff_location',
    filterable: true,
    stringLabel: 'Drop-Off',
    width: '115px',
    render: (job: ApiJob) => (
      <HighlightedCell text={job.dropoff_location} searchTerm={search} maxWidth="115px" />
    ),
  },
  {
    // Renamed from "Pickup Date" → "Date" for compact headers
    label: 'Date',
    accessor: 'pickup_date',
    filterable: true,
    stringLabel: 'Date',
    width: '90px',
    render: (job: ApiJob) => (
      <HighlightedCell text={job.pickup_date} searchTerm={search} maxWidth="90px" />
    ),
  },
  {
    // Renamed from "Pickup Time" → "Time" for compact headers
    label: 'Time',
    accessor: 'pickup_time',
    filterable: true,
    stringLabel: 'Time',
    width: '70px',
    render: (job: ApiJob) => (
      // API returns pickup_time in display timezone – show as-is
      <HighlightedCell text={job.pickup_time} searchTerm={search} maxWidth="70px" />
    ),
  },
  {
    label: 'Status',
    accessor: 'status',
    filterable: true,
    stringLabel: 'Status',
    width: '60px',
    render: (job: ApiJob) => (
      <HighlightedCell text={job.status} searchTerm={search} maxWidth="60px" />
    ),
  },
];
