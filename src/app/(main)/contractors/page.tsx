"use client";
import React, { useState } from "react";
import { useGetAllContractors, useDeleteContractor } from "@/hooks/useContractors";
import { useRouter } from "next/navigation";
import { EntityTable, EntityTableColumn } from '@/components/organisms/EntityTable';
import { createStandardEntityActions } from "@/components/common/StandardActions";
import { EntityHeader } from '@/components/organisms/EntityHeader';
import type { Contractor } from "@/lib/types";
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';

export default function ContractorsPage() {
  const router = useRouter();
  const { data: contractors = [], isLoading, error } = useGetAllContractors();
  const deleteContractorMutation = useDeleteContractor();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

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
      await deleteContractorMutation.mutateAsync(pendingDeleteId);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete contractor');
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
  const sortedContractors = React.useMemo(() => {
    if (!contractors) return [];

    return [...contractors].sort((a, b) => {
      const aVal = a[sortBy as keyof Contractor];
      const bVal = b[sortBy as keyof Contractor];
      
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
  }, [contractors, sortBy, sortDir]);

  const columns: EntityTableColumn<Contractor>[] = [
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
        <span className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('contact_person')}>
          Contact Person
          {sortBy === 'contact_person' ? (
            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />
          ) : null}
        </span>
      ), 
      accessor: 'contact_person', 
      filterable: true 
    },
    { 
      label: (
        <span className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('contact_number')}>
          Contact Number
          {sortBy === 'contact_number' ? (
            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />
          ) : null}
        </span>
      ), 
      accessor: 'contact_number', 
      filterable: true 
    },
    { 
      label: (
        <span className="inline-flex items-center gap-1 cursor-pointer select-none" onClick={() => handleSort('email')}>
          Email
          {sortBy === 'email' ? (
            sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline" /> : <ArrowDown className="w-3 h-3 inline" />
          ) : null}
        </span>
      ), 
      accessor: 'email', 
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

  const actions = createStandardEntityActions<Contractor>({
    router,
    resource: 'contractors',
    handleDelete,
    isDeleting: (contractor) => deletingId === contractor.id,
  });

  return (
    <div className="w-full flex flex-col gap-4 px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <EntityHeader 
        title="Contractors" 
        onAddClick={() => router.push('/contractors/new')} 
        addLabel="Add Contractor" 
        className="mb-4"
      />
      {isLoading && <div className="text-gray-400">Loading contractors...</div>}
      {error && <div className="text-red-400">Failed to load contractors.</div>}
      {deleteError && <div className="text-red-400">{deleteError}</div>}
      <div className="overflow-x-auto">
        <EntityTable
          columns={columns}
          data={sortedContractors}
          actions={actions}
          isLoading={isLoading}
        />
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Contractor?"
        description="Are you sure you want to delete this contractor? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}