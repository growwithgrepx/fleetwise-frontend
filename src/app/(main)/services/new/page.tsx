"use client";
import React from "react";
import { useRouter } from "next/navigation";
import ServiceForm from "@/components/organisms/ServiceForm";
import { useCreateService } from "@/hooks/useServices";
import toast from 'react-hot-toast';
import { withLoadingToast, extractErrorMessage } from '@/utils/toastHelpers';

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

      // Create service using the shared toast helper
      await withLoadingToast(
        () => createServiceMutation.mutateAsync(payload),
        {
          loading: 'Creating service...',
          getSuccess: (result) => result.message || 'Service created successfully!'
        },
        async () => {
          router.push("/services");
        }
      );
    } catch (err: any) {
      console.error("Error while creating service:", err);
      const errorMessage = extractErrorMessage(
        err,
        "Failed to create service. Please check all fields and try again."
      );
      toast.error(errorMessage);
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
