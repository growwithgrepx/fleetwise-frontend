export interface Service {
  id: number;
  name: string;
  description?: string;
  status: string;
  base_price?: number; // Made optional
}