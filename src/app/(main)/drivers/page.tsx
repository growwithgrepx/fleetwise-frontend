"use client";
import React, { useState } from "react";
import { useGetAllDrivers, useDeleteDriver } from "@/hooks/useDrivers";
import { useGetAllVehicles } from "@/hooks/useVehicles";
import { useRouter } from "next/navigation";
import { EntityTable, EntityTableColumn } from '@/components/organisms/EntityTable';
import { createStandardEntityActions } from "@/components/common/StandardActions";
import { EntityHeader } from '@/components/organisms/EntityHeader';
import type { Driver } from "@/lib/types";
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';

export default function DriversPage() {
  const router = useRouter();
  const { data: drivers = [], isLoading, error } = useGetAllDrivers();
  const { data: vehicles = [] } = useGetAllVehicles();
  const deleteDriverMutation = useDeleteDriver();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Create a map of vehicles for quick lookup
  const vehicleMap = React.useMemo(() => {
    const map: Record<number, any> = {};
    vehicles.forEach(vehicle => {
      map[vehicle.id] = vehicle;
    });
    return map;
  }, [vehicles]);

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
      await deleteDriverMutation.mutateAsync(pendingDeleteId);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete driver');
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
  const sortedDrivers = React.useMemo(() => {
    if (!drivers) return [];

    return [...drivers].sort((a, b) => {
      const aVal = a[sortBy as keyof Driver];
      const bVal = b[sortBy as keyof Driver];
      
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
  }, [drivers, sortBy, sortDir]);

  const columns: EntityTableColumn<Driver>[] = [
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
        <span className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('mobile')}>
          Mobile
          {sortBy === 'mobile' ? (
            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />
          ) : null}
        </span>
      ), 
      accessor: 'mobile', 
      filterable: true 
    },
    { 
      label: (
        <span className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('vehicle_id')}>
          Vehicle
          {sortBy === 'vehicle_id' ? (
            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />
          ) : null}
        </span>
      ), 
      accessor: 'vehicle_id',
      render: (driver) => {
        if (driver.vehicle) {
          return `${driver.vehicle.name} (${driver.vehicle.number})`;
        } else if (driver.vehicle_id && vehicleMap[driver.vehicle_id]) {
          const vehicle = vehicleMap[driver.vehicle_id];
          return `${vehicle.name} (${vehicle.number})`;
        }
        return 'No Vehicle Assigned';
      },
      filterable: true 
    },
  ];

  const actions = createStandardEntityActions<Driver>({
    router,
    resource: 'drivers',
    handleDelete,
    isDeleting: (driver) => deletingId === driver.id,
  });

  return (
    <div className="w-full flex flex-col gap-4 px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <EntityHeader 
        title="Drivers" 
        onAddClick={() => router.push('/drivers/new')} 
        addLabel="Add Driver" 
        extraActions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <AnimatedButton
              onClick={() => router.push('/drivers/leave')}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white rounded-lg px-4 py-2 w-full sm:w-auto justify-center"
            >
              Leave Management
            </AnimatedButton>
            <AnimatedButton
              onClick={() => router.push('/drivers/leave-overrides')}
              className="bg-gradient-to-r from-blue-600 to-blue-800 hover:opacity-90 text-white rounded-lg px-4 py-2 w-full sm:w-auto justify-center"
            >
              Leave Overrides
            </AnimatedButton>
          </div>
        }
        className="mb-4"
      />
      {isLoading && <div className="text-gray-400">Loading drivers...</div>}
      {error && <div className="text-red-400">Failed to load drivers.</div>}
      {deleteError && <div className="text-red-400">{deleteError}</div>}
      <EntityTable
        columns={columns}
        data={sortedDrivers}
        actions={actions}
        isLoading={isLoading}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Driver?"
        description="Are you sure you want to delete this driver? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}