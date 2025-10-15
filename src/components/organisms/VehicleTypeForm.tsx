import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { VehicleType } from "@/lib/types";

// Define the form schema
const vehicleTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.boolean(),
});

type VehicleTypeFormValues = z.infer<typeof vehicleTypeSchema>;

type VehicleTypeFormProps = {
  initialData?: Partial<VehicleType>;
  onSubmit: (data: VehicleTypeFormValues) => void;
  isSubmitting: boolean;
  onBack?: () => void;
};

export default function VehicleTypeForm({ initialData, onSubmit, isSubmitting, onBack }: VehicleTypeFormProps) {
  const { register, handleSubmit, formState: { errors, touchedFields }, trigger } = useForm<VehicleTypeFormValues>({
    resolver: zodResolver(vehicleTypeSchema),
    defaultValues: { 
      name: '', 
      description: '', 
      status: true, 
      ...initialData 
    },
    mode: 'onBlur',
  });

  // More robust detection of edit mode - checks for existence and non-null value of ID
  const isEditing = initialData && typeof initialData.id !== 'undefined' && initialData.id !== null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl mx-auto bg-gray-900 p-8 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-white mb-6">
        {isEditing ? 'Edit Vehicle Type' : 'Add Vehicle Type'}
      </h2>
      <div className="grid grid-cols-1 gap-y-6">
        <div>
          <label className="block text-gray-300 mb-1">Name *</label>
          <input 
            {...register("name")} 
            onBlur={e => { register("name").onBlur(e); trigger('name'); }} 
            className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" 
            placeholder="Enter vehicle type name"
          />
          {touchedFields.name && errors.name && <span className="text-red-400 text-sm">{errors.name.message}</span>}
        </div>
        <div>
          <label className="block text-gray-300 mb-1">Description</label>
          <textarea 
            {...register("description")} 
            rows={4}
            onBlur={e => { register("description").onBlur(e); trigger('description'); }} 
            className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" 
            placeholder="Enter description (optional)"
          />
          {touchedFields.description && errors.description && <span className="text-red-400 text-sm">{errors.description.message}</span>}
        </div>
        <div>
          <div className="flex items-center">
            <input
              type="checkbox"
              {...register("status")}
              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-gray-300">Active</label>
          </div>
          {touchedFields.status && errors.status && <span className="text-red-400 text-sm">{errors.status.message}</span>}
        </div>
      </div>
      <div className="flex gap-2">
        {onBack && (
          <button 
            type="button" 
            onClick={onBack}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Close
          </button>
        )}
        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          {isSubmitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}