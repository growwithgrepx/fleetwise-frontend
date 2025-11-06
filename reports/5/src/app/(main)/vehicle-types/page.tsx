"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useGetAllVehicleTypes, useDeleteVehicleType } from "@/hooks/useVehicleTypes";
import { EntityTable, EntityTableColumn } from '@/components/organisms/EntityTable';
import { createStandardEntityActions } from "@/components/common/StandardActions";
import { EntityHeader } from '@/components/organisms/EntityHeader';
import type { VehicleType, VehicleTypeTable } from "@/lib/types";
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';

export default function VehicleTypesPage() {
  const { data: vehicleTypes, isLoading, error } = useGetAllVehicleTypes();
  const deleteVehicleTypeMutation = useDeleteVehicleType();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const router = useRouter();

  // Transform vehicle types to match EntityTable requirements
  const transformedVehicleTypes = React.useMemo(() => {
    if (!vehicleTypes) return [];
    return vehicleTypes.map(vehicleType => ({
      ...vehicleType,
      status: vehicleType.status ? 'Active' : 'Inactive'
    }));
  }, [vehicleTypes]);

  const handleDelete = (id: string | number) => {
    setPendingDeleteId(typeof id === 'string' ? parseInt(id, 10) : id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return;
    setDeletingId(pendingDeleteId);
    setDeleteError(null);
    setConfirmOpen(false);
    try {
      await deleteVehicleTypeMutation.mutateAsync(pendingDeleteId);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete vehicle type');
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  };

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  // Sort the data
  const sortedVehicleTypes = React.useMemo(() => {
    if (!transformedVehicleTypes) return [];

    return [...transformedVehicleTypes].sort((a, b) => {
      const aVal = a[sortBy as keyof VehicleType];
      const bVal = b[sortBy as keyof VehicleType];
      
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDir === 'asc' ? 1 : -1;
      if (bVal == null) return sortDir === 'asc' ? -1 : 1;
      
      let result = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        result = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        result = aVal - bVal;
      } else {
        result = String(aVal).toLowerCase().localeCompare(String(bVal).toLowerCase());
      }
      
      return sortDir === 'asc' ? result : -result;
    }); 
  }, [transformedVehicleTypes, sortBy, sortDir]);

  const columns: EntityTableColumn<VehicleTypeTable>[] = [
    { 
      label: (
        <span className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('name')}>
          Name
          {sortBy === 'name' ? (
            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />
          ) : null}
        </span>
      ), 
      accessor: 'name', 
      filterable: true 
    },
    { 
      label: (
        <span className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('description')}>
          Description
          {sortBy === 'description' ? (
            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />
          ) : null}
        </span>
      ), 
      accessor: 'description', 
      filterable: true 
    },
    { 
      label: (
        <span className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('status')}>
          Status
          {sortBy === 'status' ? (
            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />
          ) : null}
        </span>
      ), 
      accessor: 'status', 
      filterable: true,
      render: (row: any) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          row.status === 'Active' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {row.status}
        </span>
      )
    },
  ];

  const actions = createStandardEntityActions<VehicleTypeTable>({
    router,
    resource: 'vehicle-types',
    handleDelete,
    isDeleting: (vehicleType) => deletingId === vehicleType.id,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <EntityHeader 
        title="Vehicle Types" 
        onAddClick={() => router.push('/vehicle-types/new')} 
        addLabel="Add Vehicle Type" 
        className="mb-6"
      />
      {isLoading && <div className="text-gray-400">Loading vehicle types...</div>}
      {error && <div className="text-red-400">Failed to load vehicle types.</div>}
      {deleteError && <div className="text-red-400">{deleteError}</div>}
      <EntityTable
        columns={columns}
        data={sortedVehicleTypes}
        actions={actions}
        isLoading={isLoading}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Vehicle Type?"
        description="Are you sure you want to delete this vehicle type? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}