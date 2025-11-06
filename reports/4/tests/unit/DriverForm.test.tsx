import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DriverForm from '@/components/organisms/DriverForm';
import * as api from '@/services/api';

jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

const mockDriver = {
  id: '1',
  name: 'Test Driver',
  phone: '1234567890',
  license_number: 'LIC123',
  status: 'Active',
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('DriverForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.createDriver?.mockResolvedValue(mockDriver);
    mockedApi.updateDriver?.mockResolvedValue(mockDriver);
  });

  it('renders empty fields in create mode', () => {
    render(
      <TestWrapper>
        <DriverForm onSubmit={jest.fn()} isSubmitting={false} />
      </TestWrapper>
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue('');
    expect(screen.getByLabelText(/phone/i)).toHaveValue('');
  });

  it('renders with initialData in edit mode', () => {
    render(
      <TestWrapper>
        <DriverForm initialData={mockDriver} onSubmit={jest.fn()} isSubmitting={false} />
      </TestWrapper>
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue('Test Driver');
    expect(screen.getByLabelText(/phone/i)).toHaveValue('1234567890');
    expect(screen.getByLabelText(/license/i)).toHaveValue('LIC123');
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <DriverForm onSubmit={jest.fn()} isSubmitting={false} />
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
        <DriverForm onSubmit={onSubmit} isSubmitting={false} />
      </TestWrapper>
    );
    await user.type(screen.getByLabelText(/name/i), 'Driver X');
    await user.type(screen.getByLabelText(/phone/i), '9876543210');
    await user.type(screen.getByLabelText(/license/i), 'LIC999');
    await user.type(screen.getByLabelText(/status/i), 'Active');
    await user.click(screen.getByRole('button', { name: /save|update/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Driver X',
        phone: '9876543210',
        license_number: 'LIC999',
        status: 'Active',
      });
    });
  });
}); 