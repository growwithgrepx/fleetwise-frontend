// "use client";
// import React from "react";
// import { useRouter } from "next/navigation";
// import ServiceForm from "@/components/organisms/ServiceForm";
// import { useCreateService } from "@/hooks/useServices";
// import { useState } from "react";

// export default function NewServicePage() {
//   const router = useRouter();
//   const createServiceMutation = useCreateService();
//   const [error, setError] = useState<string | null>(null);

//   const handleSubmit = async (data: any) => {
//     setError(null);
//     // Always send required fields with correct types and defaults
//     const payload = {
//       name: data.name?.trim() || "",
//       description: data.description || "",
//       status: data.status || "Active",
//       base_price: typeof data.base_price === "number" ? data.base_price : Number(data.base_price) || 0.0,
//       // Send decimal fields as strings to preserve precision for backend Decimal conversion
//       additional_ps: data.additional_ps?.toString() || "0.00",
//       distance_levy: data.distance_levy?.toString() || "0.00",
//       midnight_surcharge: data.midnight_surcharge?.toString() || "0.00",
//       ds_hourly_charter: data.ds_hourly_charter?.toString() || "0.00",
//       ds_midnight_surcharge: data.ds_midnight_surcharge?.toString() || "0.00",
//     };
//     console.log('Payload being sent to API:', payload);
//     try {
//       await createServiceMutation.mutateAsync(payload);
//       router.push("/services");
//     } catch (err: any) {
//       // Show backend error message if available
//       if (err?.response?.data) {
//         setError(typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data));
//       } else if (err?.message) {
//         setError(err.message);
//       } else {
//         setError("Failed to create service. Please check all fields and try again.");
//       }
//     }
//   };

//   const handleClose = () => {
//     router.push("/services");
//   };

//   return (
//     <div>
//       {error && <div className="mb-4 text-red-500 bg-red-100 rounded p-2">{error}</div>}
//       <ServiceForm
//         onSubmit={handleSubmit}
//         onClose={handleClose}
//         isSubmitting={createServiceMutation.isPending}
//       />
//     </div>
//   );
// }

"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ServiceForm from "@/components/organisms/ServiceForm";
import { useCreateService } from "@/hooks/useServices";
import { createCustomerServicePricing } from "@/services/api";// make sure you have this
import axios from "axios";

export default function NewServicePage() {
  const router = useRouter();
  const createServiceMutation = useCreateService();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
  setError(null);

  // Build service payload
  const payload = {
    name: data.name?.trim() || "",
    description: data.description || "",
    status: data.status || "Active",
    base_price:
      typeof data.base_price === "number"
        ? data.base_price
        : Number(data.base_price) || 0.0,
    additional_ps: data.additional_ps?.toString() || "0.00",
    distance_levy: data.distance_levy?.toString() || "0.00",
    midnight_surcharge: data.midnight_surcharge?.toString() || "0.00",
    ds_hourly_charter: data.ds_hourly_charter?.toString() || "0.00",
    ds_midnight_surcharge: data.ds_midnight_surcharge?.toString() || "0.00",
  };

  try {
    // 1. Create service
    const newService = await createServiceMutation.mutateAsync(payload);

    // 2. Fetch all customer pricing (for all customers)
    const res = await axios.get("/api/customer_service_pricing");
    const allPricing = res.data;

    // 3. Get unique customer IDs
    const custIds = Array.from(new Set(allPricing.map((p: any) => p.cust_id)));

    // 4. Build default payloads only for customers missing the new service
    const defaultPayloads = custIds
      .filter(
        (custId) =>
          !allPricing.some(
            (p: any) => p.cust_id === custId && p.service_id === newService.id
          )
      )
      .map((custId) => ({
        cust_id: custId,
        service_id: newService.id,
        transfer_per_way: "0.00",
        midnight_surcharge: "0.00",
        additional_stop: "0.00",
        distance_levy: "0.00",
      }));

// 5. Insert all missing rows with rollback protection
const createdPricingIds: number[] = [];

try {
  for (const payload of defaultPayloads) {
    const result = await axios.post("/api/customer_service_pricing", payload);
    createdPricingIds.push(result.data.id); 
  }
} catch (err: any) {
  await Promise.allSettled(
    createdPricingIds.map((id) =>
      axios.delete(`/api/customer_service_pricing/${id}`)
    )
  );
  await axios.delete(`/api/services/${newService.id}`);

  throw err; 
}

    router.push("/services");
  } catch (err: any) {
    console.error("Error while creating service:", err);
    if (err?.response?.data) {
      setError(
        typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data)
      );
    } else if (err?.message) {
      setError(err.message);
    } else {
      setError("Failed to create service. Please check all fields and try again.");
    }
  }

};

const handleClose = () => {
    router.push("/services");
  };

  return (
    <div>
      {error && <div className="mb-4 text-red-500 bg-red-100 rounded p-2">{error}</div>}
      <ServiceForm
        onSubmit={handleSubmit}
        onClose={handleClose}
        isSubmitting={createServiceMutation.isPending}
      />
    </div>
  );
}
