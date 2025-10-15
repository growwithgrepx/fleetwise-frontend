import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/services/api';
import { useGetAllServices, useCreateService, useUpdateService, useDeleteService } from '@/hooks/useServices';

jest.mock('@/services/api');
const mockedApi = api as any;

const mockService = {
  id: '1',
  name: 'Test Service',
  description: 'A test service',
  base_price: 100.0,
  status: 'Active',
};

describe('useServices', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getServices?.mockResolvedValue([mockService]);
    mockedApi.getServiceById?.mockResolvedValue(mockService);
    mockedApi.createService?.mockResolvedValue(mockService);
    mockedApi.updateService?.mockResolvedValue(mockService);
    mockedApi.deleteService?.mockResolvedValue({});
  });

  it('fetches services', async () => {
    const { result, waitFor } = renderHook(() => useGetAllServices(), { wrapper });
    await waitFor(() => result.current.data && result.current.data.length > 0);
    expect(result.current.data[0].name).toBe('Test Service');
  });

  it('creates service', async () => {
    const { result } = renderHook(() => useCreateService(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: 'A', description: '', base_price: 0, status: '' });
    });
    expect(mockedApi.createService).toHaveBeenCalled();
  });

  it('updates service', async () => {
    const { result } = renderHook(() => useUpdateService(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: '1', name: 'B' });
    });
    expect(mockedApi.updateService).toHaveBeenCalled();
  });

  it('deletes service', async () => {
    const { result } = renderHook(() => useDeleteService(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('1');
    });
    expect(mockedApi.deleteService).toHaveBeenCalled();
  });
});
import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/services/api';
import { useGetAllServices, useCreateService, useUpdateService, useDeleteService } from '@/hooks/useServices';

jest.mock('@/services/api');
const mockedApi = api as any;

const mockService = {
  id: '1',
  name: 'Test Service',
  description: 'A test service',
  base_price: 100.0,
  status: 'Active',
};

describe('useServices', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getServices?.mockResolvedValue([mockService]);
    mockedApi.getServiceById?.mockResolvedValue(mockService);
    mockedApi.createService?.mockResolvedValue(mockService);
    mockedApi.updateService?.mockResolvedValue(mockService);
    mockedApi.deleteService?.mockResolvedValue({});
  });

  it('fetches services', async () => {
    const { result, waitFor } = renderHook(() => useGetAllServices(), { wrapper });
    await waitFor(() => result.current.data && result.current.data.length > 0);
    expect(result.current.data[0].name).toBe('Test Service');
  });

  it('creates service', async () => {
    const { result } = renderHook(() => useCreateService(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: 'A', description: '', base_price: 0, status: '' });
    });
    expect(mockedApi.createService).toHaveBeenCalled();
  });

  it('updates service', async () => {
    const { result } = renderHook(() => useUpdateService(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: '1', name: 'B' });
    });
    expect(mockedApi.updateService).toHaveBeenCalled();
  });

  it('deletes service', async () => {
    const { result } = renderHook(() => useDeleteService(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('1');
    });
    expect(mockedApi.deleteService).toHaveBeenCalled();
  });
});

import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/services/api';
import { useGetAllServices, useCreateService, useUpdateService, useDeleteService } from '@/hooks/useServices';

jest.mock('@/services/api');
const mockedApi = api as any;

const mockService = {
  id: '1',
  name: 'Test Service',
  description: 'A test service',
  base_price: 100.0,
  status: 'Active',
};

describe('useServices', () => {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getServices?.mockResolvedValue([mockService]);
    mockedApi.getServiceById?.mockResolvedValue(mockService);
    mockedApi.createService?.mockResolvedValue(mockService);
    mockedApi.updateService?.mockResolvedValue(mockService);
    mockedApi.deleteService?.mockResolvedValue({});
  });

  it('fetches services', async () => {
    const { result, waitFor } = renderHook(() => useGetAllServices(), { wrapper });
    await waitFor(() => result.current.data && result.current.data.length > 0);
    expect(result.current.data[0].name).toBe('Test Service');
  });

  it('creates service', async () => {
    const { result } = renderHook(() => useCreateService(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: 'A', description: '', base_price: 0, status: '' });
    });
    expect(mockedApi.createService).toHaveBeenCalled();
  });

  it('updates service', async () => {
    const { result } = renderHook(() => useUpdateService(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: '1', name: 'B' });
    });
    expect(mockedApi.updateService).toHaveBeenCalled();
  });

  it('deletes service', async () => {
    const { result } = renderHook(() => useDeleteService(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('1');
    });
    expect(mockedApi.deleteService).toHaveBeenCalled();
  });
});