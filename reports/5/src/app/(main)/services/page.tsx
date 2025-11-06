"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useGetAllServices, useDeleteService } from "@/hooks/useServices";
import { EntityTable, EntityTableColumn } from '@/components/organisms/EntityTable';
import { createStandardEntityActions } from "@/components/common/StandardActions";
import { EntityHeader } from '@/components/organisms/EntityHeader';
import type { Service } from "@/lib/types";
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';

export default function ServicesPage() {
  const { data: services, isLoading, error } = useGetAllServices();
  const deleteServiceMutation = useDeleteService();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const router = useRouter();

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
      await deleteServiceMutation.mutateAsync(pendingDeleteId);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete service');
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
  const sortedServices = React.useMemo(() => {
    if (!services) return [];

    return [...services].sort((a, b) => {
      const aVal = a[sortBy as keyof Service];
      const bVal = b[sortBy as keyof Service];
      
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
  }, [services, sortBy, sortDir]);

  const columns: EntityTableColumn<Service>[] = [
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
        <span className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('base_price')}>
          Transfer (Per way)
          {sortBy === 'base_price' ? (
            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />
          ) : null}
        </span>
      ), 
      accessor: 'base_price', 
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
      filterable: true 
    },
  ];

  const actions = createStandardEntityActions<Service>({
    router,
    resource: 'services',
    handleDelete,
    isDeleting: (service) => deletingId === service.id,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <EntityHeader 
        title="Services" 
        onAddClick={() => router.push('/services/new')} 
        addLabel="Add Service" 
        className="mb-6"
      />
      {isLoading && <div className="text-gray-400">Loading services...</div>}
      {error && <div className="text-red-400">Failed to load services.</div>}
      {deleteError && <div className="text-red-400">{deleteError}</div>}
      <EntityTable
        columns={columns}
        data={sortedServices}
        actions={actions}
        isLoading={isLoading}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Service?"
        description="Are you sure you want to delete this service? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}