"use client";
import React, { useState, useEffect, useRef } from "react";
import { useGetServiceById } from '@/hooks/useServices';
import { useGetAllVehicleTypes } from '@/hooks/useVehicleTypes';
import { useGetServicesVehicleTypePricesByServiceId } from '@/hooks/useServicesVehicleTypePrice';
import { useUpdateServiceWithAllPricing } from '@/hooks/useServicesWithAllPricing';
import ServiceWithAllPricingForm from "@/components/organisms/ServiceWithAllPricingForm";
import { useParams, useRouter } from 'next/navigation';

const EditServiceWithAllPricingPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  // Ref to track if we've already fetched data for this ID
  const hasFetchedData = useRef<string | null>(null);

  const { data: service, isLoading: isServiceLoading, isError: isServiceError } = useGetServiceById(id);
  const { data: vehicleTypes = [] } = useGetAllVehicleTypes();
  const { data: servicesVehicleTypePrices = [], isLoading: isPricesLoading, refetch } = useGetServicesVehicleTypePricesByServiceId(id);
  const updateServiceMutation = useUpdateServiceWithAllPricing();
  const [error, setError] = useState<string | null>(null);

  // Initialize pricing data from existing service-vehicle type prices
  const [initialPricing, setInitialPricing] = useState<Record<string, number>>({});

  // Only refetch when the component mounts or when the id changes
  useEffect(() => {
    // Only refetch if we haven't fetched data for this ID yet
    if (hasFetchedData.current !== id) {
      hasFetchedData.current = id;
      refetch();
    }
  }, [id, refetch]);

  useEffect(() => {
    if (servicesVehicleTypePrices && servicesVehicleTypePrices.length > 0) {
      const initialPricingData: Record<string, number> = {};
      servicesVehicleTypePrices.forEach(price => {
        initialPricingData[price.vehicle_type_id.toString()] = price.price;
      });
      // Only update state if the data has actually changed
      setInitialPricing(prev => {
        const prevString = JSON.stringify(prev);
        const newString = JSON.stringify(initialPricingData);
        if (prevString !== newString) {
          return initialPricingData;
        }
        return prev;
      });
    } else {
      // Only reset to empty object if it's not already empty
      setInitialPricing(prev => {
        if (Object.keys(prev).length > 0) {
          return {};
        }
        return prev;
      });
    }
  }, [servicesVehicleTypePrices]); // Remove id from dependencies since we only want to update when servicesVehicleTypePrices changes

  const handleSubmit = async (data: any) => {
    setError(null);

    // Build service payload
    const payload = {
      name: data.name?.trim() || "",
      description: data.description || "",
      status: data.status || "Active",
      base_price: data.base_price || 0.0,
      additional_ps: (data.additional_ps || 0).toString(),
      distance_levy: (data.distance_levy || 0).toString(),
      midnight_surcharge: (data.midnight_surcharge || 0).toString(),
      pricing: data.pricing
    };

    try {
      await updateServiceMutation.mutateAsync({ serviceId: parseInt(id), data: payload });
      router.push("/services-vehicle-price");
    } catch (err: any) {
      console.error("Error while updating service with pricing:", err);
      // Handle specific error messages
      if (err?.response?.data) {
        if (typeof err.response.data === "string") {
          setError(err.response.data);
        } else if (err.response.data.error) {
          setError(err.response.data.error);
        } else {
          setError(JSON.stringify(err.response.data));
        }
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Failed to update service with pricing. Please check all fields and try again.");
      }
    }
  };

  const handleClose = () => {
    router.push("/services-vehicle-price");
  };

  if (isServiceLoading || isPricesLoading) return <div>Loading...</div>;
  if (isServiceError || !service) return <div>Error loading service data.</div>;

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
    <div>
      {error && <div className="mb-4 text-red-500 bg-red-100 rounded p-2">{error}</div>}
      <ServiceWithAllPricingForm
        initialData={formData}
        initialPricing={initialPricing}
        onSubmit={handleSubmit}
        onClose={handleClose}
        isSubmitting={updateServiceMutation.isPending}
      />
    </div>
  );
};

export default EditServiceWithAllPricingPage;