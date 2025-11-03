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
  is_ancillary?: boolean;
  condition_type?: 'time_range' | 'additional_stops' | 'always' | null;
  condition_config?: string;
  is_per_occurrence?: boolean;
};

type ServiceFormProps = {
  initialData?: Partial<ServiceFormValues>;
  onSubmit: (data: ServiceFormValues) => Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  isSubmitting: boolean;
};

export default function ServiceForm({ initialData, onSubmit, onCancel, onClose, isSubmitting }: ServiceFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      status: 'Active',
      additional_ps: 0,
      distance_levy: 0,
      midnight_surcharge: 0,
      is_ancillary: false,
      condition_type: null,
      condition_config: '',
      is_per_occurrence: false,
      ...initialData
    },
  });

  const isAncillary = watch('is_ancillary');
  const conditionType = watch('condition_type');

  const handleFormSubmit = async (data: ServiceFormValues) => {
    // Ensure all numeric fields have values
    const processedData = {
      ...data,
      base_price: data.base_price || 0,
      additional_ps: data.additional_ps || 0,
      distance_levy: data.distance_levy || 0,
      midnight_surcharge: data.midnight_surcharge || 0,
      is_ancillary: data.is_ancillary || false,
      condition_type: data.is_ancillary ? data.condition_type : null,
      condition_config: data.is_ancillary && data.condition_config ? data.condition_config : '',
      is_per_occurrence: data.is_ancillary ? (data.is_per_occurrence || false) : false,
    };
    console.log('Form submission data:', processedData);
    // Parent handles all success/error toasts - just await and let errors bubble
    await onSubmit(processedData as ServiceFormValues);
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