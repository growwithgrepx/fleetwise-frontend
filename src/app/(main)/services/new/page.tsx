"use client";
import React from "react";
import { useRouter } from "next/navigation";
import ServiceForm from "@/components/organisms/ServiceForm";
import { useCreateService } from "@/hooks/useServices";
import toast from 'react-hot-toast';

export default function NewServicePage() {
  const router = useRouter();
  const createServiceMutation = useCreateService();

  const handleSubmit = async (data: any) => {
    try {
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

      // Create service and sync pricing (handled by backend)
      const loadingToast = toast.loading('Creating service...');
      
      try {
        const serviceResult = await createServiceMutation.mutateAsync(payload);

        // Dismiss loading toast
        toast.dismiss(loadingToast);

        // Small delay to ensure loading toast is dismissed before showing success
        await new Promise(resolve => setTimeout(resolve, 100));

        // The backend now sends a message that includes sync status
        if (serviceResult.message) {
          toast.success(serviceResult.message, { duration: 3000 });
        } else {
          toast.success('Service created successfully!', { duration: 3000 });
        }

        // Delay navigation to allow toast to be visible (increased from 500ms to 1500ms)
        await new Promise(resolve => setTimeout(resolve, 1500));
        router.push("/services");

        return { success: true };
      } catch (error) {
        toast.dismiss(loadingToast);
        throw error;
      }
    } catch (err: any) {
      console.error("Error while creating service:", err);
      const errorMessage = err?.response?.data
        ? typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data)
        : err?.message || "Failed to create service. Please check all fields and try again.";
      
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const handleClose = () => {
    router.push("/services");
  };

  return (
    <div>
      <ServiceForm
        onSubmit={handleSubmit}
        onClose={handleClose}
        isSubmitting={createServiceMutation.isPending}
      />
    </div>
  );
}
