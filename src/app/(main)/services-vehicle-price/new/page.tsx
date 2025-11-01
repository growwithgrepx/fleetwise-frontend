"use client";
import React from "react";
import { useRouter } from "next/navigation";
import ServiceWithAllPricingForm from "@/components/organisms/ServiceWithAllPricingForm";
import { useCreateServiceWithAllPricing } from "@/hooks/useServicesWithAllPricing";
import toast from 'react-hot-toast';

export default function NewServiceWithAllPricingPage() {
  const router = useRouter();
  const createServiceMutation = useCreateServiceWithAllPricing();

  const handleSubmit = async (data: any) => {

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

    // Show loading toast
    const loadingToast = toast.loading('Creating service...');

    try {
      await createServiceMutation.mutateAsync(payload);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Small delay to ensure loading toast is dismissed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Show success toast with contractor sync message
      toast.success('Service created successfully and synced to contractor pricing lists!', { duration: 3000 });

      // Delay navigation to allow toast to be visible
      await new Promise(resolve => setTimeout(resolve, 1500));
      router.push("/services-vehicle-price");
    } catch (err: any) {
      console.error("Error while creating service with pricing:", err);

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Extract error message
      let errorMessage = "Failed to create service with pricing. Please check all fields and try again.";

      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.data) {
        if (typeof err.response.data === "string") {
          errorMessage = err.response.data;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else {
          errorMessage = JSON.stringify(err.response.data);
        }
      }

      // Show error toast
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