"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { CustomerForm, CustomerFormValues } from "@/components/organisms/CustomerForm";
import { useGetCustomerById, useUpdateCustomer } from "@/hooks/useCustomers";
import type { Customer } from "@/types/customer";



// const updateCustomerServicePricing = async (payload: any) => {
//   const { pricing_id, ...rest } = payload;
//   const res = await fetch(`/api/customer_service_pricing/${pricing_id}`, {
//     method: "PUT",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(rest),
//   });
//   if (!res.ok) throw new Error(`Failed to update pricing: ${res.statusText}`);
//   return res.json();
// };

// Fetch pricing for a customer
// const fetchCustomerPricing = async (cust_id: string) => {
//   const res = await fetch(`/api/customer_service_pricing?cust_id=${cust_id}`);
//   if (!res.ok) throw new Error(`Failed to fetch pricing for cust_id=${cust_id}`);
//   return res.json();
// };

// Map pricingData array to CustomerFormValues.pricing
type Service = {
  id: number;
  name: string;
  status?: string;
};

type CustomerMatrixResponse = {
  services: { id: number; name: string }[];
  vehicle_types: { id: number; name: string }[];
  matrix: { vehicle_type_id: number; prices: Record<string, number | null> }[];
};
type PricingRow = {
  id: number;
  cust_id: number;
  vehicle_type_id: number;
  service_id: number;
  price: number | null;
};

async function fetchCustomerMatrix(custId: string): Promise<CustomerMatrixResponse> {
try {
  // 1) get headers (services + vehicle types)
  const headersRes = await fetch(`/api/pricing-matrix/defaults`);
  if (!headersRes.ok) throw new Error(`Defaults fetch failed: HTTP ${headersRes.status}`);
  const headers: CustomerMatrixResponse = await headersRes.json();

  // 2) get existing pricing rows for this customer (ok if none or 404)
  let rows: PricingRow[] = [];
  try {
    const r = await fetch(`/api/customer_service_pricing?cust_id=${custId}`);
    if (r.ok) {
      rows = await r.json();
    } else if (r.status !== 404) {
      // log other server errors but continue with zeros
      const msg = await r.text().catch(() => "");
      console.warn(`GET /api/customer_service_pricing?cust_id=${custId} failed: ${r.status} ${msg}`);
    }
  } catch (err) {
    // network error -> treat as no rows and continue
    console.warn(`GET /api/customer_service_pricing?cust_id=${custId} error:`, err);
  }

  // 3) index existing prices by "vtId:svcId"
  const priceMap = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.vehicle_type_id}:${row.service_id}`;
    const num = Number(row.price);
    priceMap.set(key, Number.isFinite(num) ? num : 0);
  }

  // 4) build a complete matrix, filling zeros for missing cells
  const matrix = headers.vehicle_types.map(vt => {
    const prices: Record<string, number> = {};
    for (const svc of headers.services) {
      const key = `${vt.id}:${svc.id}`;
      prices[String(svc.id)] = priceMap.get(key) ?? 0;
    }
    return { vehicle_type_id: vt.id, prices };
  });

  return {
    services: headers.services,
    vehicle_types: headers.vehicle_types,
    matrix,
  }; 
} catch (e) {
    console.error(e);
    // Fallback: empty matrix, so form can still render/edit non-pricing fields
    return { services: [], vehicle_types: [], matrix: [] };
  }
}


// async function fetchCustomerMatrix(custId: string): Promise<CustomerMatrixResponse> {
//   try {
//     const res = await fetch(`/api/pricing-matrix/customer?cust_id=${custId}`);
//     if (res.ok) return res.json();
//     // ignore 404: fall through to defaults
//   } catch { /* ignore network errors, fall back */ }

//   const fallback = await fetch(`/api/pricing-matrix/defaults`);
//   if (!fallback.ok) throw new Error(`Defaults fetch failed: HTTP ${fallback.status}`);
//   return fallback.json();
// }



// function matrixFromForm(pricing: CustomerFormValues["pricing"]) {
//   const items: Array<{ vehicle_type_id: number; service_id: number; price: number }> = [];
//   for (const [vtKey, svcMap] of Object.entries(pricing || {})) {
//     if (!vtKey.startsWith("v_")) continue;
//     const vtId = Number(vtKey.slice(2));
//     for (const [sKey, raw] of Object.entries(svcMap || {})) {
//       if (!sKey.startsWith("s_")) continue;
//       const serviceId = Number(sKey.slice(2));
//       const price = Number(raw ?? 0);
//       items.push({ vehicle_type_id: vtId, service_id: serviceId, price: Number.isFinite(price) ? price : 0 });
//     }
//   }
//   return items;
// }



function matrixToInitialPricing(m: CustomerMatrixResponse): CustomerFormValues["pricing"] {
  const out: CustomerFormValues["pricing"] = {};
  for (const vt of m.vehicle_types) {
    const row = m.matrix.find(r => r.vehicle_type_id === vt.id);
    const vKey = `v_${vt.id}`;
    out[vKey] = {};
    for (const svc of m.services) {
      const sKey = `s_${svc.id}`;
      out[vKey]![sKey] = row?.prices[String(svc.id)] ?? 0;
    }
  }
  return out;
}



function mapCustomerToForm(c: Customer, m: CustomerMatrixResponse): CustomerFormValues {
  return {
    name: c.name,
    email: c.email ?? "",
    mobile: c.mobile ?? "",
    company_name: c.company_name ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    state: c.state ?? "",
    zip_code: c.zip_code ?? "",
    country: c.country ?? "Singapore",
    type: c.type ?? "regular",
    customer_discount_percent: c.customer_discount_percent ?? 0,
    status: (typeof c.status === "string" ? c.status.toLowerCase() : "active") as "active" | "inactive",
    pricing: matrixToInitialPricing(m),
  };
}

async function upsertPricingRows(custId: number, pricing: CustomerFormValues["pricing"]) {
  // 1) Flatten v_*/s_* into items [{ vehicle_type_id, service_id, price }]
  const items = Object.entries(pricing || {}).flatMap(([vKey, svcMap]) => {
    if (!vKey.startsWith("v_")) return [];
    const vehicle_type_id = Number(vKey.slice(2));
    return Object.entries(svcMap || {}).map(([sKey, v]) => {
      if (!sKey.startsWith("s_")) return null;
      const service_id = Number(sKey.slice(2));
      const n = Number(v ?? 0);
      const price = Number.isFinite(n) ? n : 0;
      return { vehicle_type_id, service_id, price };
    }).filter(Boolean) as Array<{ vehicle_type_id:number; service_id:number; price:number }>;
  });

  // 2) Fetch current rows so we know which need PUT (update) vs POST (create)
  let existing: Array<{ id: number; vehicle_type_id: number; service_id: number }> = [];
  try {
    const ex = await fetch(`/api/customer_service_pricing?cust_id=${custId}`);
    if (ex.ok) existing = await ex.json();
  } catch {
    // If this GET doesn't exist, you need a way to know existing rows (or skip and always POST)
  }

  const idMap = new Map<string, number>();
  existing.forEach(r => idMap.set(`${r.vehicle_type_id}:${r.service_id}`, r.id));

  // 3) PUT if row exists, else POST a new row
  const results = await Promise.all(items.map(({ vehicle_type_id, service_id, price }) => {
    const key = `${vehicle_type_id}:${service_id}`;
    const rowId = idMap.get(key);

    if (rowId) {
      // UPDATE existing
      return fetch(`/api/customer_service_pricing/${rowId}`, {
        method: "PUT",                         // ⬅ change to PATCH if your API wants PATCH
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price }),       // ⬅ if your API expects a different field name than "price", change here
      });
    }

    // CREATE new
    return fetch(`/api/customer_service_pricing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cust_id: custId, vehicle_type_id, service_id, price }),
    });
  }));

  const bad = results.filter(r => !r.ok);
  if (bad.length) {
    const msg = await bad[0].text().catch(() => "");
    throw new Error(msg || `Failed ${bad.length} pricing rows`);
  }
}

export default function EditCustomerPage() {
  const router = useRouter();
  const { id } = useParams();
  //const [pricingData, setPricingData] = useState<any[] | null>(null);
  const [matrix, setMatrix] = useState<CustomerMatrixResponse | null>(null);
  const { data: customer, isLoading } = useGetCustomerById(id as string);
  const updateCustomerMutation = useUpdateCustomer();
  const [error, setError] = useState<string | null>(null);
  //const [matrix, setMatrix] = useState<CustomerMatrixResponse | null>(null);

// useEffect(() => {
//   if (!customer) return;
//   (async () => {
//     try {
//       const m = await fetchCustomerMatrix(String(customer.id));
//       setMatrix(m);
//     } catch (err: any) {
//       setError(err.message || "Failed to fetch pricing matrix");
//     }
//   })();
// }, [customer]);

//   const [services, setServices] = useState<Service[]>([]);

// // Fetch services
// useEffect(() => {
//   const fetchServices = async () => {
//     const res = await fetch("/api/services");
//     const data: Service[] = await res.json();
//     setServices(data);
//   };
//   fetchServices();
// }, []);

useEffect(() => {
  if (!customer?.id) return;

  let cancelled = false;

  (async () => {
    try {
      setError(null);
      const m = await fetchCustomerMatrix(String(customer.id));
      if (!cancelled) setMatrix(m);
    } catch (err: any) {
      if (!cancelled) setError(err.message || "Failed to fetch pricing matrix");
    }
  })();

  return () => { cancelled = true; };
}, [customer?.id]);


const handleSubmit = async (data: CustomerFormValues) => {
  if (!customer) return;
  setError(null);
  try {
    // 1) update customer base fields
    await updateCustomerMutation.mutateAsync({ id: customer.id, ...data });

    // 2) save pricing matrix
    //const items = matrixFromForm(data.pricing);
    //await bulkUpsertCustomerMatrix(customer.id, items);
    await upsertPricingRows(customer.id, data.pricing);
    router.push("/customers");
  } catch (err: any) {
    setError(err?.message || "Something went wrong");
  }
};


if (isLoading || !customer) return <p>Loading...</p>;
const safeMatrix: CustomerMatrixResponse = matrix ?? { services: [], vehicle_types: [], matrix: [] };
const initialData = mapCustomerToForm(customer, safeMatrix);

return (
  <div className="container mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold text-white mb-6">Edit Customer</h1>
    {error && <p className="text-red-500 mb-4">{error}</p>}
    {!safeMatrix.services.length && (
      <p className="text-yellow-400 mb-4">
        Pricing matrix unavailable. You can still edit core customer details.
      </p>
    )}
    <CustomerForm
  key={customer.id + (safeMatrix.services.length ? "-matrix" : "-nomatrix")}
  initialData={initialData}
  onSubmit={handleSubmit}
  isSubmitting={updateCustomerMutation.isPending}
/>
  </div>
);}
