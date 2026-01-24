import { api } from '@/lib/api';
import type { User, Role } from '@/lib/types';
import type { Driver } from '@/lib/types';
import type { Customer } from '@/types/customer';

export interface UserFilters {
  search?: string;
  status?: string;
}

export interface UsersResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Fetch all users
 */
export async function getUsers(): Promise<User[]> {
  const response = await api.get<User[]>('/api/auth/users');
  return response.data;
}

/**
 * Fetch a single user by ID
 */
export async function getUser(id: number): Promise<User> {
  const response = await api.get<User>(`/api/auth/users/${id}`);
  return response.data;
}

/**
 * Create a new user
 */
export async function createUser(data: Partial<User>): Promise<User> {
  const response = await api.post<User>('/api/auth/users', data);
  return response.data;
}

/**
 * Update an existing user
 */
export async function updateUser(id: number, data: Partial<User>): Promise<User> {
  const response = await api.put<User>(`/api/auth/users/${id}`, data);
  return response.data;
}

/**
 * Delete a user (soft delete - make inactive)
 */
export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/api/auth/users/${id}`);
}

/**
 * Activate a user (set active to true)
 */
export async function activateUser(id: number): Promise<User> {
  const response = await api.put<User>(`/api/auth/users/${id}`, { active: true });
  return response.data;
}

/**
 * Fetch all roles
 */
export async function getRoles(): Promise<Role[]> {
  const response = await api.get<Role[]>('/api/roles');
  return response.data;
}

/**
 * Fetch a single role by ID
 */
export async function getRole(id: number): Promise<Role> {
  const response = await api.get<Role>(`/api/roles/${id}`);
  return response.data;
}

/**
 * Create a new role
 */
export async function createRole(data: Partial<Role>): Promise<Role> {
  const response = await api.post<Role>('/api/roles', data);
  return response.data;
}

/**
 * Update an existing role
 */
export async function updateRole(id: number, data: Partial<Role>): Promise<Role> {
  const response = await api.put<Role>(`/api/roles/${id}`, data);
  return response.data;
}

/**
 * Delete a role
 */
export async function deleteRole(id: number): Promise<void> {
  await api.delete(`/api/roles/${id}`);
}

/**
 * Assign a customer or driver to a user
 */
export async function assignCustomerOrDriver(userId: number, userType: 'customer' | 'driver', entityId: number): Promise<User> {
  const response = await api.put<User>(`/api/auth/users/${userId}/assign`, {
    user_type: userType,
    entity_id: entityId
  });
  return response.data;
}

/**
 * Fetch unassigned drivers
 */
export async function getUnassignedDrivers(): Promise<Driver[]> {
  const response = await api.get<Driver[]>('/api/auth/users/unassigned-drivers');
  return response.data;
}

/**
 * Fetch unassigned customers
 */
export async function getUnassignedCustomers(): Promise<Customer[]> {
  const response = await api.get<Customer[]>('/api/auth/users/unassigned-customers');
  return response.data;
}

/**
 * Fetch a specific driver by ID
 */
export async function getDriverById(driverId: number): Promise<Driver> {
  const response = await api.get<Driver>(`/api/drivers/${driverId}`);
  return response.data;
}

/**
 * Fetch a specific customer by ID
 */
export async function getCustomerById(customerId: number): Promise<Customer> {
  const response = await api.get<Customer>(`/api/customers/${customerId}`);
  return response.data;
}

/**
 * Admin change password for a user
 */
export async function adminChangePassword(userId: number, newPassword: string, confirmPassword: string): Promise<{ message: string } | { error: string }> {
  try {
    const response = await api.put<{ message: string }>(`/api/auth/users/${userId}/admin-change-password`, {
      new_password: newPassword,
      confirm_password: confirmPassword
    });
    return response.data;
  } catch (error: any) {
    return { error: error?.message ?? 'Failed to change password' };
  }
}
