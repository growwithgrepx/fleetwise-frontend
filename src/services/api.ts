// API entry point: re-export domain modules
// export * from './api/jobsApi';
// export * from './api/customersApi';
// export * from './api/settingsApi';
// //export * from './api/customerServicePricingApi';
// export * from './api/customerServicePricingApi'
// TODO: Modularize and re-export other domain APIs (drivers, etc.) here 
//export { createCustomerServicePricing } from "./api/customerServicePricingApi";
export * from './api/jobsApi';
export * from './api/customersApi';
export * from './api/settingsApi';
export * from './api/authApi';
export * from './api/servicesVehicleTypePriceApi';
//export * from './api/customerServicePricingApi';
export {
  createCustomerServicePricing as createCustomerServicePricingForService,
  updateCustomerServicePricing,
  deleteCustomerServicePricing
} from './api/customerServicePricingApi';

// Export our new service
export * from './api/servicesWithAllPricingApi';

// TODO: Modularize and re-export other domain APIs (drivers, etc.) here 
//export { createCustomerServicePricing } from "./api/customerServicePricingApi";
import type { Driver, Service, Vehicle, VehicleType } from '@/lib/types';
import type { ServiceResponse } from '@/lib/apiTypes';

// DRIVERS
export async function getDrivers(): Promise<Driver[]> {
  const res = await fetch('/api/drivers');
  if (!res.ok) throw new Error('Failed to fetch drivers');
  return res.json();
}
export async function getDriver(id: string | number): Promise<Driver> {
  const res = await fetch(`/api/drivers/${id}`);
  if (!res.ok) throw new Error('Failed to fetch driver');
  return res.json();
}
export async function createDriver(data: Omit<Driver, 'id'>): Promise<Driver> {
  const res = await fetch('/api/drivers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create driver');
  return res.json();
}
export async function updateDriver(id: string | number, data: Partial<Driver>): Promise<Driver> {
  const res = await fetch(`/api/drivers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update driver');
  return res.json();
}
export async function deleteDriver(id: string | number): Promise<void> {
  const res = await fetch(`/api/drivers/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to delete driver');
}

// SERVICES
export async function getServices(): Promise<Service[]> {
  const res = await fetch('/api/services');
  if (!res.ok) throw new Error('Failed to fetch services');
  const json = await res.json();
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (Array.isArray(json.items)) return json.items;
  return [];
}
export async function getServiceById(id: number): Promise<Service> {
  const res = await fetch(`/api/services/${id}`);
  if (!res.ok) throw new Error('Failed to fetch service');
  return res.json();
}
export async function createService(data: Omit<Service, 'id'>): Promise<ServiceResponse> {
  const res = await fetch('/api/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const responseData = await res.json();

  if (!res.ok) {
    // Handle error response
    throw new Error(responseData.error || 'Failed to create service');
  }

  // Validate response structure
  let service: Service;
  let message: string | undefined;

  if (responseData.data && typeof responseData.data === 'object' && 'id' in responseData.data) {
    // New format: {data: Service, message: string}
    service = responseData.data;
    message = responseData.message;
  } else if (typeof responseData === 'object' && 'id' in responseData) {
    // Backward compatibility: response is Service directly
    service = responseData;
    message = responseData.message;
  } else {
    throw new Error('Invalid service response structure from server');
  }

  return { service, message };
}
export async function updateService(id: number, data: Partial<Service>): Promise<Service> {
  const res = await fetch(`/api/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update service');
  return res.json();
}
export async function deleteService(id: number): Promise<void> {
  const res = await fetch(`/api/services/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to delete service');
}

// SUB-CUSTOMERS (mocked)
export async function getSubCustomers(customerId: number): Promise<{ id: number; name: string }[]> {
  // TODO: replace with real endpoint /api/customers/{id}/sub-customers
  return Promise.resolve([
    { id: 1, name: 'Marketing Dept' },
    { id: 2, name: 'Finance Dept' }
  ]);
}
export async function createSubCustomer(customerId: number, name: string): Promise<{ id: number; name: string }> {
  // TODO: replace with POST /api/customers/{id}/sub-customers
  return Promise.resolve({ id: Math.floor(Math.random() * 10000), name });
}

// VEHICLES
export async function getVehicles(): Promise<Vehicle[]> {
  const res = await fetch('/api/vehicles');
  if (!res.ok) throw new Error('Failed to fetch vehicles');
  return res.json();
}
export async function getVehicleById(id: number): Promise<Vehicle> {
  const res = await fetch(`/api/vehicles/${id}`);
  if (!res.ok) throw new Error('Failed to fetch vehicle');
  return res.json();
}
export async function createVehicle(data: Omit<Vehicle, 'id'>): Promise<Vehicle> {
  const res = await fetch('/api/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create vehicle');
  return res.json();
}
export async function updateVehicle(id: number, data: Partial<Vehicle>): Promise<Vehicle> {
  const res = await fetch(`/api/vehicles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update vehicle');
  return res.json();
}
export async function deleteVehicle(id: number): Promise<void> {
  const res = await fetch(`/api/vehicles/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to delete vehicle');
}

// VEHICLE TYPES
export async function getVehicleTypes(): Promise<VehicleType[]> {
  const res = await fetch('/api/vehicle-types');
  if (!res.ok) throw new Error('Failed to fetch vehicle types');
  return res.json();
}
export async function getVehicleTypeById(id: number): Promise<VehicleType> {
  const res = await fetch(`/api/vehicle-types/${id}`);
  if (!res.ok) throw new Error('Failed to fetch vehicle type');
  return res.json();
}
export async function createVehicleType(data: Omit<VehicleType, 'id'>): Promise<VehicleType> {
  const res = await fetch('/api/vehicle-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create vehicle type');
  return res.json();
}
export async function updateVehicleType(id: number, data: Partial<VehicleType>): Promise<VehicleType> {
  const res = await fetch(`/api/vehicle-types/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update vehicle type');
  return res.json();
}
export async function deleteVehicleType(id: number): Promise<void> {
  const res = await fetch(`/api/vehicle-types/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to delete vehicle type');
}

