import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ServiceForm from '@/components/organisms/ServiceForm';
import * as api from '@/services/api';

jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

const mockService = {
  id: '1',
  name: 'Test Service',
  description: 'A test service',
  base_price: 100.0,
  status: 'Active',
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('ServiceForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.createService?.mockResolvedValue(mockService);
    mockedApi.updateService?.mockResolvedValue(mockService);
  });

  it('renders empty fields in create mode', () => {
    render(
      <TestWrapper>
        <ServiceForm onSubmit={jest.fn()} isSubmitting={false} />
      </TestWrapper>
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue('');
    expect(screen.getByLabelText(/base price/i)).toHaveValue(''); // was null
  });

  it('renders with initialData in edit mode', () => {
    render(
      <TestWrapper>
        <ServiceForm initialData={mockService} onSubmit={jest.fn()} isSubmitting={false} />
      </TestWrapper>
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue('Test Service');
    expect(screen.getByLabelText(/base price/i)).toHaveValue(100.0);
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <ServiceForm onSubmit={jest.fn()} isSubmitting={false} />
      </TestWrapper>
    );
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/required/i)).toBeInTheDocument();
  });

  it('calls onSubmit with correct data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(
      <TestWrapper>
        <ServiceForm onSubmit={onSubmit} isSubmitting={false} />
      </TestWrapper>
    );
    await user.type(screen.getByLabelText(/name/i), 'Service X');
    await user.type(screen.getByLabelText(/description/i), 'Desc');
    await user.type(screen.getByLabelText(/base price/i), '55.5');
    await user.type(screen.getByLabelText(/status/i), 'Active');
    await user.click(screen.getByRole('button', { name: /save|update/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Service X',
        description: 'Desc',
        base_price: 55.5,
        status: 'Active',
      });
    });
  });
}); 