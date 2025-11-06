"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { useGetCustomerById } from "@/hooks/useCustomers";

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: customer, isLoading, error } = useGetCustomerById(id ?? "");

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p className="text-red-500">Failed to load customer.</p>;
  if (!customer) return <p>Customer not found.</p>;

  return (
    <div className="p-6 text-text-main">
      <h1 className="text-2xl font-bold mb-4">Customer Details</h1>
      <ul className="space-y-1">
        <li><b>Name:</b> {customer.name}</li>
        <li><b>Email:</b> {customer.email}</li>
        <li><b>Mobile:</b> {customer.mobile}</li>
        <li><b>Type:</b> {customer.type}</li>
        <li><b>Status:</b> {customer.status}</li>
        <li><b>Discount %:</b> {customer.customer_discount_percent}</li>
      </ul>
      <div className="mt-6 space-x-2">
        <button
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
          onClick={() => router.push(`/customers/${customer.id}/edit`)}
        >Edit</button>
        <button
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
          onClick={() => router.push('/customers')}
        >Back</button>
      </div>
    </div>
  );
}