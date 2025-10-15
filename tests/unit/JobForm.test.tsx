import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JobForm, { JobFormProps } from '@/components/organisms/JobForm';
import { Job, JobFormData, defaultJobValues } from '@/types/job';
import { useCustomers } from '@/hooks/useCustomers';
import { useSubCustomers } from '@/hooks/useSubCustomers';
import '@testing-library/jest-dom';

// Mocks
jest.mock('@/hooks/useCustomers');
jest.mock('@/hooks/useSubCustomers');

const mockedUseCustomers = useCustomers as jest.Mock;
const mockedUseSubCustomers = useSubCustomers as jest.Mock;

const queryClient = new QueryClient();

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const mockJob: Job = {
  ...defaultJobValues,
  id: 1,
  date: '2024-08-15',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  customer_id: 1,
  customer_name: 'Test Customer',
  customer_mobile: '1234567890',
  passenger_name: 'Test Passenger',
  pickup_date: '2024-08-15',
  pickup_time: '10:00',
  pickup_location: '123 Test St',
  dropoff_location: '456 Test Ave',
  service_type: 'Airport Transfer',
  vehicle_type: 'Sedan',
  order_status: 'scheduled',
  payment_status: 'pending',
  base_price: 100,
  base_discount_percent: 10,
  customer_discount_percent: 5,
  additional_discount_percent: 0,
  additional_charges: 20,
  final_price: 105.5,
  remarks: 'Test remarks',
};

const renderJobForm = (props: Partial<JobFormProps>) => {
  const defaultProps: JobFormProps = {
    onSave: jest.fn(),
    onCancel: jest.fn(),
  };
  return render(
    <Wrapper>
      <JobForm {...defaultProps} {...props} />
    </Wrapper>
  );
};

describe('JobForm', () => {
  beforeEach(() => {
    mockedUseCustomers.mockReturnValue({
      customers: [{ id: 1, name: 'Test Customer' }],
      isLoading: false,
      error: null,
    });
    mockedUseSubCustomers.mockReturnValue({
      subCustomers: [{ id: 101, name: 'Test SubCustomer', customer_id: 1 }],
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly for a new job', () => {
    renderJobForm({});
    expect(screen.getByLabelText(/customer name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/passenger name/i)).toHaveValue('');
    expect(screen.getByLabelText(/base price/i)).toHaveValue(0);
  });

  it('populates form fields with initial data for editing', () => {
    renderJobForm({ job: mockJob });
    expect(screen.getByLabelText(/customer name/i)).toHaveValue('Test Customer');
    expect(screen.getByLabelText(/passenger name/i)).toHaveValue('Test Passenger');
    expect(screen.getByLabelText(/pickup date/i)).toHaveValue('2024-08-15');
    expect(screen.getByLabelText(/base price/i)).toHaveValue(100);
    expect(screen.getByLabelText(/remarks/i)).toHaveValue('Test remarks');
  });

  it('updates form state on user input', async () => {
    renderJobForm({});
    const passengerNameInput = screen.getByLabelText(/passenger name/i);
    await userEvent.type(passengerNameInput, 'New Passenger');
    expect(passengerNameInput).toHaveValue('New Passenger');
  });

  it('calls onSave with the correct form data on submit', async () => {
    const handleSave = jest.fn();
    renderJobForm({ job: mockJob, onSave: handleSave });

    const passengerNameInput = screen.getByLabelText(/passenger name/i);
    await userEvent.clear(passengerNameInput);
    await userEvent.type(passengerNameInput, 'Updated Passenger');

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
      const submittedData = handleSave.mock.calls[0][0];
      expect(submittedData.passenger_name).toBe('Updated Passenger');
      expect(submittedData.base_price).toBe(100);
    });
  });

  it('calls onCancel when the back button is clicked', async () => {
    const handleCancel = jest.fn();
    renderJobForm({ onCancel: handleCancel });
    const backButton = screen.getByRole('button', { name: /back to jobs/i });
    await userEvent.click(backButton);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });
});
      expect(screen.getByLabelText(/customer mobile/i)).toHaveValue('1234567890');
      expect(screen.getByLabelText(/customer email/i)).toHaveValue('test@example.com');
      expect(screen.getByLabelText(/passenger name/i)).toHaveValue('Test Passenger');
      expect(screen.getByLabelText(/type of service/i)).toHaveValue('Airport Transfer');
      expect(screen.getByLabelText(/pickup date/i)).toHaveValue('2024-01-15');
      expect(screen.getByLabelText(/pickup time/i)).toHaveValue('10:00');
      expect(screen.getByLabelText(/pickup location/i)).toHaveValue('Changi Airport');
      expect(screen.getByLabelText(/dropoff location/i)).toHaveValue('Marina Bay Sands');
      // base_price is a number
      expect(screen.getByLabelText(/base price/i)).toHaveValue(50);
    });

    it('calls updateJob with job ID and updated payload on form submission', async () => {
      const onSuccess = jest.fn();
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <JobForm initialData={mockJob} onSuccess={onSuccess} onCancel={jest.fn()} />
        </TestWrapper>
      );
      await user.clear(screen.getByLabelText(/customer name/i));
      await user.type(screen.getByLabelText(/customer name/i), 'Updated Customer');
      await user.clear(screen.getByLabelText(/base price/i));
      await user.type(screen.getByLabelText(/base price/i), '100');
      await user.click(screen.getByRole('button', { name: /update job/i }));
      await waitFor(() => {
        expect(mockedApi.updateJob).toHaveBeenCalled();
      });
      const callArgs = mockedApi.updateJob.mock.calls[0];
      expect(callArgs[0]).toBe(1);
      expect(callArgs[1].customer_name).toBe('Updated Customer');
      expect(callArgs[1].base_price).toBe(100);
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockJob);
      });
    });
  });

  describe('State Handling', () => {
    it('disables submit button and shows loading state during API call', async () => {
      mockedApi.createJob.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockJob), 100)));
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <JobForm onSuccess={jest.fn()} onCancel={jest.fn()} />
        </TestWrapper>
      );
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/type of service/i), 'Airport Transfer');
      await user.type(screen.getByLabelText(/pickup date/i), '2024-01-15');
      await user.type(screen.getByLabelText(/pickup location/i), 'Changi Airport');
      await user.type(screen.getByLabelText(/dropoff location/i), 'Marina Bay Sands');
      const submitButton = screen.getByRole('button', { name: /create job/i });
      await user.click(submitButton);
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/creating/i)).toBeInTheDocument();
    });

    it('handles API errors gracefully', async () => {
      mockedApi.createJob.mockRejectedValue(new Error('API error'));
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <JobForm onSuccess={jest.fn()} onCancel={jest.fn()} />
        </TestWrapper>
      );
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/type of service/i), 'Airport Transfer');
      await user.type(screen.getByLabelText(/pickup date/i), '2024-01-15');
      await user.type(screen.getByLabelText(/pickup location/i), 'Changi Airport');
      await user.type(screen.getByLabelText(/dropoff location/i), 'Marina Bay Sands');
      await user.click(screen.getByRole('button', { name: /create job/i }));
      await waitFor(() => {
        expect(screen.getByText(/error: api error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for required fields', async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <JobForm onSuccess={jest.fn()} onCancel={jest.fn()} />
        </TestWrapper>
      );
      await user.click(screen.getByRole('button', { name: /create job/i }));
      await waitFor(() => {
        expect(screen.getAllByText(/customer name is required|customer name must be at least 2 characters/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/type of service is required/i)).toBeInTheDocument();
        expect(screen.getByText(/pickup date is required/i)).toBeInTheDocument();
        expect(screen.getByText(/pickup location is required/i)).toBeInTheDocument();
        expect(screen.getByText(/dropoff location is required/i)).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <JobForm onSuccess={jest.fn()} onCancel={jest.fn()} />
        </TestWrapper>
      );

      // Fill required fields
      await user.type(screen.getByLabelText(/customer name/i), 'Test Customer');
      await user.type(screen.getByLabelText(/type of service/i), 'Airport Transfer');
      await user.type(screen.getByLabelText(/pickup date/i), '2024-01-15');
      await user.type(screen.getByLabelText(/pickup location/i), 'Changi Airport');
      await user.type(screen.getByLabelText(/dropoff location/i), 'Marina Bay Sands');

      // Enter invalid email
      await user.type(screen.getByLabelText(/customer email/i), 'invalid-email');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /create job/i }));

      // Check for email validation error
      await waitFor(() => {
        expect(screen.getAllByText(/invalid email address/i).length).toBeGreaterThan(0);
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onCancel when cancel button is clicked', async () => {
      const onCancel = jest.fn();
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <JobForm onSuccess={jest.fn()} onCancel={onCancel} />
        </TestWrapper>
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onCancel).toHaveBeenCalled();
    });
  });
}); 