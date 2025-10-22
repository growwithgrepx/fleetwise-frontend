import { z } from 'zod';
import { Invoice } from './types';

export type JobStatus = 
  | "new" 
  | "pending" 
  | "confirmed" 
  | "otw" 
  | "ots" 
  | "pob" 
  | "jc" 
  | "sd" 
  | "canceled";

export interface Job {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_mobile: string;
  driver_id: number;
  vehicle_id: number;
  vehicle_type: string;
  vehicle_type_id?: number;
  service_id: number;
  service_type: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  pickup_time: string;
  passenger_name: string;
  passenger_email: string | null;
  passenger_mobile: string;
  status: JobStatus;
  
  // Additional pickup locations
  pickup_loc1?: string;
  pickup_loc2?: string;
  pickup_loc3?: string;
  pickup_loc4?: string;
  pickup_loc5?: string;
  pickup_loc1_price?: number;
  pickup_loc2_price?: number;
  pickup_loc3_price?: number;
  pickup_loc4_price?: number;
  pickup_loc5_price?: number;
  
  // Additional dropoff locations
  dropoff_loc1?: string;
  dropoff_loc2?: string;
  dropoff_loc3?: string;
  dropoff_loc4?: string;
  dropoff_loc5?: string;
  dropoff_loc1_price?: number;
  dropoff_loc2_price?: number;
  dropoff_loc3_price?: number;
  dropoff_loc4_price?: number;
  dropoff_loc5_price?: number;
  
  // Billing information
  base_price: number;
  job_cost?: number;
  cash_to_collect?: number;
  additional_discount: number;
  extra_charges: number;
  final_price?: number;
  base_discount_percent?: number;
  customer_discount_percent?: number;
  additional_discount_percent?: number;
  
  // Extra services
  extra_services: Array<{ description: string; price: number }>;
  
  // Invoice information
  invoice_id?: number | null;
  invoice_number?: string;
  
  // Midnight surcharge field
  midnight_surcharge?: number;
  
  // Contractor field
  contractor_id?: number;
  
  // Customer remark field
  customer_remark?: string;
  
  // Booking reference field
  booking_ref?: string;
}

export interface Location {
  location: string;
  price: number;
}

export type JobFormData = {
  // All the fields from Job interface
  customer_id?: number;
  customer_name: string;
  customer_mobile: string;
  customer_email?: string | null;
  customer_reference?: string;
  passenger_name: string;
  passenger_mobile: string;
  passenger_email?: string | null;
  service_id: number;
  service_type: string;
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_location: string;
  vehicle_id: number;
  vehicle_type: string;
  vehicle_type_id?: number;
  vehicle_number?: string;  // Add this field
  driver_id: number;
  driver_contact?: string;

  status: JobStatus;
  payment_mode: string;
  base_price: number;
  job_cost?: number;
  cash_to_collect?: number;
  additional_discount: number;
  extra_charges: number;
  final_price?: number;
  base_discount_percent: number;
  customer_discount_percent: number;
  additional_discount_percent: number;
  extra_services: Array<{ description: string; price: number }>;
  
  // Additional form-specific fields
  sub_customer_name?: string;
  message?: string;
  remarks?: string;
  has_additional_stop?: boolean;
  additional_stops?: string;
  locations?: Location[];
  reference?: string;
  has_request?: boolean;
  type_of_service?: string;

  // All location fields
  pickup_loc1?: string;
  pickup_loc2?: string;
  pickup_loc3?: string;
  pickup_loc4?: string;
  pickup_loc5?: string;
  pickup_loc1_price?: number;
  pickup_loc2_price?: number;
  pickup_loc3_price?: number;
  pickup_loc4_price?: number;
  pickup_loc5_price?: number;
  dropoff_loc1?: string;
  dropoff_loc2?: string;
  dropoff_loc3?: string;
  dropoff_loc4?: string;
  dropoff_loc5?: string;
  dropoff_loc1_price?: number;
  dropoff_loc2_price?: number;
  dropoff_loc3_price?: number;
  dropoff_loc4_price?: number;
  dropoff_loc5_price?: number;

  // Invoice Information
  invoice_id: number | null;  // Add this field with proper typing
  invoice_number?: string;
  
  // Midnight surcharge field
  midnight_surcharge?: number;
  
  // Contractor field
  contractor_id?: number;
  
  // Customer remark field
  customer_remark?: string;
  
  // Booking reference field
  booking_ref?: string;
};

// Define the schema first
export const jobSchema = z.object({
  // Customer Information
  customer_id: z.number().optional(),  // Add this line
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_email: z.string().email('Invalid email format').nullable().optional(),
  customer_mobile: z.string().min(8, 'Valid mobile number required'),
  customer_reference: z.string().optional(),
  
  // Sub Customer Information
  sub_customer_name: z.string().optional(),
  
  // Passenger Information
  passenger_name: z.string().min(1, 'Passenger name is required'),
  passenger_email: z.string().email('Invalid email format').nullable().optional(),
  passenger_mobile: z.string().min(8, 'Valid mobile number required'),
  
  // Service Details
  service_id: z.number().min(1, 'Service is required'),
  service_type: z.string().min(1, 'Service type is required'),
  type_of_service: z.string().optional(),
  
  // Dates and Times
  pickup_date: z.string().min(1, 'Pickup date is required'),
  pickup_time: z.string().min(1, 'Pickup time is required'),
  
  // Locations
  pickup_location: z.string().min(1, 'Pickup location is required'),
  dropoff_location: z.string().min(1, 'Drop-off location is required'),
  
  // Additional Pickup Locations
  pickup_loc1: z.string().optional(),
  pickup_loc2: z.string().optional(),
  pickup_loc3: z.string().optional(),
  pickup_loc4: z.string().optional(),
  pickup_loc5: z.string().optional(),
  pickup_loc1_price: z.number().min(0).default(0),
  pickup_loc2_price: z.number().min(0).default(0),
  pickup_loc3_price: z.number().min(0).default(0),
  pickup_loc4_price: z.number().min(0).default(0),
  pickup_loc5_price: z.number().min(0).default(0),
  
  // Additional Dropoff Locations
  dropoff_loc1: z.string().optional(),
  dropoff_loc2: z.string().optional(),
  dropoff_loc3: z.string().optional(),
  dropoff_loc4: z.string().optional(),
  dropoff_loc5: z.string().optional(),
  dropoff_loc1_price: z.number().min(0).default(0),
  dropoff_loc2_price: z.number().min(0).default(0),
  dropoff_loc3_price: z.number().min(0).default(0),
  dropoff_loc4_price: z.number().min(0).default(0),
  dropoff_loc5_price: z.number().min(0).default(0),
  
  // Vehicle & Driver Information
  vehicle_id: z.number().min(1, 'Vehicle is required'),
  vehicle_type: z.string().min(1, 'Vehicle type is required'),
  vehicle_number: z.string().optional(),
  driver_id: z.number().min(1, 'Driver is required'),
  driver_contact: z.string().optional(),
  
  // Status and Payment
  payment_mode: z.enum(['cash', 'card', 'invoice', 'other']).default('cash'),
  status: z.enum(['new', 'pending', 'confirmed', 'otw', 'ots', 'pob', 'jc', 'sd', 'canceled']).default('new'),
  
  // Additional Information
  message: z.string().optional(),
  remarks: z.string().optional(),
  has_additional_stop: z.boolean().default(false),
  additional_stops: z.string().optional(),
  
  // Billing Information
  base_price: z.number().min(0).default(0),
  additional_discount: z.number().min(0).default(0),
  extra_charges: z.number().min(0).default(0),
  final_price: z.number().min(0).default(0),
  base_discount_percent: z.number().min(0).max(100).default(0),
  customer_discount_percent: z.number().min(0).max(100).default(0),
  additional_discount_percent: z.number().min(0).max(100).default(0),
  
  // Invoice Information
  invoice_id: z.number().nullable().optional(),
  invoice_number: z.string().optional(),
  
  // Extra Services
  extra_services: z
    .array(
      z.object({
        description: z.string().min(1, 'Service description required'),
        price: z.number().min(0)
      })
    )
    .default([]),
  
  // UI Specific Fields
  locations: z.any().optional(),
  reference: z.string().optional(),
  has_request: z.boolean().default(false),
  
  // Contractor field
  contractor_id: z.number().optional(),
  
  // Booking reference field
  booking_ref: z.string().optional(),
});

export const defaultJobValues: JobFormData = {
  // Customer Information
  customer_id: undefined,  // Add this line
  customer_name: '',
  customer_mobile: '',
  customer_email: null,
  customer_reference: '',
  
  // Passenger Information
  passenger_name: '',
  passenger_mobile: '',
  passenger_email: null,
  
  // Service Details
  service_id: 0,
  service_type: 'Corporate Charter',
  
  // Dates and Times
  pickup_date: '',
  pickup_time: '',
  
  // Locations
  pickup_location: '',
  dropoff_location: '',
  
  // Additional Pickup Locations
  pickup_loc1: '',
  pickup_loc2: '',
  pickup_loc3: '',
  pickup_loc4: '',
  pickup_loc5: '',
  pickup_loc1_price: 0,
  pickup_loc2_price: 0,
  pickup_loc3_price: 0,
  pickup_loc4_price: 0,
  pickup_loc5_price: 0,
  
  // Additional Dropoff Locations
  dropoff_loc1: '',
  dropoff_loc2: '',
  dropoff_loc3: '',
  dropoff_loc4: '',
  dropoff_loc5: '',
  dropoff_loc1_price: 0,
  dropoff_loc2_price: 0,
  dropoff_loc3_price: 0,
  dropoff_loc4_price: 0,
  dropoff_loc5_price: 0,
  
  // Vehicle & Driver Information
  vehicle_id: 0,
  vehicle_type: '',
  vehicle_number: '',
  driver_id: 0,
  driver_contact: '',
  
  // Status and Payment
  status: 'new',
  payment_mode: 'cash',
  
  // Billing Information
  base_price: 0,
  job_cost: undefined,
  cash_to_collect: undefined,
  additional_discount: 0,
  extra_charges: 0,
  final_price: 0,
  base_discount_percent: 0,
  customer_discount_percent: 0,
  additional_discount_percent: 0,
  
  // Invoice Information
  invoice_id: null,
  invoice_number: '',
  
  // Extra Services
  extra_services: [],
  
  // Additional Fields
  sub_customer_name: '',
  message: '',
  remarks: '',
  has_additional_stop: false,
  additional_stops: '',
  locations: [],
  reference: '',
  has_request: false,
  type_of_service: '',
  
  // Contractor field
  contractor_id: undefined,
  
  // Customer remark field
  customer_remark: undefined,
  
  // Booking reference field
  booking_ref: undefined
};

// Make sure to import this in your JobForm.tsx
export type JobOrInvoice = 
  | (Job & { id: number; status?: string; invoice?: Invoice; type: 'job'  }) // add invoice here
  | (Invoice & { id: number; status?: string; type: 'invoice' });
;

export type CreateJobInput = JobFormData;
export type UpdateJobInput = {
  id: number;
  data: Partial<JobFormData>;
};

