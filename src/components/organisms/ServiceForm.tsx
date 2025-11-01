import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema } from "@/lib/validationSchemas";
import type { z } from "zod";

type ServiceFormValues = {
  name: string;
  description?: string;
  base_price?: number;
  status?: string;
  additional_ps?: number;
  distance_levy?: number;
  midnight_surcharge?: number;
};

import { toast } from 'react-hot-toast';

type ServiceFormProps = {
  initialData?: Partial<ServiceFormValues>;
  onSubmit: (data: ServiceFormValues) => Promise<{ success: boolean; message?: string }>;
  onCancel?: () => void;
  onClose?: () => void;
  isSubmitting: boolean;
};

export default function ServiceForm({ initialData, onSubmit, onCancel, onClose, isSubmitting }: ServiceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { 
      status: 'Active',
      additional_ps: 0,
      distance_levy: 0,
      midnight_surcharge: 0,
      ...initialData 
    },
  });

  const handleFormSubmit = async (data: ServiceFormValues) => {
    // Ensure all numeric fields have values
    const processedData = {
      ...data,
      base_price: data.base_price || 0,
      additional_ps: data.additional_ps || 0,
      distance_levy: data.distance_levy || 0,
      midnight_surcharge: data.midnight_surcharge || 0,
    };
    console.log('Form submission data:', processedData);
    
    try {
      const response = await onSubmit(processedData as ServiceFormValues);
      if (response.success && response.message) {
        // Show success message about contractor sync
        toast.success(response.message);
      }
    } catch (error) {
      // Show error message
      toast.error((error as Error).message || 'Failed to create service');
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-gray-900 p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-white mb-6">Service</h1>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Name Field */}
        <div>
          <label className="block text-gray-300 mb-1">Name</label>
          <input 
            {...register("name")} 
            className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" 
          />
          {errors.name && <span className="text-red-400 text-sm">{errors.name.message}</span>}
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-gray-300 mb-1">Description</label>
          <textarea 
            {...register("description")} 
            rows={3}
            className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 resize-none" 
          />
          {errors.description && <span className="text-red-400 text-sm">{errors.description.message}</span>}
        </div>

        {/* Pricing Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Pricing Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-1">Transfer (Per way)</label>
              <input 
                type="number" 
                step="0.01" 
                {...register("base_price", { valueAsNumber: true })} 
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" 
              />
              {errors.base_price && <span className="text-red-400 text-sm">{errors.base_price.message}</span>}
            </div>
            
            <div>
              <label className="block text-gray-300 mb-1">Additional Stop (Max. 2 stops)</label>
              <input 
                type="number" 
                step="0.01" 
                {...register("additional_ps", { valueAsNumber: true })} 
                placeholder="Enter price for additional stop"
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 placeholder-gray-500" 
              />
              {errors.additional_ps && <span className="text-red-400 text-sm">{errors.additional_ps.message}</span>}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-1">Distance Levy</label>
              <input 
                type="number" 
                step="0.01" 
                {...register("distance_levy", { valueAsNumber: true })} 
                placeholder="Enter distance levy"
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 placeholder-gray-500" 
              />
              {errors.distance_levy && <span className="text-red-400 text-sm">{errors.distance_levy.message}</span>}
            </div>
            
            <div>
              <label className="block text-gray-300 mb-1">Midnight Surcharge</label>
              <input 
                type="number" 
                step="0.01" 
                {...register("midnight_surcharge", { valueAsNumber: true })} 
                placeholder="Enter midnight surcharge"
                className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 placeholder-gray-500" 
              />
              {errors.midnight_surcharge && <span className="text-red-400 text-sm">{errors.midnight_surcharge.message}</span>}
            </div>
          </div>
          
        </div>

        {/* Status Field */}
        <div>
          <label className="block text-gray-300 mb-1">Status</label>
          <select {...register("status")} className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          {errors.status && <span className="text-red-400 text-sm">{errors.status.message}</span>}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          {onClose && (
            <button 
              type="button" 
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg"
            >
              Close
            </button>
          )}
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
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}