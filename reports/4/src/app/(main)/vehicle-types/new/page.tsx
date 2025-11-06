"use client";
import React from "react";
import { useRouter } from "next/navigation";
import VehicleTypeForm from "@/components/organisms/VehicleTypeForm";
import { useCreateVehicleType } from "@/hooks/useVehicleTypes";

export default function NewVehicleTypePage() {
  const router = useRouter();
  const createVehicleTypeMutation = useCreateVehicleType();

  const handleSubmit = async (data: any) => {
    const { name, description, status } = data;
    await createVehicleTypeMutation.mutateAsync({ name, description, status });
    router.push("/vehicle-types");
  };

  return (
    <div className="container mx-auto p-4">
      <VehicleTypeForm
        onSubmit={handleSubmit}
        isSubmitting={createVehicleTypeMutation.isPending}
        onBack={() => router.push('/vehicle-types')}
      />
    </div>
  );
}
