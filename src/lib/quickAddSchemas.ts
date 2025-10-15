import { z } from 'zod';

// Customer Quick Add Schema
export const customerQuickAddSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
  mobile: z.string().optional().or(z.literal('')),
  company_name: z.string().optional().or(z.literal('')),
  status: z.string().default('Active'),
});

// Service Quick Add Schema
export const serviceQuickAddSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional().or(z.literal('')),
  base_price: z.string()
    .min(1, 'Base price is required')
    .transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Base price must be a valid number');
      return num;
    })
    .refine((val) => val >= 0, 'Base price must be 0 or more'),
  status: z.string().default('Active'),
});

// Vehicle Quick Add Schema
export const vehicleQuickAddSchema = z.object({
  name: z.string().min(1, 'Vehicle name is required'),
  number: z.string().min(1, 'Vehicle number is required'),
  type: z.string().default('Sedan'),
  status: z.string().default('Active'),
});

// Driver Quick Add Schema
export const driverQuickAddSchema = z.object({
  name: z.string().min(1, 'Driver name is required'),
  mobile: z.string().optional().or(z.literal('')),
  status: z.string().default('Active'),
}); 