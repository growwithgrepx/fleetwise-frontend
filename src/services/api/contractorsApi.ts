import { api } from '@/lib/api';
import type { Contractor } from '@/lib/types';

export interface ContractorFilters {
  search?: string;
  status?: string;
}

export interface ContractorsResponse {
  items: Contractor[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ContractorPricing {
  id: number;
  contractor_id: number;
  service_id: number;
  service_name: string;
  cost: number;
}

export interface UpdateContractorPricingData {
  service_id: number;
  cost: number;
}

/**
 * Fetch all contractors
 */
export async function getContractors(): Promise<Contractor[]> {
  const response = await api.get<Contractor[]>('/api/contractors');
  return response.data;
}

/**
 * Fetch a single contractor by ID
 */
export async function getContractor(id: number): Promise<Contractor> {
  const response = await api.get<Contractor>(`/api/contractors/${id}`);
  return response.data;
}

/**
 * Create a new contractor with optional pricing data
 */
export async function createContractorWithPricing(data: Omit<Contractor, 'id'> & { pricing_data?: { service_id: number; cost: number }[] }): Promise<Contractor> {
  const response = await api.post<Contractor>('/api/contractors', data);
  return response.data;
}

/**
 * Create a new contractor
 */
export async function createContractor(data: Omit<Contractor, 'id'>): Promise<Contractor> {
  const response = await api.post<Contractor>('/api/contractors', data);
  return response.data;
}

/**
 * Update an existing contractor
 */
export async function updateContractor(id: number, data: Partial<Contractor>): Promise<Contractor> {
  const response = await api.put<Contractor>(`/api/contractors/${id}`, data);
  return response.data;
}

/**
 * Delete a contractor
 */
export async function deleteContractor(id: number): Promise<void> {
  await api.delete(`/api/contractors/${id}`);
}

/**
 * Fetch contractor pricing
 */
export async function getContractorPricing(contractorId: number): Promise<ContractorPricing[]> {
  const response = await api.get<ContractorPricing[]>(`/api/contractors/${contractorId}/pricing`);
  return response.data;
}

/**
 * Update contractor pricing for a specific service
 */
export async function updateContractorPricing(contractorId: number, serviceId: number, cost: number): Promise<ContractorPricing> {
  const response = await api.post<ContractorPricing>(`/api/contractors/${contractorId}/pricing`, {
    service_id: serviceId,
    cost: cost
  });
  return response.data;
}

/**
 * Bulk update contractor pricing
 */
export async function bulkUpdateContractorPricing(contractorId: number, pricingData: { service_id: number; cost: number }[]): Promise<ContractorPricing[]> {
  const response = await api.post<ContractorPricing[]>(`/api/contractors/${contractorId}/pricing`, {
    pricing_data: pricingData
  });
  return response.data;
}

export async function downloadContractorBillPDF(billId: number): Promise<Blob> {
  const response = await api.get(`/api/contractors/download/${billId}`, {
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
