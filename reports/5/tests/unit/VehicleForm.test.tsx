import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VehicleForm from '@/components/organisms/VehicleForm';
import * as api from '@/services/api';

jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

const mockVehicle = {
  id: '1',
  name: 'Test Vehicle',
  number: 'XYZ123',
  type: 'Sedan',
  status: 'Active',
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('VehicleForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.createVehicle?.mockResolvedValue(mockVehicle);
    mockedApi.updateVehicle?.mockResolvedValue(mockVehicle);
  });

  it('renders empty fields in create mode', () => {
    render(
      <TestWrapper>
        <VehicleForm onSubmit={jest.fn()} isSubmitting={false} onBack={jest.fn()} />
      </TestWrapper>
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue('');
    expect(screen.getByLabelText(/number/i)).toHaveValue('');
  });

  it('renders with initialData in edit mode', () => {
    render(
      <TestWrapper>
        <VehicleForm initialData={mockVehicle} onSubmit={jest.fn()} isSubmitting={false} onBack={jest.fn()} />
      </TestWrapper>
    );
    expect(screen.getByLabelText(/name/i)).toHaveValue('Test Vehicle');
    expect(screen.getByLabelText(/number/i)).toHaveValue('XYZ123');
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper>
        <VehicleForm onSubmit={jest.fn()} isSubmitting={false} onBack={jest.fn()} />
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
        <VehicleForm onSubmit={onSubmit} isSubmitting={false} onBack={jest.fn()} />
      </TestWrapper>
    );
    await user.type(screen.getByLabelText(/name/i), 'Vehicle X');
    await user.type(screen.getByLabelText(/number/i), 'ABC987');
    await user.type(screen.getByLabelText(/type/i), 'SUV');
    await user.type(screen.getByLabelText(/status/i), 'Active');
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Vehicle X',
        number: 'ABC987',
        type: 'SUV',
        status: 'Active',
      });
    });
  });
}); 