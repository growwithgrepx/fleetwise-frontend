'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Service } from '@/lib/types';
import { VehicleType } from '@/lib/types';

interface PricingMatrixRow {
  service_id: number;
  service_name: string;
  pricing: {
    vehicle_type_id: number;
    service_id: number;
    cost: number;
  }[];
}

interface ContractorPricingMatrixTableForCreationProps {
  services: Service[];
  vehicleTypes: VehicleType[];
  onPricingChange: (pricingData: { service_id: number; vehicle_type_id: number; cost: number }[]) => void;
}

export function ContractorPricingMatrixTableForCreation({ 
  services, 
  vehicleTypes, 
  onPricingChange 
}: ContractorPricingMatrixTableForCreationProps) {
  // State to track edited costs
  const [editedCosts, setEditedCosts] = useState<Record<string, number>>({});
  
  // Initialize edited costs with default values (0)
  useEffect(() => {
    const initialCosts: Record<string, number> = {};
    services.forEach(service => {
      vehicleTypes.forEach(vehicleType => {
        const key = `${service.id}-${vehicleType.id}`;
        initialCosts[key] = 0;
      });
    });
    setEditedCosts(initialCosts);
  }, [services, vehicleTypes]);
  
  // Notify parent component of pricing changes
  useEffect(() => {
    const pricingData = [];
    for (const [key, cost] of Object.entries(editedCosts)) {
      const [serviceId, vehicleTypeId] = key.split('-').map(Number);
      pricingData.push({
        service_id: serviceId,
        vehicle_type_id: vehicleTypeId,
        cost
      });
    }
    onPricingChange(pricingData);
  }, [editedCosts, onPricingChange]);
  
  // Handle cost change for a specific service and vehicle type
  const handleCostChange = (serviceId: number, vehicleTypeId: number, value: string) => {
    // Allow empty value or valid non-negative number input
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numValue = parseFloat(value);
      if ((!isNaN(numValue) && numValue >= 0) || value === '') {
        const key = `${serviceId}-${vehicleTypeId}`;
        setEditedCosts(prev => ({
          ...prev,
          [key]: value === '' ? 0 : numValue
        }));
      }
    }
  };
  
  // Get cost for a specific service and vehicle type
  const getCostForCell = (serviceId: number, vehicleTypeId: number) => {
    const key = `${serviceId}-${vehicleTypeId}`;
    return editedCosts[key] ?? 0;
  };
  
  // Transform services and vehicle types into matrix structure
  const pricingMatrix: PricingMatrixRow[] = services.map(service => ({
    service_id: service.id,
    service_name: service.name,
    pricing: vehicleTypes.map(vehicleType => ({
      vehicle_type_id: vehicleType.id,
      service_id: service.id,
      cost: getCostForCell(service.id, vehicleType.id)
    }))
  }));
  
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
            {pricingMatrix.map((row) => (
              <tr key={row.service_id}>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-white sticky left-0 bg-gray-900">
                  {row.service_name}
                </td>
                {row.pricing.map((pricing) => {
                  const currentCost = getCostForCell(pricing.service_id, pricing.vehicle_type_id);
                  return (
                    <td key={`${pricing.service_id}-${pricing.vehicle_type_id}`} className="px-4 py-3 whitespace-nowrap text-sm text-white">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={currentCost !== undefined ? (currentCost === 0 ? '0.00' : currentCost.toFixed(2)) : '0.00'}
                        onChange={(e) => handleCostChange(pricing.service_id, pricing.vehicle_type_id, e.target.value)}
                        className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                        placeholder="0.00"
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