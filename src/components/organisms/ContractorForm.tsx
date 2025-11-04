"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGetAllServices } from "@/hooks/useServices";
import { useGetAllVehicleTypes } from "@/hooks/useVehicleTypes";
import { bulkUpdateContractorPricing, getContractorPricing } from "@/services/api/contractorsApi";
import { toast } from 'react-hot-toast';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import PhoneInput from '@/components/molecules/PhoneInput';
import { ContractorPricingMatrixTable } from '@/components/organisms/ContractorPricingMatrixTable';
import { ContractorPricingMatrixTableForCreation } from '@/components/organisms/ContractorPricingMatrixTableForCreation';

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
  pricing_data?: { service_id: number; cost: number }[];
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
  const [currentStep, setCurrentStep] = useState(1); // 1 for details, 2 for pricing
  const [pricingData, setPricingData] = useState<Record<number, number>>({});
  const [displayValues, setDisplayValues] = useState<Record<number, string>>({}); // For tracking display values
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [pricingDataForCreation, setPricingDataForCreation] = useState<{ service_id: number; vehicle_type_id: number; cost: number }[]>([]);
  
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    getValues,
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

  // Initialize pricing data with existing values or defaults
  useEffect(() => {
    const initializePricing = async () => {
      if (mode === 'edit' && initialData?.id) {
        setIsLoadingPricing(true);
        try {
          // Fetch existing pricing data for edit mode
          const existingPricing = await getContractorPricing(initialData.id);
          
          // Create a map of service_id to cost
          const pricingMap: Record<number, number> = {};
          const displayMap: Record<number, string> = {};
          existingPricing.forEach(pricing => {
            pricingMap[pricing.service_id] = pricing.cost;
            displayMap[pricing.service_id] = pricing.cost.toString();
          });
          
          // Initialize pricing data with existing values or 0 for new services
          const initialPricing: Record<number, number> = {};
          const initialDisplay: Record<number, string> = {};
          services.forEach(service => {
            initialPricing[service.id] = pricingMap[service.id] ?? 0;
            initialDisplay[service.id] = displayMap[service.id] ?? "0.00";
          });
          
          setPricingData(initialPricing);
          setDisplayValues(initialDisplay);
        } catch (error) {
          // If there's an error fetching pricing, initialize with 0
          const initialPricing: Record<number, number> = {};
          const initialDisplay: Record<number, string> = {};
          services.forEach(service => {
            initialPricing[service.id] = 0;
            initialDisplay[service.id] = "";
          });
          setPricingData(initialPricing);
          setDisplayValues(initialDisplay);
        } finally {
          setIsLoadingPricing(false);
        }
      } else {
        // For create mode, initialize with 0
        const initialPricing: Record<number, number> = {};
        const initialDisplay: Record<number, string> = {};
        services.forEach(service => {
          initialPricing[service.id] = 0;
          initialDisplay[service.id] = "";
        });
        setPricingData(initialPricing);
        setDisplayValues(initialDisplay);
      }
    };

    if (services.length > 0) {
      initializePricing();
    }
  }, [services, mode, initialData?.id]);

  const handlePricingChange = (serviceId: number, value: string) => {
    // Allow empty value or valid number input
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      // Update display value immediately
      setDisplayValues(prev => ({
        ...prev,
        [serviceId]: value
      }));
      
      // Update numeric value for submission
      const numValue = parseFloat(value);
      if ((!isNaN(numValue) && numValue >= 0) || value === '') {
        const numericValue = value === '' ? 0 : numValue;
        setPricingData(prev => ({
          ...prev,
          [serviceId]: numericValue
        }));
      }
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate contractor details before moving to pricing
      const formData = getValues();
      const validation = contractorSchema.safeParse(formData);
      
      if (validation.success) {
        setCurrentStep(2);
      } else {
        // Trigger validation errors
        toast.error("Please fill in all required fields correctly.");
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

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
          // Prepare pricing data for bulk update
          const pricingToUpdate = services.map((service) => ({
            service_id: service.id,
            cost: pricingData[service.id] ?? 0
          }));
          
          // Validate that all costs are non-negative
          let hasError = false;
          for (const pricing of pricingToUpdate) {
            if (pricing.cost < 0) {
              toast.error(`Cost for ${services.find(s => s.id === pricing.service_id)?.name || 'Service'} must be non-negative`);
              hasError = true;
            }
          }
          
          if (!hasError) {
            try {
              // Update all pricing
              await bulkUpdateContractorPricing(contractorId, pricingToUpdate);
              toast.success("Service pricing updated successfully!");
            } catch (pricingError) {
              toast.error("Failed to update pricing.");
            }
          }
        }
      }
    } catch (err) {
      // Error handling should be done in the parent component
      throw err;
    }
  };

  if (isServicesLoading || isVehicleTypesLoading || isLoadingPricing) {
    return <div className="text-gray-400">Loading services, vehicle types and pricing data...</div>;
  }

  return (
    <div className="w-full">
      {/* Progress Indicator */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep === 1 ? 'bg-blue-600' : 'bg-green-600'}`}>
              <span className="text-white">1</span>
            </div>
            <span className="mt-2 text-sm text-gray-300">Details</span>
          </div>
          
          <div className={`flex-1 h-1 mx-2 ${currentStep === 2 ? 'bg-blue-600' : 'bg-gray-600'}`}></div>
          
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep === 2 ? 'bg-blue-600' : 'bg-gray-600'}`}>
              <span className="text-white">2</span>
            </div>
            <span className="mt-2 text-sm text-gray-300">Pricing</span>
          </div>
        </div>
      </div>
      
      <form 
        onSubmit={handleSubmit(handleFormSubmit)}
        className="max-w-4xl mx-auto bg-gray-900 p-8 rounded-lg shadow w-full"
      >
        {/* Step 1: Contractor Details */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">Contractor Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {touchedFields.name && errors.name && (
                  <span className="text-red-400 text-sm">{errors.name.message}</span>
                )}
              </div>
              
              <div>
                <label htmlFor="contact_person" className="block text-gray-300 mb-1">
                  Contact Person
                </label>
                <input
                  id="contact_person"
                  type="text"
                  {...register("contact_person")}
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="contact_number" className="block text-gray-300 mb-1">
                  Contact Number
                </label>
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
              </div>
              
              <div>
                <label htmlFor="email" className="block text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {touchedFields.email && errors.email && (
                  <span className="text-red-400 text-sm">{errors.email.message}</span>
                )}
              </div>
              
              <div>
                <label htmlFor="status" className="block text-gray-300 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  {...register("status")}
                  className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end mt-8">
              <Button
                type="button"
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg flex items-center"
              >
                Next <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Step 2: Service Pricing */}
        {currentStep === 2 && (
          <div className="w-full">
            <h2 className="text-2xl font-bold mb-6 text-white">Service Costs</h2>
            
            {initialData?.id ? (
              // For edit mode, use the matrix table
              <ContractorPricingMatrixTable contractorId={initialData.id} />
            ) : (
              // For create mode, use the matrix table for creation
              <div className="space-y-4">
                <p className="text-gray-300">
                  Set the initial pricing for each service and vehicle type combination. You can modify these prices later.
                </p>
                <ContractorPricingMatrixTableForCreation 
                  services={services} 
                  vehicleTypes={vehicleTypes} 
                  onPricingChange={setPricingDataForCreation}
                />
              </div>
            )}
            
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                onClick={handleBack}
                className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center"
              >
                <ArrowLeft className="mr-2 w-4 h-4" /> Back
              </Button>
              
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg flex items-center"
                  disabled={isSubmitting}
                >
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
            </div>
          </div>
        )}
      </form>
    </div>
  );
}