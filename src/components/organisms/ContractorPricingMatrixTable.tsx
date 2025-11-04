'use client';

import React, { useState, useEffect } from 'react';
import { useContractorPricingMatrix, useUpdateContractorVehicleTypePricing } from '@/hooks/useContractorServicePricing';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Input } from '@/components/ui/Input';

interface PricingMatrixRow {
  service_id: number;
  service_name: string;
  pricing: {
    vehicle_type_id: number;
    service_id: number;
    cost: number;
    id?: number;
  }[];
}

interface ContractorPricingMatrixTableProps {
  contractorId: number;
}

export function ContractorPricingMatrixTable({ contractorId }: ContractorPricingMatrixTableProps) {
  console.log('ContractorPricingMatrixTable received contractorId:', contractorId); // Debug log
  const { vehicleTypes, services, pricingMatrix, isLoading, refetch } = useContractorPricingMatrix(contractorId);
  console.log('Hook returned data:', { vehicleTypes, services, pricingMatrix, isLoading }); // Debug log
  const updatePricingMutation = useUpdateContractorVehicleTypePricing(contractorId);
  
  // State to track edited costs
  const [editedCosts, setEditedCosts] = useState<Record<string, string | number>>({});
  const [isSaving, setIsSaving] = useState(false);
  // State to track if we've initialized the edited costs
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Reset initialization when contractorId changes
  useEffect(() => {
    setIsInitialized(false);
    setEditedCosts({});
  }, [contractorId]);
  
  // Initialize edited costs with existing pricing data
  useEffect(() => {
    console.log('useEffect triggered:', { 
      isInitialized, 
      pricingMatrixLength: pricingMatrix.length, 
      contractorId,
      hasPricingData: pricingMatrix.length > 0
    }); // Debug log
    console.log('pricingMatrix data in useEffect:', pricingMatrix); // Debug log
    
    // Only initialize once when we have pricing data and haven't initialized yet
    if (!isInitialized && pricingMatrix.length > 0) {
      console.log('Initializing component...'); // Debug log
      // Don't pre-populate editedCosts with existing values
      // Instead, we'll look up original values directly in getCostForCell
      setEditedCosts({});
      setIsInitialized(true);
      
      // Debug log
      console.log('=== Component initialized ===');
      console.log('Initial pricingMatrix:', pricingMatrix);
    }
  }, [contractorId]); // Only re-initialize when contractorId changes
  
  // Handle cost change for a specific service and vehicle type
  const handleCostChange = (serviceId: number, vehicleTypeId: number, value: string) => {
    const key = `${serviceId}-${vehicleTypeId}`;
    
    // For number inputs, we want to allow empty values and valid numbers
    // Always update the state with the current value to allow user input
    setEditedCosts(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Debug log
    console.log(`Setting cost for ${key} to ${value}`);
  };
  
  // Get current cost for a specific service and vehicle type
  const getCost = (serviceId: number, vehicleTypeId: number) => {
    const key = `${serviceId}-${vehicleTypeId}`;
    const cost = editedCosts[key];
    
    // If we have a value that the user has edited, return it
    if (cost !== undefined) {
      return cost;
    }
    
    // Otherwise, find the original cost from pricingMatrix
    for (const row of pricingMatrix) {
      if (row.service_id === serviceId) {
        for (const pricing of row.pricing) {
          if (pricing.vehicle_type_id === vehicleTypeId) {
            return pricing.cost;
          }
        }
      }
    }
    
    // Default to 0 if not found
    return 0;
  };
  
  // Get cost for a specific service and vehicle type
  const getCostForCell = (serviceId: number, vehicleTypeId: number) => {
    const key = `${serviceId}-${vehicleTypeId}`;
    const cost = editedCosts[key];
    
    // If we have a value that the user has edited, return it
    if (cost !== undefined) {
      return cost;
    }
    
    // Otherwise, find the original cost from pricingMatrix
    for (const row of pricingMatrix) {
      if (row.service_id === serviceId) {
        for (const pricing of row.pricing) {
          if (pricing.vehicle_type_id === vehicleTypeId) {
            return pricing.cost;
          }
        }
      }
    }
    
    // Default to 0 if not found
    return 0;
  };
  
  // Handle saving all changes
  const handleSaveAll = async () => {
    setIsSaving(true);
    
    try {
      // Collect all changes
      const changes: { serviceId: number; vehicleTypeId: number; cost: number }[] = [];
      
      console.log('=== Starting save process ===');
      console.log('Current editedCosts:', editedCosts);
      console.log('Current pricingMatrix:', pricingMatrix);
      
      pricingMatrix.forEach(row => {
        row.pricing.forEach(pricing => {
          const key = `${pricing.service_id}-${pricing.vehicle_type_id}`;
          const currentCostValue = editedCosts[key];
          
          // If the user hasn't edited this field, use the original cost
          let currentCostNumber = 0;
          if (currentCostValue !== undefined) {
            // User has edited this field
            if (typeof currentCostValue === 'number') {
              currentCostNumber = currentCostValue;
            } else if (typeof currentCostValue === 'string') {
              currentCostNumber = parseFloat(currentCostValue) || 0;
            }
          } else {
            // User hasn't edited this field, use the original cost
            currentCostNumber = pricing.cost;
          }
          
          // Debug log
          console.log(`Comparing ${key}: currentCostNumber=${currentCostNumber}, pricing.cost=${pricing.cost}`);
          
          // Only include in changes if the user has edited this field and the cost has been modified
          if (currentCostValue !== undefined && currentCostNumber !== pricing.cost) {
            changes.push({
              serviceId: pricing.service_id,
              vehicleTypeId: pricing.vehicle_type_id,
              cost: currentCostNumber
            });
            // Debug log
            console.log(`Adding change for ${key}: ${currentCostNumber}`);
          }
        });
      });
      
      // Debug log
      console.log('Changes to save:', changes);
      
      if (changes.length === 0) {
        console.log('No changes to save');
        toast.success('No changes to save');
        setIsSaving(false);
        return;
      }
      
      // Apply all changes
      for (const change of changes) {
        console.log('Saving change:', change);
        await updatePricingMutation.mutateAsync({
          serviceId: change.serviceId,
          vehicleTypeId: change.vehicleTypeId,
          cost: change.cost
        });
      }
      
      // Refresh the data to reflect the changes
      await refetch();
      
      // Reset the initialization state so edited costs will be reinitialized with new data
      setIsInitialized(false);
      
      // Also reset edited costs to force reinitialization
      setEditedCosts({});
      
      toast.success('All pricing updated successfully');
      console.log('=== Save process completed ===');
    } catch (error: any) {
      console.error('Error saving pricing:', error);
      toast.error(error?.message || 'Failed to update pricing');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return <div>Loading pricing data...</div>;
  }
  
  if (vehicleTypes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No vehicle types available. Please create vehicle types first.
      </div>
    );
  }
  
  if (services.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No services available. Please create services first.
      </div>
    );
  }
  
  return (
    <div className="space-y-4 w-full">
      <div className="flex justify-end">
        <Button
          onClick={handleSaveAll}
          disabled={isSaving || updatePricingMutation.isPending}
          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg"
        >
          {isSaving || updatePricingMutation.isPending ? 'Saving...' : 'Save All'}
        </Button>
      </div>
      
      <div className="overflow-x-auto w-full">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sticky left-0 bg-gray-800">
                Service
              </th>
              {vehicleTypes.map((vehicleType) => (
                <th 
                  key={vehicleType.id} 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
                >
                  {vehicleType.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-700">
            {pricingMatrix.map((row, rowIndex) => (
              <tr key={row.service_id}>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-white sticky left-0 bg-gray-900">
                  {row.service_name}
                </td>
                {row.pricing.map((pricing, pricingIndex) => {
                  const cost = getCostForCell(row.service_id, pricing.vehicle_type_id);
                  console.log(`Rendering cell ${rowIndex}-${pricingIndex}: service=${row.service_id}, vehicle=${pricing.vehicle_type_id}, cost=${cost}`); // Debug log
                  console.log(`Key used: ${row.service_id}-${pricing.vehicle_type_id}, editedCosts entry:`, editedCosts[`${row.service_id}-${pricing.vehicle_type_id}`]); // Debug log
                  return (
                    <td key={`${row.service_id}-${pricing.vehicle_type_id}`} className="px-4 py-3 whitespace-nowrap text-sm text-white">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cost === 0 || cost === '0' ? '0' : (typeof cost === 'number' ? cost.toString() : cost)}
                        onChange={(e) => handleCostChange(row.service_id, pricing.vehicle_type_id, e.target.value)}
                        className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-20 text-center"
                        disabled={isSaving}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pricingMatrix.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No services available. Please create services first.
        </div>
      )}
    </div>
  );
}