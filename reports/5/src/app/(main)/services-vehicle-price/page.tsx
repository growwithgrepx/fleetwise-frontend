'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { EntityTable } from '@/components/organisms/EntityTable';
import { EntityHeader } from '@/components/organisms/EntityHeader';
import { useGetAllServices } from '@/hooks/useServices';
import { useGetAllVehicleTypes } from '@/hooks/useVehicleTypes';
import { useGetAllServicesVehicleTypePrice, useDeleteServicesVehicleTypePrice } from '@/hooks/useServicesVehicleTypePrice';
import { useDeleteService } from '@/hooks/useServices';
import type { ServicesVehicleTypePrice } from '@/types/servicesVehicleTypePrice';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { PlusCircle, Pencil, Trash2, Eye } from 'lucide-react';

// Extend the ServicesVehicleTypePrice interface to match EntityTable requirements
interface ServicesVehicleTypePriceWithStatus extends ServicesVehicleTypePrice {
  status?: string;
}

// Create a type for grouped service data
interface GroupedServiceData {
  id: number; // service_id
  service_id: number;
  service_name: string;
  vehicle_types_count: number;
}

export default function ServicesVehiclePricePage() {
  const { data: services = [], isLoading: servicesLoading, refetch: refetchServices } = useGetAllServices();
  const { data: vehicleTypes = [], isLoading: vehicleTypesLoading } = useGetAllVehicleTypes();
  const { data: servicesVehicleTypePrice = [], isLoading: servicesVehicleTypePriceLoading, error, refetch: refetchServicesVehicleTypePrice } = useGetAllServicesVehicleTypePrice();
  const deleteServiceMutation = useDeleteService();
  const deletePricingMutation = useDeleteServicesVehicleTypePrice();
  
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const router = useRouter();

  // Group services vehicle type prices by service and include services without pricing
  const groupedServiceData = React.useMemo(() => {
    // Create a map of service_id to unique vehicle_type_id entries
    const pricingMap: Record<number, Set<number>> = {};
    
    servicesVehicleTypePrice.forEach(item => {
      if (!pricingMap[item.service_id]) {
        pricingMap[item.service_id] = new Set<number>();
      }
      // Add vehicle_type_id to the set to ensure uniqueness
      pricingMap[item.service_id].add(item.vehicle_type_id);
    });

    // Map all services to include those without pricing entries
    return services.map(service => {
      const vehicleTypesForService = pricingMap[service.id] || new Set<number>();
      return {
        id: service.id,
        service_id: service.id,
        service_name: service.name,
        vehicle_types_count: vehicleTypesForService.size
      };
    });
  }, [servicesVehicleTypePrice, services]);

  const handleDelete = (id: string | number) => {
    // For grouped data, we need to delete all pricing entries for this service
    setPendingDeleteId(typeof id === 'string' ? parseInt(id, 10) : id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId == null) return;
    setDeletingId(pendingDeleteId);
    setDeleteError(null);
    setConfirmOpen(false);
    
    // Find all pricing entries for this service and delete them
    const pricingEntries = servicesVehicleTypePrice.filter(item => item.service_id === pendingDeleteId);
    
    try {
      // Delete all pricing entries for this service
      for (const entry of pricingEntries) {
        await deletePricingMutation.mutateAsync(entry.id);
      }
      
      // Delete the service itself
      await deleteServiceMutation.mutateAsync(pendingDeleteId);
      
      // Refetch data to ensure UI is updated
      await refetchServices();
      await refetchServicesVehicleTypePrice();
      
      toast.success('Service and all associated pricing deleted successfully');
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete service and pricing');
    } finally {
      setDeletingId(null);
      setPendingDeleteId(null);
    }
  };

  const handleView = (item: GroupedServiceData) => {
    // For view, we can show the first service-vehicle price entry for this service
    // If no pricing exists, we can still navigate to the service page
    const firstEntry = servicesVehicleTypePrice.find(entry => entry.service_id === item.service_id);
    if (firstEntry) {
      router.push(`/services-vehicle-price/${firstEntry.id}`);
    } else {
      // If no pricing exists, we can navigate to a new pricing page for this service
      router.push(`/services-vehicle-price/new?service_id=${item.service_id}`);
    }
  };

  const handleEdit = (item: GroupedServiceData) => {
    // For edit, we redirect to our custom edit page
    router.push(`/services-vehicle-price/${item.service_id}/edit`);
  };

  const columns = [
    {
      accessor: 'service_name',
      label: 'Service',
      render: (row: GroupedServiceData) => row.service_name
    },
    {
      accessor: 'vehicle_types_count',
      label: 'Vehicle Types Count',
      render: (row: GroupedServiceData) => row.vehicle_types_count
    }
  ];

  // Custom actions for grouped service data
  const actions = [
    {
      label: 'View',
      icon: <Eye className="h-4 w-4" />,
      onClick: handleView,
      ariaLabel: 'View Service',
    },
    {
      label: 'Edit',
      icon: <Pencil className="h-4 w-4" />,
      onClick: handleEdit,
      ariaLabel: 'Edit Service',
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4 text-red-500" />,
      onClick: (item) => handleDelete(item.service_id),
      ariaLabel: 'Delete Service',
      disabled: (item) => deletingId === item.service_id,
    }
  ];

  const isLoading = servicesLoading || vehicleTypesLoading || servicesVehicleTypePriceLoading;

  return (
    <div className="container mx-auto px-4 py-8">
      <EntityHeader 
        title="Services" 
        subtitle="Manage service pricing for different vehicle types"
        onAddClick={() => router.push('/services-vehicle-price/new')} 
        addLabel="Add Service" 
        className="mb-6"
      />
      
      {isLoading && <div className="text-gray-400">Loading services vehicle price...</div>}
      {error && <div className="text-red-400">Failed to load services vehicle price.</div>}
      {deleteError && <div className="text-red-400">{deleteError}</div>}
      
      <EntityTable
        columns={columns}
        data={groupedServiceData}
        actions={actions}
        isLoading={isLoading}
      />
      
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Service?"
        description="Are you sure you want to delete this service and all associated pricing entries? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setPendingDeleteId(null); }}
      />
    </div>
  );
}