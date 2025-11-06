"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGetVehicleById } from "@/hooks/useVehicles";

export default function VehicleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const {
    data: vehicle,
    isLoading,
    isError,
    error,
  } = useGetVehicleById(Number(id));

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p style={{ color: 'red' }}>{(error as Error)?.message || "Failed to load vehicle"}</p>;
  if (!vehicle) return <p>Vehicle not found.</p>;

  return (
    <div>
      <h1>Vehicle Details</h1>
      <ul>
        <li><b>Name:</b> {vehicle.name}</li>
        <li><b>Number:</b> {vehicle.number}</li>
        <li><b>Status:</b> {vehicle.status}</li>
      </ul>
      <button onClick={() => router.push(`/vehicles/${vehicle.id}/edit`)}>Edit</button>
      <button onClick={() => router.push('/vehicles')} style={{ marginLeft: 8 }}>Back</button>
    </div>
  );
}