import React from 'react';
import { HighlightedCell } from '@/components/molecules/HighlightedCell';
import { EntityTableColumn } from '@/components/organisms/EntityTable';
// Timezone conversion removed - API now returns display timezone values directly

export interface ApiJob {
  id: number | string;
  passenger_name: string;
  booking_ref?: string;
  customer_name: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  pickup_time: string;
  status: string;
  [key: string]: any;
}

export const getJobTableColumns = (search: string): EntityTableColumn<ApiJob & { stringLabel?: string }>[] => [
  {
    label: 'Job ID',
    accessor: 'id',
    filterable: true,
    stringLabel: 'Job ID',
    width: '70px',
    render: (job: ApiJob) => <HighlightedCell text={job.id} searchTerm={search} />
  },
  {
    label: 'Passenger',
    accessor: 'passenger_name',
    filterable: true,
    stringLabel: 'Passenger',
    width: '130px',
    render: (job: ApiJob) => <HighlightedCell text={job.passenger_name} searchTerm={search} />
  },
  {
    label: 'Booking Ref',
    accessor: 'booking_ref',
    filterable: true,
    stringLabel: 'Booking Ref',
    width: '110px',
    render: (job: ApiJob) => <HighlightedCell text={job.booking_ref || '-'} searchTerm={search} />
  },
  {
    label: 'Customer',
    accessor: 'customer_name',
    filterable: true,
    stringLabel: 'Customer',
    width: '140px',
    render: (job: ApiJob) => <HighlightedCell text={job.customer_name} searchTerm={search} />
  },
  {
    label: 'Pickup',
    accessor: 'pickup_location',
    filterable: true,
    stringLabel: 'Pickup',
    width: '120px',
    render: (job: ApiJob) => <HighlightedCell text={job.pickup_location} searchTerm={search} />
  },
  {
    label: 'Drop-off',
    accessor: 'dropoff_location',
    filterable: true,
    stringLabel: 'Drop-off',
    width: '120px',
    render: (job: ApiJob) => <HighlightedCell text={job.dropoff_location} searchTerm={search} />
  },
  {
    label: 'Pickup Date',
    accessor: 'pickup_date',
    filterable: true,
    stringLabel: 'Pickup Date',
    width: '100px',
    render: (job: ApiJob) => <HighlightedCell text={job.pickup_date} searchTerm={search} />
  },
  {
    label: 'Pickup Time',
    accessor: 'pickup_time',
    filterable: true,
    stringLabel: 'Pickup Time',
    width: '100px',
    render: (job: ApiJob) => {
      // API returns pickup_time in display timezone - display as-is
      return <HighlightedCell text={job.pickup_time} searchTerm={search} />;
    }
  },
  {
    label: 'Status',
    accessor: 'status',
    filterable: true,
    stringLabel: 'Status',
    width: '65px',
    render: (job: ApiJob) => <HighlightedCell text={job.status} searchTerm={search} />
  }
];
