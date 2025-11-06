"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGetServiceById  } from "@/hooks/useServices";

export default function ServiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const {
    data: service,
    isLoading,
    isError,
    error,
  } = useGetServiceById(Number(id));

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p style={{ color: 'red' }}>{(error as Error)?.message || "Failed to load Service"}</p>;
  if (!service) return <p>Service not found.</p>;

  return (
    <div>
      <h1>Service Details</h1>
      <ul>
        <li><b>Name:</b> {service.name}</li>
        <li><b>Description:</b> {service.description}</li>
        <li><b>Base Price:</b> {service.base_price}</li>
        <li><b>Status:</b> {service.status}</li>
      </ul>
      <button onClick={() => router.push(`/services/${service.id}/edit`)}>Edit</button>
      <button onClick={() => router.push('/services')} style={{ marginLeft: 8 }}>Back</button>
    </div>
  );
} 