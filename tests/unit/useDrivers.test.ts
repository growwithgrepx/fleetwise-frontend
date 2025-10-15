import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/services/api';
import { useDrivers } from '@/hooks/useDrivers';

jest.mock('@/services/api');
const mockedApi = api as any;

const mockDriver = {
  id: 1,
  name: 'Test Driver',
  mobile: '1234567890',
  license_number: 'LIC123',
  status: 'Active',
  vehicle_id: null,
};

describe('useDrivers', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getDrivers?.mockResolvedValue([mockDriver]);
    mockedApi.getDriverById?.mockResolvedValue(mockDriver);
    mockedApi.createDriver?.mockResolvedValue(mockDriver);
    mockedApi.updateDriver?.mockResolvedValue(mockDriver);
    mockedApi.deleteDriver?.mockResolvedValue({});
  });

  it('fetches drivers', async () => {
    const { result, waitFor } = renderHook(() => useDrivers(), { wrapper });
    await waitFor(() => result.current.data);
    expect(result.current.data[0].name).toBe('Test Driver');
  });

  it('creates driver', async () => {
    const { result } = renderHook(() => useDrivers(), { wrapper });
    await act(async () => {
      await result.current.createDriver({ name: 'A', mobile: '', license_number: '', status: '', vehicle_id: null });
    });
    expect(mockedApi.createDriver).toHaveBeenCalled();
  });

  it('updates driver', async () => {
    const { result } = renderHook(() => useDrivers(), { wrapper });
    await act(async () => {
      await result.current.updateDriver(1, { name: 'B' });
    });
    expect(mockedApi.updateDriver).toHaveBeenCalled();
  });

  it('deletes driver', async () => {
    const { result } = renderHook(() => useDrivers(), { wrapper });
    await act(async () => {
      await result.current.deleteDriver(1);
    });
    expect(mockedApi.deleteDriver).toHaveBeenCalled();
  });
});
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as api from '@/services/api';
import { useDrivers } from '@/hooks/useDrivers';

jest.mock('@/services/api');
const mockedApi = api as any;

const mockDriver = {
  id: 1,
  name: 'Test Driver',
  mobile: '1234567890',
  license_number: 'LIC123',
  status: 'Active',
  vehicle_id: null,
};

describe('useDrivers', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getDrivers?.mockResolvedValue([mockDriver]);
    mockedApi.getDriverById?.mockResolvedValue(mockDriver);
    mockedApi.createDriver?.mockResolvedValue(mockDriver);
    mockedApi.updateDriver?.mockResolvedValue(mockDriver);
    mockedApi.deleteDriver?.mockResolvedValue({});
  });

  it('fetches drivers', async () => {
    const { result, waitFor } = renderHook(() => useDrivers(), { wrapper });
    await waitFor(() => result.current.data);
    expect(result.current.data[0].name).toBe('Test Driver');
  });

  it('creates driver', async () => {
    const { result } = renderHook(() => useDrivers(), { wrapper });
    await act(async () => {
      await result.current.createDriver({ name: 'A', mobile: '', license_number: '', status: '', vehicle_id: null });
    });
    expect(mockedApi.createDriver).toHaveBeenCalled();
  });

  it('updates driver', async () => {
    const { result } = renderHook(() => useDrivers(), { wrapper });
    await act(async () => {
      await result.current.updateDriver(1, { name: 'B' });
    });
    expect(mockedApi.updateDriver).toHaveBeenCalled();
  });

  it('deletes driver', async () => {
    const { result } = renderHook(() => useDrivers(), { wrapper });
    await act(async () => {
      await result.current.deleteDriver(1);
    });
    expect(mockedApi.deleteDriver).toHaveBeenCalled();
  });
});