import { api } from '@/lib/api';
import type { User, Role } from '@/lib/types';

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