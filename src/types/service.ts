export interface Service {
  id: number;
  name: string;
  description?: string;
  status: string;
  base_price?: number; // Made optional
  is_ancillary?: boolean;
  condition_type?: 'time_range' | 'additional_stops' | 'always' | null;
  condition_config?: string; // JSON string
  is_per_occurrence?: boolean;
}