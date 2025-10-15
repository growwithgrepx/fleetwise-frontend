import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { servicesVehicleTypePriceSchema } from "@/lib/validationSchemas";
import type { z } from "zod";
import { useGetAllServices } from "@/hooks/useServices";
import { useGetAllVehicleTypes } from "@/hooks/useVehicleTypes";

type ServicesVehicleTypePriceFormValues = z.infer<typeof servicesVehicleTypePriceSchema>;

type ServicesVehicleTypePriceFormProps = {
  initialData?: Partial<ServicesVehicleTypePriceFormValues>;
  onSubmit: (data: ServicesVehicleTypePriceFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  isEditMode?: boolean; // New prop to distinguish between create and edit modes
};

export default function ServicesVehicleTypePriceForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting,
  isEditMode = false
}: ServicesVehicleTypePriceFormProps) {
  const { data: services = [] } = useGetAllServices();
  const { data: vehicleTypes = [] } = useGetAllVehicleTypes();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServicesVehicleTypePriceFormValues>({
    resolver: zodResolver(servicesVehicleTypePriceSchema),
    defaultValues: {
      ...initialData
    },
  });

  // Find service and vehicle type names for display in edit mode
  const getServiceName = (serviceId: number) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : 'Unknown Service';
  };

  const getVehicleTypeName = (vehicleTypeId: number) => {
    const vehicleType = vehicleTypes.find(vt => vt.id === vehicleTypeId);
    return vehicleType ? vehicleType.name : 'Unknown Vehicle Type';
  };

  const handleFormSubmit = (data: ServicesVehicleTypePriceFormValues) => {
    onSubmit(data);
  };

  return (
    <div className="max-w-2xl mx-auto bg-background-light p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-text-main mb-6">
        {isEditMode ? "Edit Service Vehicle Price" : "Service Vehicle Price"}
      </h1>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Service Field */}
        <div>
          <label className="block text-text-secondary mb-1">Service</label>
          {isEditMode ? (
            // In edit mode, display service name as read-only text
            <div className="w-full px-3 py-2 rounded bg-background text-text-main border border-border-color">
              {getServiceName(initialData?.service_id || 0)}
            </div>
          ) : (
            // In create mode, show selectable dropdown
            <select 
              {...register("service_id", { valueAsNumber: true })} 
              className="w-full px-3 py-2 rounded bg-background text-text-main border border-border-color"
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          )}
          {errors.service_id && !isEditMode && <span className="text-red-400 text-sm">{errors.service_id.message}</span>}
          {/* Hidden input to pass service_id in edit mode */}
          {isEditMode && initialData?.service_id && (
            <input type="hidden" {...register("service_id", { valueAsNumber: true })} value={initialData.service_id} />
          )}
        </div>

        {/* Vehicle Type Field */}
        <div>
          <label className="block text-text-secondary mb-1">Vehicle Type</label>
          {/* Allow editing of Vehicle Type field in both create and edit modes */}
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

        {/* Price Field */}
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
          {onCancel && (
            <button 
              type="button" 
              onClick={onCancel}
              className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg"
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}