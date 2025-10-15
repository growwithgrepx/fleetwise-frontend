"use client";
import React from "react";
import { useGetVehicleById, useUpdateVehicle } from '@/hooks/useVehicles';
import VehicleForm from '@/components/organisms/VehicleForm';
import { useParams, useRouter } from 'next/navigation';
import { Vehicle } from '@/lib/types';

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: vehicle, isLoading, isError } = useGetVehicleById(id);
  const { mutate, isPending: isSubmitting } = useUpdateVehicle();

  const handleSubmit = (data: Partial<Vehicle>) => {
    mutate({ id, ...data });
    router.push('/vehicles');
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError || !vehicle) return <div>Error loading vehicle data.</div>;

  return (
    <div className="container mx-auto p-4">
      <VehicleForm 
        initialData={vehicle} 
        onSubmit={handleSubmit} 
        isSubmitting={isSubmitting} 
        onBack={() => router.push('/vehicles')}
      />
    </div>
  );
}