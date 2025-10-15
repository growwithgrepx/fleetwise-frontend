import type { Customer, SubCustomer, SubCustomerFormData } from '@/types/customer';

// CUSTOMERS
export async function getCustomers(): Promise<Customer[]> {
  const res = await fetch('/api/customers');
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

export async function getCustomerById(id: string | number): Promise<Customer> {
  const res = await fetch(`/api/customers/${id}`);
  if (!res.ok) throw new Error('Failed to fetch customer');
  return res.json();
}

export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  // Filter out fields that don't exist in the backend model
  const filteredData = filterCustomerData(data);
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filteredData),
  });
  if (!res.ok) throw new Error('Failed to create customer');
  return res.json();
}

const ALLOWED_CUSTOMER_FIELDS = [
  'name', 'email', 'mobile', 'company_name', 'status',
  'address', 'city', 'state', 'zip_code', 'country', 'type'
];

function filterCustomerData(data: Partial<Customer>) {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => ALLOWED_CUSTOMER_FIELDS.includes(key))
  );
}

export async function updateCustomer(id: string | number, data: Partial<Customer>): Promise<Customer> {
  const filteredData = filterCustomerData(data);
  const res = await fetch(`/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filteredData),
  });
  if (!res.ok) {
    let msg = 'Failed to update customer';
    try {
      const err = await res.json();
      if (err && err.error) msg = err.error;
      else if (typeof err === 'object' && Object.keys(err).length > 0) msg = JSON.stringify(err);
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function deleteCustomer(id: string | number): Promise<void> {
  const res = await fetch(`/api/customers/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to delete customer');
}

// ============================================================================
// SUB-CUSTOMERS - MOCKED API
// ============================================================================
// NOTE: These are mock functions and do not call a real API endpoint.

const mockSubCustomers: SubCustomer[] = [
  { id: 1, name: 'Sub Customer A', email: 'suba@example.com', mobile: '11112222', customerId: 1 },
  { id: 2, name: 'Sub Customer B', email: 'subb@example.com', mobile: '33334444', customerId: 1 },
];

export async function getSubCustomers(customerId: number): Promise<SubCustomer[]> {
  console.log(`Fetching sub-customers for customerId: ${customerId}`);
  // In a real scenario, you would filter by customerId
  return Promise.resolve(mockSubCustomers);
}

export async function createSubCustomer(data: SubCustomerFormData): Promise<SubCustomer> {
  const newSubCustomer: SubCustomer = {
    id: Math.floor(Math.random() * 1000) + 3, // mock ID
    ...data,
  };
  mockSubCustomers.push(newSubCustomer);
  return Promise.resolve(newSubCustomer);
}

// export async function createCustomerServicePricing(payload: any[]) {
//   const res = await fetch("/api/customer_service_pricing", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload), // array of objects
//   });

//   if (!res.ok) {
//     const err = await res.json().catch(() => ({}));
//     throw new Error(err.error || "Failed to create customer service pricing");
//   }
//   return res.json();
// }

//worked
// export async function createCustomerServicePricing(payloads: any[]) {
//   for (const payload of payloads) {
//     const res = await fetch("/api/customer_service_pricing", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload), // single object
//     });

//     if (!res.ok) {
//       const err = await res.json().catch(() => ({}));
//       console.error("Failed for payload:", payload, err);
//       // Optionally continue or throw error
//       throw new Error(err.error || "Failed to create customer service pricing");
//     } else {
//       const data = await res.json();
//       console.log("Success for payload:", payload, data);
//     }
//   }
// }

// export async function createCustomerServicePricing(payloads: any[]) {
//   for (const payload of payloads) {
//     try {
//       const res = await fetch("/api/customer_service_pricing", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const err = await res.json().catch(() => ({}));
//         if (res.status === 409) {
//           console.warn("Duplicate entry skipped:", payload);
//           continue; // skip this payload and continue
//         }
//         throw new Error(err.error || "Failed to create customer service pricing");
//       }

//       const data = await res.json();
//       console.log("Success for payload:", payload.service_id, data);
//     } catch (error) {
//       console.error("Error sending payload:", payload, error);
//     }
//   }
// }

export async function createCustomerServicePricing(payloads: any[]) {
  const failedPayloads: any[] = [];

  for (const payload of payloads) {
    try {
      const res = await fetch("/api/customer_service_pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409) {
          console.warn("Duplicate entry skipped:", payload);
          continue;
        }
        failedPayloads.push({ payload, error: err.error || "Failed to create customer service pricing" });
      } else {
        const data = await res.json();
        console.log("Success for payload:", payload.service_id, data);
      }
    } catch (error) {
      failedPayloads.push({ payload, error });
    }
  }

  if (failedPayloads.length > 0) {
    throw new Error(`Pricing creation failed for ${failedPayloads.length} payload(s): ${JSON.stringify(failedPayloads)}`);
  }
}
