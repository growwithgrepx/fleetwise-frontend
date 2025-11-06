"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  schema: z.ZodSchema<any>;
  onSubmit: (data: any) => Promise<any>;
  fields: {
    name: string;
    label: string;
    type: 'text' | 'email' | 'tel' | 'number' | 'select';
    required?: boolean;
    options?: { value: string; label: string }[];
    placeholder?: string;
  }[];
  onSuccess?: (data: any) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  title,
  schema,
  onSubmit,
  fields,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<any>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      const result = await onSubmit(data);
      toast.success(`${title} added successfully!`);
      onSuccess?.(result);
      reset();
      onClose();
    } catch (error) {
      console.error('Quick add error:', error);
      toast.error('Failed to add. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border-2 border-gray-700 shadow-2xl rounded-xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label className="block text-sm font-semibold text-gray-200">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                
                {field.type === 'select' ? (
                  <div className="relative">
                    <select
                      {...register(field.name)}
                      className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value} className="bg-gray-800 text-white">
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <input
                    type={field.type}
                    {...register(field.name)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                )}
                
                {errors[field.name] && (
                  <p className="text-sm text-red-400 mt-1">{errors[field.name]?.message as string}</p>
                )}
              </div>
            ))}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-gray-300 hover:text-white transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                {isSubmitting ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 