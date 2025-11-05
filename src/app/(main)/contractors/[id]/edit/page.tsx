'use client';

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useGetContractorById, useUpdateContractor } from "@/hooks/useContractors";
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { ContractorForm } from "@/components/organisms/ContractorForm";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

export default function EditContractorDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const { data: contractor, isLoading: isContractorLoading } = useGetContractorById(id as string);
  const updateContractorMutation = useUpdateContractor();
  
  const [error, setError] = useState<string | null>(null);

  const handleUpdateContractor = async (data: any) => {
    setError(null);
    
    try {
      await updateContractorMutation.mutateAsync({ 
        id: parseInt(id as string), 
        ...data 
      });
      toast.success("Contractor updated successfully!");
      // Redirect to the contractors list page
      router.push("/contractors");
    } catch (err: any) {
      setError(err?.message || "Failed to update contractor");
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
    </div>
  );
}