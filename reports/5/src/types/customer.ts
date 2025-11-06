import type { EntityStatus, Job, CustomerDiscount } from './types';

export interface Customer {
  id: number;
  name: string;
  email: string;
  mobile: string;
  type: string;
  status: EntityStatus;
  customer_discount_percent: number;
  jobs?: Job[];
  discounts?: CustomerDiscount[];
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  company_name?: string;
}

export interface SubCustomer {
  id: number;
  name: string;
  email: string;
  mobile: string;
  customerId: number;
}

export type SubCustomerFormData = Omit<SubCustomer, 'id'>;