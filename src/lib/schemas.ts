import { z } from 'zod';

// Reasonable phone regex: allows +, digits, spaces, dashes, parentheses, min 7 digits
const phoneRegex = /^\+?[0-9\s\-()]{7,}$/;

export const jobSchema = z.object({
  customer_name: z.string().min(2, 'Customer name must be at least 2 characters'),
  customer_email: z.string().email('Invalid email address'),
  customer_mobile: z.string().regex(phoneRegex, 'Invalid phone number'),
  pickup_date: z.string().min(1, 'Pickup date is required'),
  pickup_time: z.string().min(1, 'Pickup time is required'),
  pickup_location: z.string().min(5, 'Pickup location must be at least 5 characters'),
  dropoff_location: z.string().min(5, 'Drop-off location must be at least 5 characters'),
  base_price: z.preprocess((val) => Number(val), z.number())
    .refine(val => !isNaN(val), { message: 'Base price must be a number' }),

  final_price: z.preprocess((val) => Number(val), z.number())
    .refine(val => !isNaN(val), { message: 'Final price must be a number' }),

  agent_id: z.preprocess((val) => Number(val), z.number())
    .refine(val => !isNaN(val), { message: 'Agent is required' }),

  service_id: z.preprocess((val) => Number(val), z.number())
    .refine(val => !isNaN(val), { message: 'Service is required' }),

  vehicle_id: z.preprocess((val) => Number(val), z.number().optional()),
  driver_id: z.preprocess((val) => Number(val), z.number().optional()),
  status: z.string(),
  // Add other fields as needed, with correct types and validation
}); 