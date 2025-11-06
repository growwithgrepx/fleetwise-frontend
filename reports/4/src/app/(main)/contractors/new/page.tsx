"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useCreateContractorWithPricing } from "@/hooks/useContractors";
import { useState } from "react";
import { toast } from 'react-hot-toast';
import { ContractorForm } from "@/components/organisms/ContractorForm";

function formatError(err: {
  response: { data: string };
  message: string;
}): string {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === "string") return data;
    if (typeof data === "object") {
      return Object.entries(data)
        .map(
          ([field, msg]) =>
            `${field}: ${Array.isArray(msg) ? msg.join(", ") : msg}`
        )
        .join(" | ");
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Add Contractor</h1>
      {error && (
        <div className="mb-4 text-red-500 bg-red-100 rounded p-2">{error}</div>
      )}
      <ContractorForm 
        onSubmit={handleCreateContractor}
        isSubmitting={createContractorMutation.isPending}
        submitButtonText="Create Contractor"
        mode="create"
      />
    </div>
  );
}