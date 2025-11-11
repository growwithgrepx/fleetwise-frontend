import { z } from 'zod';

// Reasonable phone regex: allows +, digits, spaces, dashes, parentheses, min 7 digits
const phoneRegex = /^\+?[0-9\s\-()]{7,}$/;

export const jobSchema = z.object({
  customer_name: z.string().min(2, 'Customer name must be at least 2 characters'),
  customer_email: z.string().email('Invalid email address'),
  customer_mobile: z.string().regex(phoneRegex, 'Invalid phone number'),
  pickup_date: z.string().refine(
    (val) => {
      const today = new Date();
      const inputDate = new Date(val);
      // Remove time for comparison
      today.setHours(0,0,0,0);
      inputDate.setHours(0,0,0,0);
      return inputDate >= today;
    },
    { message: 'Pickup date cannot be in the past' }
  ),
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
}).refine((data) => {
  // Enforce vehicle and driver for confirmed status
  if (data.status === 'confirmed') {
    return data.vehicle_id && data.vehicle_id > 0 && data.driver_id && data.driver_id > 0;
  }
  return true;
}, {
  message: 'Vehicle and driver are required for confirmed jobs',
  path: ['vehicle_id'],
}); 