"use client";
import React from "react";
import { useRouter } from "next/navigation";
import ServiceWithAllPricingForm from "@/components/organisms/ServiceWithAllPricingForm";
import { useCreateServiceWithAllPricing } from "@/hooks/useServicesWithAllPricing";
import toast from 'react-hot-toast';
import { withLoadingToast, extractErrorMessage } from '@/utils/toastHelpers';

export default function NewServiceWithAllPricingPage() {
  const router = useRouter();
  const createServiceMutation = useCreateServiceWithAllPricing();

  const handleSubmit = async (data: any) => {
    try {
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
        // Ancillary charge fields
        is_ancillary: data.is_ancillary || false,
        condition_type: data.condition_type || null,
        condition_config: data.condition_config || "",
        is_per_occurrence: data.is_per_occurrence || false,
        pricing: data.pricing
      };

      // Create service using the shared toast helper
      await withLoadingToast(
        () => createServiceMutation.mutateAsync(payload),
        {
          loading: 'Creating service...',
          getSuccess: (result) => result?.message || 'Service created successfully and synced to contractor pricing lists!'
        },
        async () => {
          router.push("/services-vehicle-price");
        }
      );
    } catch (err: any) {
      console.error("Error while creating service with pricing:", err);
      const errorMessage = extractErrorMessage(
        err,
        "Failed to create service with pricing. Please check all fields and try again."
      );
      toast.error(errorMessage, { duration: 4000 });
    }
  };

  const handleClose = () => {
    router.push("/services-vehicle-price");
  };

  return (
    <div>
      <ServiceWithAllPricingForm
        onSubmit={handleSubmit}
        onClose={handleClose}
        isSubmitting={createServiceMutation.isPending}
      />
    </div>
  );
}