"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import ServiceWithAllPricingForm from "@/components/organisms/ServiceWithAllPricingForm";
import { useCreateServiceWithAllPricing } from "@/hooks/useServicesWithAllPricing";

export default function NewServiceWithAllPricingPage() {
  const router = useRouter();
  const createServiceMutation = useCreateServiceWithAllPricing();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    setError(null);

    // Build service payload
    const payload = {
      name: data.name?.trim() || "",
      description: data.description || "",
      status: data.status || "Active",
      base_price: data.base_price || 0.0,
      additional_ps: (data.additional_ps || 0).toString(),
      distance_levy: (data.distance_levy || 0).toString(),
      midnight_surcharge: (data.midnight_surcharge || 0).toString(),
      ds_hourly_charter: (data.ds_hourly_charter || 0).toString(),
      ds_midnight_surcharge: (data.ds_midnight_surcharge || 0).toString(),
      pricing: data.pricing
    };

    try {
      await createServiceMutation.mutateAsync(payload);
      router.push("/services-vehicle-price");
    } catch (err: any) {
      console.error("Error while creating service with pricing:", err);
      // Handle specific error messages
      if (err?.response?.data) {
        if (typeof err.response.data === "string") {
          setError(err.response.data);
        } else if (err.response.data.error) {
          setError(err.response.data.error);
        } else {
          setError(JSON.stringify(err.response.data));
        }
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Failed to create service with pricing. Please check all fields and try again.");
      }
    }
  };

  const handleClose = () => {
    router.push("/services-vehicle-price");
  };

  return (
    <div>
      {error && <div className="mb-4 text-red-500 bg-red-100 rounded p-2">{error}</div>}
      <ServiceWithAllPricingForm
        onSubmit={handleSubmit}
        onClose={handleClose}
        isSubmitting={createServiceMutation.isPending}
      />
    </div>
  );
}