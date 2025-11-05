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
      console.log('[New Service] Save button clicked');
      console.log('[New Service] Raw form data received:', data);

      // Validate that condition_config is not empty for ancillary services
      if (data.is_ancillary && data.condition_type && !data.condition_config) {
        const errorMsg = 'Please provide configuration for the selected ancillary condition';
        console.warn('[New Service] Validation failed:', errorMsg);
        toast.error(errorMsg);
        return;
      }

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
        // Ancillary charge fields
        is_ancillary: data.is_ancillary || false,
        condition_type: data.condition_type || null,
        condition_config: data.condition_config || "",
        is_per_occurrence: data.is_per_occurrence || false,
      };

      console.log('[New Service] Sending payload to backend:', payload);
      console.log('[New Service] Ancillary config details:', {
        is_ancillary: payload.is_ancillary,
        condition_type: payload.condition_type,
        condition_config: payload.condition_config,
        is_per_occurrence: payload.is_per_occurrence,
      });

      // Create service using the shared toast helper
      await withLoadingToast(
        () => {
          console.log('[New Service] Starting mutation...');
          return createServiceMutation.mutateAsync(payload);
        },
        {
          loading: 'Creating service...',
          getSuccess: (result) => {
            console.log('[New Service] Mutation successful, result:', result);
            return result.message || 'Service created successfully!';
          }
        },
        async () => {
          // Small delay to ensure cache invalidation and DB write propagates
          console.log('[New Service] Waiting for cache invalidation...');
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log('[New Service] Redirecting to services list...');
          router.push("/services");
        }
      );
    } catch (err: any) {
      console.error("[New Service] Error during submission:", err);
      console.error('[New Service] Error details:', {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        stack: err?.stack,
      });
      const errorMessage = extractErrorMessage(
        err,
        "Failed to create service. Please check all fields and try again."
      );
      console.warn('[New Service] Showing error toast:', errorMessage);
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
