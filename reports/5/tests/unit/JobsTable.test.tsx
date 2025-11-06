import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JobsTable from '@/components/organisms/JobsTable';

const jobs = [
  {
    id: 1,
    customer_name: 'John Doe',
    type_of_service: 'Airport',
    pickup_location: 'Airport',
    dropoff_location: 'Hotel',
    final_price: 100,
    status: 'Active',
    payment_status: 'Pending',
    pickup_date: '2024-01-01',
    pickup_time: '10:00',
    reference: 'REF1',
    remarks: '',
    message: '',
    invoice_number: '',
  },
  {
    id: 2,
    customer_name: 'Jane Smith',
    type_of_service: 'Mall',
    pickup_location: 'Mall',
    dropoff_location: 'Office',
    final_price: 200,
    status: 'Completed',
    payment_status: 'Paid',
    pickup_date: '2024-01-02',
    pickup_time: '12:00',
    reference: 'REF2',
    remarks: '',
    message: '',
    invoice_number: '',
  },
];

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('JobsTable', () => {
  it('renders jobs and allows selection', () => {
    const onSelectionChange = jest.fn();
    renderWithQueryClient(
      <JobsTable
        jobs={jobs}
        selectedJobIds={new Set()}
        onSelectionChange={onSelectionChange}
        columnFilters={{}}
        onColumnFilterChange={jest.fn()}
        onClearColumnFilter={jest.fn()}
      />
    );
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // select first job
    expect(onSelectionChange).toHaveBeenCalled();
  });

  it('calls onEdit and onDelete callbacks', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    renderWithQueryClient(
      <JobsTable
        jobs={jobs}
        selectedJobIds={new Set()}
        onSelectionChange={jest.fn()}
        columnFilters={{}}
        onColumnFilterChange={jest.fn()}
        onClearColumnFilter={jest.fn()}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
    // Simulate edit and delete actions
    fireEvent.click(screen.getAllByText(/edit/i)[0]);
    expect(onEdit).toHaveBeenCalled();
    fireEvent.click(screen.getAllByText(/delete/i)[0]);
    expect(onDelete).toHaveBeenCalled();
  });

  it('filters jobs by customer name', () => {
    const onColumnFilterChange = jest.fn();
    renderWithQueryClient(
      <JobsTable
        jobs={jobs}
        selectedJobIds={new Set()}
        onSelectionChange={jest.fn()}
        columnFilters={{ customer_name: '' }}
        onColumnFilterChange={onColumnFilterChange}
        onClearColumnFilter={jest.fn()}
      />
    );
    const filterInput = screen.getByPlaceholderText(/filter customer/i);
    fireEvent.change(filterInput, { target: { value: 'Jane' } });
    expect(onColumnFilterChange).toHaveBeenCalledWith('customer_name', 'Jane');
  });
}); 