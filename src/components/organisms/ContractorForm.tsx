"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetAllServices } from "@/hooks/useServices";
import { useGetAllVehicleTypes } from "@/hooks/useVehicleTypes";
import { bulkUpdateContractorPricing, getContractorPricing } from "@/services/api/contractorsApi";
import { toast } from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { Save, ArrowLeft } from 'lucide-react';
import PhoneInput from '@/components/molecules/PhoneInput';

import { ContractorPricingMatrixTable } from '@/components/organisms/ContractorPricingMatrixTable';
import { ContractorPricingMatrixTableForCreation } from '@/components/organisms/ContractorPricingMatrixTableForCreation';
import { FormSection } from '@/components/molecules/FormSection';
import { FormField } from '@/components/molecules/FormField';
import { Input } from '@/components/atoms/Input';

// Define schema for form validation
const contractorSchema = z.object({
  name: z.string().min(2, "Please enter the contractor name."),
  contact_person: z.string().optional(),
  contact_number: z.string().optional().refine(val => {
    if (!val) return true; // Empty is valid (optional field)
    // Must start with + and be at least 8 characters total
    return val.startsWith('+') && val.length >= 8 && val.length <= 16;
  }, "Please enter a valid mobile number"),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal("")),
  status: z.string(),
});

type ContractorFormValues = z.infer<typeof contractorSchema>;

interface ContractorFormData {
  name: string;
  contact_person?: string;
  contact_number?: string;
  email?: string;
  status: string;
  pricing_data?: { service_id: number; vehicle_type_id: number; cost: number }[];
}

interface ContractorFormProps {
  initialData?: {
    id: number;
    name: string;
    contact_person: string;
    contact_number: string;
    email: string;
    status: string;
  };
  onSubmit: (data: ContractorFormValues | ContractorFormData) => Promise<any>;
  isSubmitting?: boolean;
  submitButtonText?: string;
  mode: 'create' | 'edit';
}

export function ContractorForm({ 
  initialData, 
  onSubmit, 
  isSubmitting = false, 
  submitButtonText = "Save Contractor",
  mode 
}: ContractorFormProps) {
  const { data: services = [], isLoading: isServicesLoading } = useGetAllServices();
  const { data: vehicleTypes = [], isLoading: isVehicleTypesLoading } = useGetAllVehicleTypes();
  const [pricingDataForCreation, setPricingDataForCreation] = useState<{ service_id: number; vehicle_type_id: number; cost: number }[]>([]);

  
  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields },
    setValue,
    watch,
  } = useForm<ContractorFormValues>({
    resolver: zodResolver(contractorSchema),
    mode: "onBlur",
    defaultValues: {
      name: initialData?.name || "",
      contact_person: initialData?.contact_person || "",
      contact_number: initialData?.contact_number || "",
      email: initialData?.email || "",
      status: initialData?.status || "Active",
    },
  });

  const handleFormSubmit = async (data: ContractorFormValues) => {
    try {
      // For new contractors, include pricing data in the creation request
      if (mode === 'create') {
        // Validate that all costs are non-negative
        let hasError = false;
        for (const pricing of pricingDataForCreation) {
          if (pricing.cost < 0) {
            toast.error(`Cost for ${services.find(s => s.id === pricing.service_id)?.name || 'Service'} must be non-negative`);
            hasError = true;
          }
        }
        
        if (!hasError) {
          // Create contractor with pricing data
          const contractorData = {
            name: data.name?.trim() || "",
            contact_person: data.contact_person?.trim() || undefined,
            contact_number: data.contact_number?.trim() || undefined,
            email: data.email?.trim() || undefined,
            status: data.status || "Active",
            pricing_data: pricingDataForCreation
          };
          
          await onSubmit(contractorData);
          toast.success("Contractor created successfully with pricing!");
        }
      } else {
        // For existing contractors, update details first
        const result = await onSubmit(data);
        
        // Then handle pricing if we have a contractor ID and services
        const contractorId = initialData?.id;
        if (services.length > 0 && contractorId) {
          // For edit mode, we're using the ContractorPricingMatrixTable component
          // which handles its own state management, so we don't need to update pricing here
          toast.success("Contractor details updated successfully!");
        }
      }
    } catch (err) {
      // Error handling should be done in the parent component
      throw err;
    }
  };

  if (isServicesLoading || isVehicleTypesLoading) {
    return <div className="text-gray-400">Loading services, vehicle types and pricing data...</div>;
  }

  return (
    <form 
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6"
    >
      <div className="space-y-8">
        <FormSection title="Contractor Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
            <FormField
              label="Contractor Name *"
              error={touchedFields.name && errors.name?.message}
            >
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    className="w-full"
                    onBlur={(e) => {
                      field.onBlur();
                    }}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Contact Person"
              error={touchedFields.contact_person && errors.contact_person?.message}
            >
              <Controller
                name="contact_person"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    className="w-full"
                    onBlur={(e) => {
                      field.onBlur();
                    }}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Contact Number"
              error={touchedFields.contact_number && errors.contact_number?.message}
            >
              <PhoneInput
                value={watch("contact_number") || ""}
                onChange={(phone) => {
                  setValue("contact_number", phone, { shouldValidate: true });
                }}
                error={touchedFields.contact_number && errors.contact_number ? errors.contact_number.message : undefined}
                placeholder="Enter mobile number"
                name="contact_number"
                className="w-full"
              />
            </FormField>

            <FormField
              label="Email"
              error={touchedFields.email && errors.email?.message}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="email"
                    className="w-full"
                    onBlur={(e) => {
                      field.onBlur();
                    }}
                  />
                )}
              />
            </FormField>

            <FormField
              label="Status *"
              error={touchedFields.status && errors.status?.message}
            >
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700"
                    onBlur={(e) => {
                      field.onBlur();
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                )}
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Service Pricing">
          <div className="space-y-4">
            <p className="text-gray-300">
              Set the initial pricing for each service and vehicle type combination. You can modify these prices later.
            </p>
            {mode === 'create' ? (
              <ContractorPricingMatrixTableForCreation 
                services={services} 
                vehicleTypes={vehicleTypes} 
                onPricingChange={setPricingDataForCreation}
              />
            ) : (
              initialData?.id && <ContractorPricingMatrixTable contractorId={initialData.id} />
            )}
          </div>
        </FormSection>
      </div>

      <div className="flex justify-end mt-8 gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="ml-2">Back</span>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
              <span className="ml-2">Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span className="ml-2">{submitButtonText}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}