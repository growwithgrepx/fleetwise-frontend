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

// Time range config schema for ancillary services
const timeRangeConfigSchema = z.object({
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format (e.g., 23:00)"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM format (e.g., 06:00)")
});

// Additional stops config schema for ancillary services
const additionalStopsConfigSchema = z.object({
  trigger_count: z.number().int().nonnegative("Must be non-negative integer")
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
  condition_config: z.string().optional()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      "Must be valid JSON"
    ),
  is_per_occurrence: z.boolean().optional(),
  // Helper fields for UI (not sent to backend, used to generate condition_config)
  time_range_start: z.string().optional(),
  time_range_end: z.string().optional(),
  additional_stops_trigger: z.number().optional(),
}).refine(
  (data) => {
    console.log('[Zod Validation] Starting schema validation with data:', { is_ancillary: data.is_ancillary, condition_type: data.condition_type, condition_config: data.condition_config });

    // If not ancillary or no condition type, validation passes
    if (!data.is_ancillary || !data.condition_type) {
      console.log('[Zod Validation] Not ancillary or no condition type, validation passes');
      return true;
    }

    // For time_range, check if we have the helper fields OR condition_config
    if (data.condition_type === 'time_range') {
      const hasHelperFields = data.time_range_start && data.time_range_end;
      const hasConditionConfig = data.condition_config;

      console.log('[Zod Validation] time_range validation:', {
        hasHelperFields,
        hasConditionConfig,
        time_range_start: data.time_range_start,
        time_range_end: data.time_range_end
      });

      // Accept if we have helper fields (they'll be converted to condition_config in the form handler)
      if (hasHelperFields) {
        console.log('[Zod Validation] time_range has helper fields, validation passes');
        return true;
      }

      // Otherwise check condition_config
      if (!hasConditionConfig) {
        console.log('[Zod Validation] time_range missing both helper fields and condition_config, validation fails');
        return false;
      }

      try {
        const config = JSON.parse(data.condition_config);
        const result = timeRangeConfigSchema.safeParse(config).success;
        console.log('[Zod Validation] time_range condition_config validation result:', result);
        return result;
      } catch {
        console.log('[Zod Validation] time_range condition_config JSON parse failed');
        return false;
      }
    }

    // For additional_stops, check if we have the helper field OR condition_config
    if (data.condition_type === 'additional_stops') {
      const hasHelperField = data.additional_stops_trigger !== undefined && data.additional_stops_trigger !== null;
      const hasConditionConfig = data.condition_config;

      console.log('[Zod Validation] additional_stops validation:', {
        hasHelperField,
        hasConditionConfig,
        additional_stops_trigger: data.additional_stops_trigger
      });

      // Accept if we have helper field (it'll be converted to condition_config in the form handler)
      if (hasHelperField) {
        console.log('[Zod Validation] additional_stops has helper field, validation passes');
        return true;
      }

      // Otherwise check condition_config
      if (!hasConditionConfig) {
        console.log('[Zod Validation] additional_stops missing both helper field and condition_config, validation fails');
        return false;
      }

      try {
        const config = JSON.parse(data.condition_config);
        const result = additionalStopsConfigSchema.safeParse(config).success;
        console.log('[Zod Validation] additional_stops condition_config validation result:', result);
        return result;
      } catch {
        console.log('[Zod Validation] additional_stops condition_config JSON parse failed');
        return false;
      }
    }

    console.log('[Zod Validation] condition_type is always or unknown, validation passes');
    return true;
  },
  {
    message: "Configuration doesn't match the selected condition type requirements",
    path: ["condition_config"]
  }
);

export const servicesVehicleTypePriceSchema = z.object({
  service_id: z.number().positive("Service is required"),
  vehicle_type_id: z.number().positive("Vehicle type is required"),
  price: z.number().positive("Price must be positive"),
});