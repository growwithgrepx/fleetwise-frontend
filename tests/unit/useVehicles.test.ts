import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/services/api';
import { useGetAllVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@/hooks/useVehicles';

jest.mock('@/services/api');
const mockedApi = api as any;

const mockVehicle = {
  id: '1',
  name: 'Test Vehicle',
  number: 'XYZ123',
  type: 'Sedan',
  status: 'Active',
};

describe('useVehicles', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getVehicles?.mockResolvedValue([mockVehicle]);
    mockedApi.getVehicleById?.mockResolvedValue(mockVehicle);
    mockedApi.createVehicle?.mockResolvedValue(mockVehicle);
    mockedApi.updateVehicle?.mockResolvedValue(mockVehicle);
    mockedApi.deleteVehicle?.mockResolvedValue({});
  });

  it('fetches vehicles', async () => {
    const { result, waitFor } = renderHook(() => useGetAllVehicles(), { wrapper });
    await waitFor(() => result.current.data && result.current.data.length > 0);
    expect(result.current.data[0].name).toBe('Test Vehicle');
  });

  it('creates vehicle', async () => {
    const { result } = renderHook(() => useCreateVehicle(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: 'A', number: '', type: '', status: '' });
    });
    expect(mockedApi.createVehicle).toHaveBeenCalled();
  });

  it('updates vehicle', async () => {
    const { result } = renderHook(() => useUpdateVehicle(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: '1', name: 'B' });
    });
    expect(mockedApi.updateVehicle).toHaveBeenCalled();
  });

  it('deletes vehicle', async () => {
    const { result } = renderHook(() => useDeleteVehicle(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('1');
    });
    expect(mockedApi.deleteVehicle).toHaveBeenCalled();
  });
});
import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/services/api';
import { useGetAllVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@/hooks/useVehicles';

jest.mock('@/services/api');
const mockedApi = api as any;

const mockVehicle = {
  id: '1',
  name: 'Test Vehicle',
  number: 'XYZ123',
  type: 'Sedan',
  status: 'Active',
};

describe('useVehicles', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getVehicles?.mockResolvedValue([mockVehicle]);
    mockedApi.getVehicleById?.mockResolvedValue(mockVehicle);
    mockedApi.createVehicle?.mockResolvedValue(mockVehicle);
    mockedApi.updateVehicle?.mockResolvedValue(mockVehicle);
    mockedApi.deleteVehicle?.mockResolvedValue({});
  });

  it('fetches vehicles', async () => {
    const { result, waitFor } = renderHook(() => useGetAllVehicles(), { wrapper });
    await waitFor(() => result.current.data && result.current.data.length > 0);
    expect(result.current.data[0].name).toBe('Test Vehicle');
  });

  it('creates vehicle', async () => {
    const { result } = renderHook(() => useCreateVehicle(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: 'A', number: '', type: '', status: '' });
    });
    expect(mockedApi.createVehicle).toHaveBeenCalled();
  });

  it('updates vehicle', async () => {
    const { result } = renderHook(() => useUpdateVehicle(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: '1', name: 'B' });
    });
    expect(mockedApi.updateVehicle).toHaveBeenCalled();
  });

  it('deletes vehicle', async () => {
    const { result } = renderHook(() => useDeleteVehicle(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('1');
    });
    expect(mockedApi.deleteVehicle).toHaveBeenCalled();
  });
}); 