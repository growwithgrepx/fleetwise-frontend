'use client';

import { useRouter } from "next/navigation";
import DriverForm from "@/components/organisms/DriverForm";
import { useCreateDriver } from "@/hooks/useDrivers";
import { useState } from "react";

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
  return "Failed to create driver. Please check all fields and try again.";
}

export default function NewDriverPage() {
  const router = useRouter();
  const createDriverMutation = useCreateDriver();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    setError(null);
    // Only send fields accepted by the backend
    const payload:any = {
      name: data.name?.trim() || "",
      mobile: data.mobile?.trim() || undefined,
      // status is UI-only, do not send
    };
    try {
      await createDriverMutation.mutateAsync(payload);
      router.push("/drivers");
    } catch (err: any) {
      setError(formatError(err));
    }
  };

  return (
    <div>
      {error && <div className="mb-4 text-red-500 bg-red-100 rounded p-2">{error}</div>}
      <DriverForm
        mode="create"
        onSubmit={handleSubmit}
        isSubmitting={createDriverMutation.isPending}
      />
    </div>
  );
} 