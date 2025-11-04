'use client';

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useGetContractorById, useUpdateContractor } from "@/hooks/useContractors";
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { ContractorForm } from "@/components/organisms/ContractorForm";
import { ContractorPricingMatrixTable } from "@/components/organisms/ContractorPricingMatrixTable";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function EditContractorDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const { data: contractor, isLoading: isContractorLoading } = useGetContractorById(id as string);
  const updateContractorMutation = useUpdateContractor();
  
  const [activeTab, setActiveTab] = useState<'details' | 'pricing'>('details');
  const [error, setError] = useState<string | null>(null);

  const handleUpdateContractor = async (data: any) => {
    setError(null);
    
    try {
      await updateContractorMutation.mutateAsync({ 
        id: parseInt(id as string), 
        ...data 
      });
      toast.success("Contractor details updated successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to update contractor details");
      throw err;
    }
  };

  if (isContractorLoading) {
    return <div className="text-gray-400">Loading contractor...</div>;
  }

  if (!contractor) {
    return <div className="text-red-400">Contractor not found.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 w-full">
      <div className="mb-6">
        <AnimatedButton 
          variant="outline" 
          onClick={() => router.push('/contractors')}
          className="mb-4 flex items-center"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="ml-2">Back to Contractors</span>
        </AnimatedButton>
        <h1 className="text-3xl font-bold text-white mb-6">Edit Contractor: {contractor.name}</h1>
      </div>
      
      {error && <div className="mb-4 text-red-500 bg-red-100 rounded p-2">{error}</div>}
      
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'details' | 'pricing')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="mt-6">
          <ContractorForm 
            initialData={{
              id: contractor.id,
              name: contractor.name,
              contact_person: contractor.contact_person,
              contact_number: contractor.contact_number,
              email: contractor.email,
              status: contractor.status
            }}
            onSubmit={handleUpdateContractor}
            isSubmitting={updateContractorMutation.isPending}
            submitButtonText="Save Changes"
            mode="edit"
          />
        </TabsContent>
        
        <TabsContent value="pricing" className="mt-6">
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-6 text-white">Service Pricing</h2>
            <ContractorPricingMatrixTable contractorId={parseInt(id as string)} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}