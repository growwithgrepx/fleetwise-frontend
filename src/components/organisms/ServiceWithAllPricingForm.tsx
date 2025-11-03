import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema } from "@/lib/validationSchemas";
import type { z } from "zod";
import { useGetAllVehicleTypes } from "@/hooks/useVehicleTypes";

type ServiceFormValues = {
  name: string;
  description?: string;
  base_price?: number; // Made optional
  status?: string;
  additional_ps?: number; // Made optional
  distance_levy?: number; // Made optional
  midnight_surcharge?: number; // Made optional
  ds_hourly_charter?: number; // Made optional
  ds_midnight_surcharge?: number; // Made optional
  is_ancillary?: boolean;
  condition_type?: 'time_range' | 'additional_stops' | 'always' | null;
  condition_config?: string;
  is_per_occurrence?: boolean;
};

type ServiceWithAllPricingFormProps = {
  initialData?: Partial<ServiceFormValues>;
  initialPricing?: Record<string, number>; // Add initial pricing data
  onSubmit: (data: ServiceFormValues & { pricing: Record<string, number> }) => void;
  onCancel?: () => void;
  onClose?: () => void;
  isSubmitting: boolean;
};

export default function ServiceWithAllPricingForm({ 
  initialData, 
  initialPricing, // Accept initial pricing data
  onSubmit, 
  onCancel, 
  onClose, 
  isSubmitting 
}: ServiceWithAllPricingFormProps) {
  const { data: vehicleTypes = [] } = useGetAllVehicleTypes();
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [pricingErrors, setPricingErrors] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
    reset,
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      status: 'Active',
      is_ancillary: false,
      condition_type: null,
      condition_config: '',
      is_per_occurrence: false,
      ...initialData
    },
  });

  const isAncillary = watch('is_ancillary');
  const conditionType = watch('condition_type');

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        status: 'Active',
        ...initialData
      });
    }
  }, [initialData, reset]);

  // Create a stable string representation of initialPricing
  const initialPricingString = useMemo(() => {
    return JSON.stringify(initialPricing || {});
  }, [initialPricing]);

  // Initialize pricing with initialPricing data or default values
  useEffect(() => {
    const initialPricingState: Record<string, number> = {};
    vehicleTypes.forEach(vehicleType => {
      // Use initialPricing data if available, otherwise default to 0.00
      const vehicleTypeId = vehicleType.id.toString();
      // Check if initialPricing is provided and has this vehicle type, otherwise default to 0
      if (initialPricing && typeof initialPricing[vehicleTypeId] !== 'undefined') {
        initialPricingState[vehicleTypeId] = initialPricing[vehicleTypeId];
      } else {
        initialPricingState[vehicleTypeId] = 0.00;
      }
    });
    setPricing(initialPricingState);
  }, [vehicleTypes, initialPricingString]); // Use the stable string representation

  const handlePricingChange = (vehicleTypeId: string, value: string) => {
    // Allow empty values temporarily while typing
    if (value === '') {
      setPricing(prev => ({
        ...prev,
        [vehicleTypeId]: 0
      }));
      // Clear any existing error for this field
      setPricingErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[vehicleTypeId];
        return newErrors;
      });
      return;
    }

    const numValue = parseFloat(value);
    
    // If the value is not a valid number, don't show an error immediately
    // This allows users to type multi-digit numbers
    if (isNaN(numValue)) {
      // Don't set an error yet, just keep the current value
      return;
    }
    
    // For negative numbers, show error
    if (numValue < 0) {
      setPricingErrors(prev => ({
        ...prev,
        [vehicleTypeId]: "Price cannot be negative"
      }));
      return;
    }
    
    // Clear error if value is valid
    setPricingErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[vehicleTypeId];
      return newErrors;
    });
    
    // Update pricing with the valid number
    setPricing(prev => ({
      ...prev,
      [vehicleTypeId]: numValue
    }));
  };

  const handleFormSubmit = (data: ServiceFormValues) => {
    // Ensure all numeric fields have values
    const processedData = {
      ...data,
      base_price: data.base_price || 0, // Default to 0 if not provided
      additional_ps: data.additional_ps || 0,
      distance_levy: data.distance_levy || 0,
      midnight_surcharge: data.midnight_surcharge || 0,
      ds_hourly_charter: data.ds_hourly_charter || 0,
      ds_midnight_surcharge: data.ds_midnight_surcharge || 0,
      is_ancillary: data.is_ancillary || false,
      condition_type: data.is_ancillary ? data.condition_type : null,
      condition_config: data.is_ancillary && data.condition_config ? data.condition_config : '',
      is_per_occurrence: data.is_ancillary ? (data.is_per_occurrence || false) : false,
      pricing
    };
    onSubmit(processedData);
  };

  return (
    <div className="max-w-4xl mx-auto bg-gray-900 p-8 rounded-lg shadow">
      <h1 className="text-2xl font-bold text-white mb-6">Service Vehicle Price</h1>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Service Details Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Service Details</h2>
          
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
        </div>

        {/* Vehicle Type Pricing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Vehicle Type Pricing</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-800 rounded-lg">
              <thead>
                <tr className="bg-gray-700">
                  <th className="py-3 px-4 text-left text-gray-300 font-semibold">Vehicle Type</th>
                  <th className="py-3 px-4 text-left text-gray-300 font-semibold">Price</th>
                </tr>
              </thead>
              <tbody>
                {vehicleTypes.map((vehicleType) => (
                  <tr key={vehicleType.id} className="border-b border-gray-700">
                    <td className="py-3 px-4 text-white">{vehicleType.name}</td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricing[vehicleType.id.toString()] ?? 0}
                        onChange={(e) => handlePricingChange(vehicleType.id.toString(), e.target.value)}
                        className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600"
                      />
                      {pricingErrors[vehicleType.id.toString()] && (
                        <span className="text-red-400 text-sm">{pricingErrors[vehicleType.id.toString()]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ancillary Charge Section */}
        <div className="space-y-4 border-t border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-white">Ancillary Charge Settings</h3>

          {/* Is Ancillary Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register("is_ancillary")}
              id="is_ancillary"
              className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_ancillary" className="text-gray-300">
              This is an ancillary charge (auto-applied based on conditions, hidden from job service selection)
            </label>
          </div>

          {/* Show condition fields only when is_ancillary is checked */}
          {isAncillary && (
            <div className="space-y-4 ml-6 p-4 bg-gray-800 rounded-lg">
              {/* Condition Type */}
              <div>
                <label className="block text-gray-300 mb-1">Auto-Apply Condition</label>
                <select
                  {...register("condition_type")}
                  className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600"
                >
                  <option value="">None (Manual Application)</option>
                  <option value="time_range">Time Range (e.g., Midnight Surcharge)</option>
                  <option value="additional_stops">Additional Stops</option>
                  <option value="always">Always Apply</option>
                </select>
                {errors.condition_type && <span className="text-red-400 text-sm">{errors.condition_type.message}</span>}
              </div>

              {/* Condition Configuration */}
              {conditionType === 'time_range' && (
                <div>
                  <label className="block text-gray-300 mb-1">
                    Time Range Configuration
                    <span className="text-gray-500 text-sm ml-2">(JSON format: {`{"start_time": "00:00", "end_time": "06:00"}`})</span>
                  </label>
                  <input
                    {...register("condition_config")}
                    placeholder='{"start_time": "00:00", "end_time": "06:00"}'
                    className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 font-mono text-sm"
                  />
                  {errors.condition_config && <span className="text-red-400 text-sm">{errors.condition_config.message}</span>}
                </div>
              )}

              {conditionType === 'additional_stops' && (
                <>
                  <div>
                    <label className="block text-gray-300 mb-1">
                      Additional Stops Configuration
                      <span className="text-gray-500 text-sm ml-2">(JSON format: {`{"trigger_count": 1}`} - applies when dropoffs exceed this count)</span>
                    </label>
                    <input
                      {...register("condition_config")}
                      placeholder='{"trigger_count": 1}'
                      className="w-full px-3 py-2 rounded bg-gray-700 text-white border border-gray-600 font-mono text-sm"
                    />
                    {errors.condition_config && <span className="text-red-400 text-sm">{errors.condition_config.message}</span>}
                  </div>

                  {/* Per Occurrence Checkbox */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      {...register("is_per_occurrence")}
                      id="is_per_occurrence"
                      className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_per_occurrence" className="text-gray-300 text-sm">
                      Charge per occurrence (e.g., if 3 dropoffs and trigger=1, charge 2 times)
                    </label>
                  </div>
                </>
              )}

              {conditionType === 'always' && (
                <div className="text-gray-400 text-sm italic">
                  This charge will be automatically applied to all jobs.
                </div>
              )}
            </div>
          )}
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