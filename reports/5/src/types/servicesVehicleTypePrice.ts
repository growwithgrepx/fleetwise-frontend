export interface ServicesVehicleTypePrice {
  id: number;
  service_id: number;
  vehicle_type_id: number;
  price: number;
  created_at?: string;
  updated_at?: string;
}

export interface ServicesVehicleTypePriceFormData {
  id?: number;
  service_id: number;
  vehicle_type_id: number;
  price: number;
}