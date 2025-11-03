export interface Driver {
  id: number;
  name: string;
  mobile?: string;
  vehicle_id?: number | null;
  vehicle?: Vehicle | null;
  status?: string;
  email?: string;
  license_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Agent {
  id: number;
  name: string;
  email: string;
  mobile: string;
  type: string;
  status: string;
  agent_discount_percent: number;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  status: string;
  base_price?: number; // Made optional
  // Decimal fields - can be sent as strings to preserve precision
  additional_ps?: number | string;
  distance_levy?: number | string;
  midnight_surcharge?: number | string;
  // Ancillary charge fields
  is_ancillary?: boolean;
  condition_type?: 'time_range' | 'additional_stops' | 'always' | null;
  condition_config?: string; // JSON string
  is_per_occurrence?: boolean;
}

export interface Vehicle {
  id: number;
  name: string;
  number: string;
  status: string;
}

export interface VehicleType {
  id: number;
  name: string;
  description: string;
  status: boolean;
  create?: string;
  update?: string;
}

export interface VehicleTypeTable {
  id: number;
  name: string;
  description: string;
  status: string; // For display in table
  create?: string;
  update?: string;
}

export interface Contractor {
  id: number;
  name: string;
  contact_person?: string;
  contact_number?: string;
  email?: string;
  status?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  users?: User[];
}

export interface User {
  id: number;
  email: string;
  password?: string;
  active: boolean;
  roles?: Role[];
  customer_id?: number;
  driver_id?: number;
  driver?: Driver;
}