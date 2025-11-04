"use client";
import React, { useEffect } from "react";
import { useGetServiceById, useUpdateService } from '@/hooks/useServices';
import ServiceForm from '@/components/organisms/ServiceForm';
import { useParams, useRouter } from 'next/navigation';
import { Service } from '@/lib/types';

const EditServicePage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: service, isLoading, isError } = useGetServiceById(id);
  const { mutate, isPending: isSubmitting } = useUpdateService();

  const handleSubmit = async (data: any) => {
    // Convert decimal fields to strings to preserve precision for backend Decimal conversion
    const payload = {
      ...data,
      additional_ps: data.additional_ps?.toString() || "0.00",
      distance_levy: data.distance_levy?.toString() || "0.00",
      midnight_surcharge: data.midnight_surcharge?.toString() || "0.00",
    };
    await mutate({ id, ...payload });
    router.push('/services');
  };

  const handleClose = () => {
    router.push('/services');
  };

  if (isLoading) return <div>Loading...</div>;
  if (isError || !service) return <div>Error loading service data.</div>;

  // Convert service data to match form types
  const formData = {
    ...service,
    additional_ps: typeof service.additional_ps === 'string' ? 
      (isNaN(parseFloat(service.additional_ps)) ? 0 : parseFloat(service.additional_ps)) : (service.additional_ps || 0),
    distance_levy: typeof service.distance_levy === 'string' ? 
      (isNaN(parseFloat(service.distance_levy)) ? 0 : parseFloat(service.distance_levy)) : (service.distance_levy || 0),
    midnight_surcharge: typeof service.midnight_surcharge === 'string' ? 
      (isNaN(parseFloat(service.midnight_surcharge)) ? 0 : parseFloat(service.midnight_surcharge)) : (service.midnight_surcharge || 0),
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Edit Service</h1>
      <ServiceForm 
        initialData={formData} 
        onSubmit={handleSubmit} 
        onClose={handleClose}
        isSubmitting={isSubmitting} 
      />
    </div>
  );
};

export default EditServicePage;