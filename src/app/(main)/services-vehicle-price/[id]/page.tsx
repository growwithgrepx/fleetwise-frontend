'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useGetServicesVehicleTypePriceById, useUpdateServicesVehicleTypePrice } from '@/hooks/useServicesVehicleTypePrice';
import { useGetAllServices } from '@/hooks/useServices';
import { useGetAllVehicleTypes } from '@/hooks/useVehicleTypes';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { servicesVehicleTypePriceSchema } from "@/lib/validationSchemas";

export default function ServicesVehicleTypePriceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params promise
  const unwrappedParams = React.use(params);
  const router = useRouter();
  const { data: servicesVehicleTypePrice, isLoading: isFetching } = useGetServicesVehicleTypePriceById(unwrappedParams.id);
  const { data: services = [] } = useGetAllServices();
  const { data: vehicleTypes = [] } = useGetAllVehicleTypes();
  const updateMutation = useUpdateServicesVehicleTypePrice();
  const [isEditing, setIsEditing] = useState(false);

  // Form setup for editing only the price
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(servicesVehicleTypePriceSchema),
    defaultValues: {
      price: servicesVehicleTypePrice?.price || 0,
      service_id: servicesVehicleTypePrice?.service_id || 0,
      vehicle_type_id: servicesVehicleTypePrice?.vehicle_type_id || 0
    },
  });

  // Get names for display
  const getServiceName = (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : 'Unknown Service';
  };

  const getVehicleTypeName = (vehicleTypeId: number) => {
    const vehicleType = vehicleTypes.find(vt => vt.id === vehicleTypeId);
    return vehicleType ? vehicleType.name : 'Unknown Vehicle Type';
  };

  const handleUpdate = async (data: any) => {
    try {
      await updateMutation.mutateAsync({ 
        id: unwrappedParams.id, 
        price: data.price,
        service_id: data.service_id,
        vehicle_type_id: data.vehicle_type_id
      });
      toast.success('Service vehicle price updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating service vehicle price:', error);
      const errorMessage = error?.message || 'Failed to update service vehicle price';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false);
    } else {
      router.push('/services-vehicle-price');
    }
  };

  if (isFetching) {
    return <div>Loading...</div>;
  }

  if (!servicesVehicleTypePrice) {
    return <div>Service vehicle price not found</div>;
  }

  if (isEditing) {
    return (
      <div className="p-6">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-text-main">Edit Service Vehicle Price</h1>
            <p className="text-text-secondary">Update service vehicle price details</p>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto bg-background-light p-8 rounded-lg shadow">
          <form onSubmit={handleSubmit(handleUpdate)} className="space-y-6">
            {/* Service Field (Read-only) */}
            <div>
              <label className="block text-text-secondary mb-1">Service</label>
              <div className="w-full px-3 py-2 rounded bg-background text-text-main border border-border-color">
                {getServiceName(servicesVehicleTypePrice.service_id)}
              </div>
              {/* Hidden input to pass service_id */}
              <input 
                type="hidden" 
                {...register("service_id", { valueAsNumber: true })} 
                value={servicesVehicleTypePrice.service_id} 
              />
            </div>

            {/* Vehicle Type Field (Editable) */}
            <div>
              <label className="block text-text-secondary mb-1">Vehicle Type</label>
              <select 
                {...register("vehicle_type_id", { valueAsNumber: true })} 
                className="w-full px-3 py-2 rounded bg-background text-text-main border border-border-color"
              >
                <option value="">Select a vehicle type</option>
                {vehicleTypes.map((vehicleType) => (
                  <option key={vehicleType.id} value={vehicleType.id}>
                    {vehicleType.name}
                  </option>
                ))}
              </select>
              {errors.vehicle_type_id && <span className="text-red-400 text-sm">{errors.vehicle_type_id.message}</span>}
            </div>

            {/* Price Field (Editable) */}
            <div>
              <label className="block text-text-secondary mb-1">Price</label>
              <input 
                type="number" 
                step="0.01" 
                {...register("price", { valueAsNumber: true })} 
                className="w-full px-3 py-2 rounded bg-background text-text-main border border-border-color" 
              />
              {errors.price && <span className="text-red-400 text-sm">{errors.price.message}</span>}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button 
                type="button" 
                onClick={handleCancel}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={updateMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg disabled:opacity-50"
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Service Vehicle Price Details</h1>
          <p className="text-text-secondary">View service vehicle price information</p>
        </div>
      </div>
      
      <div className="bg-background-light p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-text-secondary">Service</label>
            <div className="text-text-main">{getServiceName(servicesVehicleTypePrice.service_id)}</div>
          </div>
          <div>
            <label className="block text-text-secondary">Vehicle Type</label>
            <div className="text-text-main">{getVehicleTypeName(servicesVehicleTypePrice.vehicle_type_id)}</div>
          </div>
          <div>
            <label className="block text-text-secondary">Price</label>
            <div className="text-text-main">${servicesVehicleTypePrice.price.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="flex gap-4 pt-6">
          <button 
            onClick={handleCancel}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
          >
            Back to List
          </button>
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}