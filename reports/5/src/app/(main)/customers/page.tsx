"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGetAllCustomers, useDeleteCustomer } from '@/hooks/useCustomers';
import { EntityTable, EntityTableColumn, EntityTableAction } from '@/components/organisms/EntityTable';
import { createStandardEntityActions } from '@/components/common/StandardActions';
import { EntityHeader } from '@/components/organisms/EntityHeader';
import type { Customer } from '@/types/customer';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';
// import { useDeleteCustomerPricing } from '@/hooks/useDeletePriceCustomer';

export default function CustomersPage() {
  const { data: customers, isLoading, error } = useGetAllCustomers();
  const deleteCustomerMutation = useDeleteCustomer();
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
      await deleteCustomerMutation.mutateAsync(pendingDeleteId);
      // await deletePricingMutation.mutateAsync(pendingDeleteId);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete customer');
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
  const sortedCustomers = React.useMemo(() => {
    if (!customers) return [];

    return [...customers].sort((a, b) => {
      const aVal = a[sortBy as keyof Customer];
      const bVal = b[sortBy as keyof Customer];
      
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
  }, [customers, sortBy, sortDir]);

  const columns: EntityTableColumn<Customer>[] = [
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

    const actions = createStandardEntityActions<Customer>({
    router,
    resource: 'customers',
    handleDelete,
    isDeleting: (customer: Customer) => deletingId === customer.id,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <EntityHeader 
        title="Customers" 
        onAddClick={() => router.push('/customers/new')} 
        addLabel="Add Customer" 
        className="mb-6"
      />
      {isLoading && <div className="text-gray-400">Loading customers...</div>}
      {error && <div className="text-red-400">Failed to load customers.</div>}
      {deleteError && <div className="text-red-400">{deleteError}</div>}
      <EntityTable
        columns={columns}
        data={sortedCustomers}
        actions={actions}
        isLoading={isLoading}
      />
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Customer?"
        description="Are you sure you want to delete this customer? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}