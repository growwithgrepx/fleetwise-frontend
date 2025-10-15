"use client";

import { useRouter } from "next/navigation";
import { useCreateContractorWithPricing } from "@/hooks/useContractors";
import { useState } from "react";
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { ContractorForm } from "@/components/organisms/ContractorForm";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

function formatError(err: any): string {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      return Object.entries(data)
        .map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
        .join(' | ');
    }
  }
  if (err?.message) return err.message;
  return "Failed to create contractor. Please check all fields and try again.";
}

export default function NewContractorPage() {
  const router = useRouter();
  const createContractorMutation = useCreateContractorWithPricing();
  const [error, setError] = useState<string | null>(null);

  const handleCreateContractor = async (data: any) => {
    setError(null);
    
    try {
      // Create the contractor with pricing data
      await createContractorMutation.mutateAsync(data);
      
      toast.success("Contractor created successfully!");
      // Redirect to the contractors list page
      router.push("/contractors");
    } catch (err: any) {
      setError(formatError(err));
      throw err;
    }
  };

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
        <h1 className="text-3xl font-bold text-white mb-6">Add New Contractor</h1>
      </div>
      
      {error && <div className="mb-4 text-red-500 bg-red-100 rounded p-2">{error}</div>}
      
      <ContractorForm 
        onSubmit={handleCreateContractor}
        isSubmitting={createContractorMutation.isPending}
        submitButtonText="Create Contractor"
        mode="create"
      />
    </div>
  );
}