"use client";
import React from "react";
import { useGetVehicleTypeById, useUpdateVehicleType } from '@/hooks/useVehicleTypes';
import VehicleTypeForm from '@/components/organisms/VehicleTypeForm';
import { useParams, useRouter } from 'next/navigation';
import { VehicleType } from '@/lib/types';

export default function EditVehicleTypePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: vehicleType, isLoading, isError } = useGetVehicleTypeById(id);
  const { mutate, isPending: isSubmitting } = useUpdateVehicleType();

  const handleSubmit = (data: Partial<VehicleType>) => {
    mutate({ id, ...data });
    router.push('/vehicle-types');
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError || !vehicleType) return <div>Error loading vehicle type data.</div>;

  return (
    <div className="container mx-auto p-4">
      <VehicleTypeForm 
        initialData={vehicleType} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        onBack={() => router.push('/vehicle-types')}
      />
    </div>
  );
}