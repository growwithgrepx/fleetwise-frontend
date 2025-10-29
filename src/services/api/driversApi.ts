import { api } from '@/lib/api';
import type { Driver } from '@/lib/types';
export interface DriverFilters {
  search?: string;
  status?: string;
}

export interface DriversResponse {
  items: Driver[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Fetch all drivers
 */
export async function getDrivers(): Promise<Driver[]> {
  const response = await api.get<Driver[]>('/api/drivers');
  return response.data;
}

/**
 * Fetch a single driver by ID
 */
export async function getDriver(id: number): Promise<Driver> {
  const response = await api.get<Driver>(`/api/drivers/${id}`);
  return response.data;
}

/**
 * Create a new driver
 */
export async function createDriver(data: Omit<Driver, 'id' | 'created_at' | 'updated_at'>): Promise<Driver> {
  const response = await api.post<Driver>('/api/drivers', data);
  return response.data;
}

/**
 * Update an existing driver
 */
export async function updateDriver(id: number, data: Partial<Driver>): Promise<Driver> {
  const response = await api.put<Driver>(`/api/drivers/${id}`, data);
  return response.data;
}

/**
 * Delete a driver
 */
export async function deleteDriver(id: number): Promise<void> {
  await api.delete(`/api/drivers/${id}`);
}

export async function downloadDriverBillPDF(billId: number): Promise<Blob> {
  const response = await api.get(`/api/drivers/download/${billId}`, {
    responseType: "blob", // important for binary data
  });

  // Create a downloadable file URL
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  
  window.open(url, "_blank");
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 5000);

  return blob;
}