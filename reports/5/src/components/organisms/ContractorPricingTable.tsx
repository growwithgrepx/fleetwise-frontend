'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getContractorPricing, updateContractorPricing, bulkUpdateContractorPricing } from '@/services/api/contractorsApi';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { useBulkUpdateContractorPricing } from '@/hooks/useContractors';

interface Service {
  id: number;
  name: string;
}

interface ContractorPricing {
  id: number;
  contractor_id: number;
  service_id: number;
  service_name: string;
  cost: number;
}

interface ContractorPricingTableProps {
  contractorId: number;
  services: Service[];
}

export function ContractorPricingTable({ contractorId, services }: ContractorPricingTableProps) {
  const queryClient = useQueryClient();
  
  // Fetch contractor pricing data
  const { data: pricingData = [], refetch } = useQuery({
    queryKey: ['contractor-pricing', contractorId],
    queryFn: () => getContractorPricing(contractorId)
  });
  
  // Mutation for updating pricing
  const updatePricingMutation = useMutation({
    mutationFn: ({ contractorId, serviceId, cost }: { contractorId: number, serviceId: number, cost: number }) => 
      updateContractorPricing(contractorId, serviceId, cost),
    onSuccess: () => {
      toast.success('Pricing updated successfully');
      queryClient.invalidateQueries({ queryKey: ['contractor-pricing', contractorId] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update pricing');
    }
  });
  
  // Bulk update mutation
  const bulkUpdatePricingMutation = useMutation({
    mutationFn: ({ contractorId, pricingData }: { contractorId: number, pricingData: { service_id: number; cost: number }[] }) => 
      bulkUpdateContractorPricing(contractorId, pricingData),
    onSuccess: () => {
      toast.success('All pricing updated successfully');
      queryClient.invalidateQueries({ queryKey: ['contractor-pricing', contractorId] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update pricing');
    }
  });

  const [editedCosts, setEditedCosts] = useState<Record<number, number>>({});
  const [isSaving, setIsSaving] = useState<Record<number, boolean>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Initialize edited costs with existing pricing data
  useEffect(() => {
    const initialCosts: Record<number, number> = {};
    pricingData.forEach(pricing => {
      initialCosts[pricing.service_id] = pricing.cost;
    });
    setEditedCosts(initialCosts);
  }, [pricingData]);

  const handleCostChange = (serviceId: number, value: string) => {
    // Allow empty value or valid non-negative number input
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value);
      if ((!isNaN(numValue) && numValue >= 0) || value === '') {
        setEditedCosts(prev => ({
          ...prev,
          [serviceId]: value === '' ? 0 : numValue
        }));
      }
    }
  };

  const handleSave = async (serviceId: number) => {
    const cost = editedCosts[serviceId] || 0;
    
    // Validate that cost is non-negative
    if (cost < 0) {
      toast.error('Cost must be non-negative');
      return;
    }
    
    try {
      setIsSaving(prev => ({ ...prev, [serviceId]: true }));
      updatePricingMutation.mutate({ contractorId, serviceId, cost });
    } finally {
      setIsSaving(prev => ({ ...prev, [serviceId]: false }));
    }
  };

  const handleSaveAll = async () => {
    // Prepare bulk update data
    const pricingDataToUpdate = services.map(service => ({
      service_id: service.id,
      cost: editedCosts[service.id] || 0
    }));
    
    // Validate that all costs are non-negative
    for (const pricing of pricingDataToUpdate) {
      if (pricing.cost < 0) {
        toast.error(`Cost for ${services.find(s => s.id === pricing.service_id)?.name || 'Service'} must be non-negative`);
        return;
      }
    }
    
    try {
      setIsSavingAll(true);
      bulkUpdatePricingMutation.mutate({ contractorId, pricingData: pricingDataToUpdate });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update pricing');
    } finally {
      setIsSavingAll(false);
    }
  };

  const getCostForService = (serviceId: number) => {
    return editedCosts[serviceId] ?? 0;
  };

  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={isSavingAll || bulkUpdatePricingMutation.isPending}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          {bulkUpdatePricingMutation.isPending || isSavingAll ? 'Saving All...' : 'Save All'}
        </Button>
      </div>
      
      <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Service
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Cost ($)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-700">
            {services.map((service) => {
              const currentCost = getCostForService(service.id);
              return (
                <tr key={service.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                    {service.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editedCosts[service.id] !== undefined ? (editedCosts[service.id] === 0 ? '' : editedCosts[service.id].toString()) : ''}
                      onChange={(e) => handleCostChange(service.id, e.target.value)}
                      className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                    <Button
                      onClick={() => handleSave(service.id)}
                      disabled={isSaving[service.id] || isSavingAll || bulkUpdatePricingMutation.isPending}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded"
                    >
                      {isSaving[service.id] ? 'Saving...' : 'Save'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {services.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No services available. Please create services first.
        </div>
      )}
    </div>
  );
}
