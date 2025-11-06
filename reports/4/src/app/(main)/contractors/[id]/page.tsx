'use client';

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export default function ContractorDetailsPage() {
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    // Redirect to the edit page
    if (id) {
      router.replace(`/contractors/${id}/edit`);
    }
  }, [id, router]);

  return <div className="text-gray-400">Redirecting...</div>;
}
