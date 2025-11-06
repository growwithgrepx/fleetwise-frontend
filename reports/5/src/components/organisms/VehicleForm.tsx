import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vehicleSchema } from "@/lib/validationSchemas";
import type { z } from "zod";
import type { Vehicle } from "@/lib/types";

type VehicleFormValues = z.infer<typeof vehicleSchema>;

type VehicleFormProps = {
  initialData?: Partial<Vehicle>;
  onSubmit: (data: VehicleFormValues) => void;
  isSubmitting: boolean;
  onBack?: () => void; // Add onBack prop
};

export default function VehicleForm({ initialData, onSubmit, isSubmitting, onBack }: VehicleFormProps) {
  const { register, handleSubmit, formState: { errors, touchedFields }, trigger } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { name: '', number: '', status: 'Active', ...initialData },
    mode: 'onBlur',
  });

  // More robust detection of edit mode - checks for existence and non-null value of ID
  const isEditing = initialData && typeof initialData.id !== 'undefined' && initialData.id !== null;

  const handleFormSubmit = (data: VehicleFormValues) => {
    // Always include type field with empty string value to satisfy backend constraint
    const formData = {
      ...data,
      type: ''
    };
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-w-xl mx-auto bg-gray-900 p-8 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-white mb-6">{isEditing ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
      <div className="grid grid-cols-1 gap-y-6">
        <div>
          <label className="block text-gray-300 mb-1">Name</label>
          <input {...register("name")} onBlur={e => { register("name").onBlur(e); trigger('name'); }} className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" />
          {touchedFields.name && errors.name && <span className="text-red-400 text-sm">{errors.name.message}</span>}
        </div>
        <div>
          <label className="block text-gray-300 mb-1">Number</label>
          <input {...register("number")} onBlur={e => { register("number").onBlur(e); trigger('number'); }} className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700" />
          {touchedFields.number && errors.number && <span className="text-red-400 text-sm">{errors.number.message}</span>}
        </div>
        <div>
          <label className="block text-gray-300 mb-1">Status</label>
          <select {...register("status")} onBlur={e => { register("status").onBlur(e); trigger('status'); }} className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
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
        <button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg">
          Save
        </button>
      </div>
    </form>
  );
}