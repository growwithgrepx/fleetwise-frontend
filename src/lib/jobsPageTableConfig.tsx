import React from 'react';
import { HighlightedCell } from '@/components/molecules/HighlightedCell';
import { EntityTableColumn } from '@/components/organisms/jobs/JobsEntityTable';
import type { ApiJob } from '@/lib/jobTableConfig';

function JobStatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase().replace(/\s+/g, '');
  const styles: Record<string, string> = {
    confirmed: 'bg-blue-600/90 text-white',
    pending: 'bg-amber-600/90 text-white',
    canceled: 'bg-red-600/90 text-white',
    cancelled: 'bg-red-600/90 text-white',
    new: 'bg-emerald-600/90 text-white',
    otw: 'bg-sky-600/90 text-white',
    ots: 'bg-indigo-600/90 text-white',
    pob: 'bg-violet-600/90 text-white',
    jc: 'bg-emerald-700/90 text-white',
    sd: 'bg-orange-700/90 text-white',
  };
  const cls = styles[s] || 'bg-zinc-600/80 text-white';
  const label = status || '—';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

export function getJobsPageTableColumns(
  search: string
): EntityTableColumn<ApiJob & { stringLabel?: string }>[] {
  return [
    {
      label: 'JOB ID',
      accessor: 'id',
      filterable: true,
      stringLabel: 'Job ID',
      width: '60px',
      filterWidth: '60px',
      render: (job) => <HighlightedCell text={String(job.id)} searchTerm={search} />,
    },
    {
      label: 'DATE',
      accessor: 'pickup_date',
      filterable: true,
      stringLabel: 'Date',
      width: '40px',
      filterWidth: '40px',
      render: (job) => <HighlightedCell text={job.pickup_date ? job.pickup_date.slice(2) : '—'} searchTerm={search} />,
    },
    {
      label: 'TIME',
      accessor: 'pickup_time',
      filterable: true,
      stringLabel: 'Time',
      width: '30px',
      filterWidth: '30px',
      render: (job) => <HighlightedCell text={job.pickup_time} searchTerm={search} />,
    },
    {
      label: 'CUSTOMER',
      accessor: 'customer_name',
      filterable: true,
      stringLabel: 'Customer',
      width: '110px',
      render: (job) => <HighlightedCell text={job.customer_name} searchTerm={search} />,
    },
    {
      label: 'BK REF',
      accessor: 'booking_ref',
      filterable: true,
      stringLabel: 'Booking Ref',
      width: '80px',
      render: (job) => <HighlightedCell text={job.booking_ref || '—'} searchTerm={search} />,
    },
    {
      label: 'SERVICE',
      accessor: 'service_type',
      filterable: true,
      stringLabel: 'Service',
      width: '110px',
      render: (job) => (
        <HighlightedCell text={job.service_type || '—'} searchTerm={search} />
      ),
    },
    {
      label: 'PICKUP',
      accessor: 'pickup_location',
      filterable: true,
      stringLabel: 'Pickup',
      width: '110px',
      render: (job) => <HighlightedCell text={job.pickup_location} searchTerm={search} />,
    },
    {
      label: 'DROP-OFF',
      accessor: 'dropoff_location',
      filterable: true,
      stringLabel: 'Drop-off',
      width: '110px',
      render: (job) => <HighlightedCell text={job.dropoff_location} searchTerm={search} />,
    },
    {
      label: 'PASSENGER',
      accessor: 'passenger_name',
      filterable: true,
      stringLabel: 'Passenger',
      width: '100px',
      render: (job) => <HighlightedCell text={job.passenger_name} searchTerm={search} />,
    },
    {
      label: 'VEHICLE',
      accessor: 'vehicle_name',
      filterable: true,
      stringLabel: 'Vehicle',
      width: '80px',
      filterWidth: '80px',
      render: (job) => <HighlightedCell text={(job as ApiJob).vehicle_name || '—'} searchTerm={search} />,
    },
    {
      label: 'VEH. NO.',
      accessor: 'vehicle_number',
      filterable: true,
      stringLabel: 'Vehicle No.',
      width: '70px',
      filterWidth: '70px',
      render: (job) => <HighlightedCell text={(job as ApiJob).vehicle_number || '—'} searchTerm={search} />,
    },
    {
      label: 'DRIVER',
      accessor: 'driver_name',
      filterable: true,
      stringLabel: 'Driver',
      width: '70px',
      filterWidth: '70px',
      render: (job) => (
        <HighlightedCell
          text={((job as ApiJob & { driver_name?: string }).driver_name || '—').split(' ')[0]}
          searchTerm={search}
        />
      ),
    },
    {
      label: 'STATUS',
      accessor: 'status',
      filterable: true,
      stringLabel: 'Status',
      width: '80px',
      render: (job) => <JobStatusBadge status={job.status} />,
    },
  ];
}
