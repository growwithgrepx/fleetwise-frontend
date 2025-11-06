"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useCreateCustomer } from "@/hooks/useCustomers";
import CustomerForm from "@/components/organisms/CustomerForm";
import { useState } from "react";
import { CustomerPayload } from "@/types/types";
import { createCustomerServicePricing } from "@/services/api";
import { matrixToItems, PricingItem, PricingMatrix } from "@/types/types";

function formatError(err: {
  response: { data: string };
  message: string;
}): string {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === "string") return data;
    if (typeof data === "object") {
      return Object.entries(data)
        .map(
          ([field, msg]) =>
            `${field}: ${Array.isArray(msg) ? msg.join(", ") : msg}`
        )
        .join(" | ");
    }
  }
  if (err?.message) return err.message;
  return "Failed to create customer. Please check all fields and try again.";
}



export default function NewCustomerPage() {
  const router = useRouter();
  const createCustomerMutation = useCreateCustomer();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CustomerPayload) => {
    setError(null);

    // Only send fields accepted by the backend
    const payload:any = {
      name: data.name?.trim() || "",
      email: data.email?.trim() || undefined,
      mobile: data.mobile?.trim() || undefined,
      company_name: data.company_name?.trim() || undefined,
      address: data.address?.trim() || undefined,
      city: data.city?.trim() || undefined,
      state: data.state?.trim() || undefined,
      zip_code: data.zip_code?.trim() || undefined,
      country: data.country,
      type: data.type,
      customer_discount_percent: data.customer_discount_percent,
      status: data.status,
      pricing: [],
    };
  let cust_id: number | null = null;
    try {
     const createdCustomer = await createCustomerMutation.mutateAsync(payload);
     cust_id = createdCustomer.id;

     if (!data.pricing || !Object.keys(data.pricing).length) {
      throw new Error("No pricing matrix captured from the form.");
    }
    // in page.tsx handleSubmit, before matrixToItems(...)
const normalizeMatrix = (pricing: Record<string, Record<string, number>>) => {
  const out: Record<number, Record<number, number>> = {};
  for (const [vKey, svcMap] of Object.entries(pricing || {})) {
    const vtId = Number(String(vKey).replace(/^v_/, ""));
    out[vtId] = {};
    for (const [sKey, price] of Object.entries(svcMap || {})) {
      const svcId = Number(String(sKey).replace(/^s_/, ""));
      out[vtId][svcId] = Number(price ?? 0);
    }
  }
  return out;
};


  const normalized = normalizeMatrix(data.pricing as any);
  const items = matrixToItems(normalized);

   // const items = matrixToItems(data.pricing as PricingMatrix);
  //console.log("matrix items", items);

   
     // Extract all service names
    // const services = Object.keys(data.pricing.transfer_per_way);
  const serviceRes = await fetch("/api/services");
  if (!serviceRes.ok) throw new Error("Failed to fetch services");
  const services: { id: number; name: string }[] = await serviceRes.json();
  const normalizeName = (name: string) => name.toLowerCase().replace(/\s+/g, "_");
  console.log(normalizeName);
   payload.pricing = items
      .map(({ vehicle_type_id, service_id, price }) => ({
        cust_id,
        vehicle_type_id: Number(vehicle_type_id),
        service_id: Number(service_id),
        price: Number(price),
      }))
      .filter(
        (i) =>
          Number.isFinite(i.vehicle_type_id) &&
          Number.isFinite(i.service_id) &&
          Number.isFinite(i.price)
      );
      if (payload.pricing.length === 0) {
      throw new Error("Pricing matrix produced no valid rows.");
    }
    
  try {
    //await createCustomerServicePricing(payloads);
    await Promise.all(
  payload.pricing.map(row =>
    fetch('/api/customer_service_pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),  // { cust_id, vehicle_type_id, service_id, price }
    }).then(r => {
      if (!r.ok) return r.text().then(t => { throw new Error(t || 'pricing row failed'); });
    })
  )
);
    } catch (pricingErr) {
     
     if (cust_id) {
            const deleteRes = await fetch(`/api/customers/${cust_id}`, {
              method: "DELETE",
            });
            if (!deleteRes.ok) {
              const errData = await deleteRes.json().catch(() => ({}));
              console.error(
                `Rollback failed – customer ${cust_id} may be left in inconsistent state`,
                errData.error || deleteRes.statusText
              );
            } else {
              console.log(`Customer ${cust_id} successfully rolled back`);
            }
        }

        console.error("Pricing creation failed:", pricingErr);
        setError("Pricing failed. Customer was not fully created.");
        throw pricingErr; 
      }
      router.push("/customers");
    } catch (err) {
      setError(
        formatError(
          err as {
            response: { data: string };
            message: string;
          }
        )
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Add Customer</h1>
      {error && (
        <div className="mb-4 text-red-500 bg-red-100 rounded p-2">{error}</div>
      )}
      <CustomerForm
        onSubmit={handleSubmit}
        isSubmitting={createCustomerMutation.isPending}
      />
    </div>
  );
}