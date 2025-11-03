import { z } from "zod";

export const agentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional(),
  mobile: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  agent_discount_percent: z.number().optional(),
});

export const vehicleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  number: z.string().min(1, "Number is required"),
  status: z.string().optional(),
});

export const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  base_price: z.number().optional(),
  status: z.string().optional(),
  // Decimal fields - accept numbers with optional defaults
  additional_ps: z.number().optional(),
  distance_levy: z.number().optional(),
  midnight_surcharge: z.number().optional(),
  // Ancillary charge fields
  is_ancillary: z.boolean().optional(),
  condition_type: z.enum(['time_range', 'additional_stops', 'always']).nullable().optional(),
  condition_config: z.string().optional(),
  is_per_occurrence: z.boolean().optional(),
});

export const servicesVehicleTypePriceSchema = z.object({
  service_id: z.number().positive("Service is required"),
  vehicle_type_id: z.number().positive("Vehicle type is required"),
  price: z.number().positive("Price must be positive"),
});