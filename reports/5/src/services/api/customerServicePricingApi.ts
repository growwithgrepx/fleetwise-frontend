export interface CustomerServicePricing {
  id: number;
  cust_id: number;
  service_id: number;
  vehicle_type_id: number;
  price: number;
  transfer_per_way: number;
  additional_stop: number | null;
  distance_levy: number | null;
  midnight_surcharge: number | null;
  DS_Hourly_Charter: number | null;
  DS_Midnight_Surcharge: number | null;
  min_hours?: number; // Add min_hours property as optional
}

export async function getCustomerServicePricing(
  customerId: number, 
  serviceName: string,
  vehicleType?: string | any
): Promise<CustomerServicePricing | null> {
  try {
    // Normalize vehicleType to a string if an object was passed
    let safeVehicleType: string | undefined;
    if (!vehicleType) {
      safeVehicleType = undefined;
    } else if (typeof vehicleType === 'string') {
      safeVehicleType = vehicleType;
    } else if (typeof vehicleType === 'object') {
      // Try common keys used across the app
      safeVehicleType = vehicleType.name || vehicleType.label || vehicleType.title || vehicleType.value;
  // If still falsy, avoid sending generic Object string like '[object Object]'
  if (!safeVehicleType) {
        // Try to stringify if it's a plain object with a useful toString, otherwise leave undefined
        try {
          const s = JSON.stringify(vehicleType);
          // If JSON.stringify yields something useful (not '{}'), use it
          if (s && s !== '{}' && s !== 'null') safeVehicleType = s;
        } catch (e) {
          // ignore stringify errors and keep safeVehicleType undefined
        }
      }
    } else {
      safeVehicleType = String(vehicleType);
    }

    let url = `/api/customer_service_pricing/lookup?cust_id=${customerId}&service_name=${encodeURIComponent(serviceName)}`;
    if (safeVehicleType) {
      // Protect against accidentally sending the default Object string
      if (safeVehicleType === '[object Object]') {
        // don't include vehicle_type param if it's the generic object string
      } else {
        url += `&vehicle_type=${encodeURIComponent(safeVehicleType)}`;
      }
    }
    const res = await fetch(url);
    
    if (res.status === 404) {
      // No pricing found - this is expected for some customer/service combinations
      return null;
    }
    
    if (!res.ok) {
      throw new Error('Failed to fetch customer service pricing');
    }
    
    return res.json();
  } catch (error) {
    console.warn('Could not fetch customer service pricing:', error);
    return null;
  }
}

export async function getAllCustomerServicePricing(customerId?: number): Promise<CustomerServicePricing[]> {
  const params = customerId ? `?cust_id=${customerId}` : '';
  const res = await fetch(`/api/customer_service_pricing${params}`);
  if (!res.ok) throw new Error('Failed to fetch customer service pricing records');
  return res.json();
}

export async function createCustomerServicePricing(data: Omit<CustomerServicePricing, 'id'>): Promise<CustomerServicePricing> {
  const res = await fetch('/api/customer_service_pricing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create customer service pricing');
  return res.json();
}

export async function updateCustomerServicePricing(
  id: number, 
  data: Partial<CustomerServicePricing>
): Promise<CustomerServicePricing> {
  const res = await fetch(`/api/customer_service_pricing/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update customer service pricing');
  return res.json();
}

export async function deleteCustomerServicePricing(id: number): Promise<void> {
  const res = await fetch(`/api/customer_service_pricing/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to delete customer service pricing');
}