"use client";
import React from "react";
import { useRouter } from "next/navigation";
import VehicleForm from "@/components/organisms/VehicleForm";
import { useCreateVehicle } from "@/hooks/useVehicles";

export default function NewVehiclePage() {
  const router = useRouter();
  const createVehicleMutation = useCreateVehicle();

  const handleSubmit = async (data: any) => {
    const { name, number, status } = data;
    // Always include type field with empty string value to satisfy backend constraint
    await createVehicleMutation.mutateAsync({ name, number, status, type: '' } as any);
    router.push("/vehicles");
  };

  return (
    <div className="container mx-auto p-4">
      <VehicleForm
        onSubmit={handleSubmit}
        isSubmitting={createVehicleMutation.isPending}
        onBack={() => router.push('/vehicles')}
      />
    </div>
  );
}