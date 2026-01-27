"use client";
import React, { useMemo } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useJobRowValidation } from '@/hooks/useJobRowValidation';
import type { ExcelRow, ReferenceData } from './JobCategoryRow';

interface JobRowEditFormProps {
  rowNumber: number;
  editingDataRef: React.MutableRefObject<Record<number, ExcelRow>>;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  referenceData?: ReferenceData;
  user?: any;
  userRole: string;
  isLoadingReferenceData?: boolean;
}

export function JobRowEditForm({
  rowNumber,
  editingDataRef,
  onCancelEditing,
  onSaveEditing,
  referenceData,
  user,
  userRole,
  isLoadingReferenceData = false
}: JobRowEditFormProps) {
  const row = editingDataRef.current[rowNumber];
  const { validationErrors, validateField } = useJobRowValidation();

  if (!row) return null;

  const inputClassName = "w-full px-3 py-2 bg-transparent text-text-main border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm";
  const selectClassName = "w-full px-3 py-2 bg-background-light text-text-main border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm";

  const handleChange = (field: string, value: any) => {
    editingDataRef.current[rowNumber] = {
      ...editingDataRef.current[rowNumber],
      [field]: value
    };
    validateField(field, value);
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerName = e.target.value;
    const customer = referenceData?.customers.find(c => c.name === customerName);
    if (customer) {
      editingDataRef.current[rowNumber] = {
        ...editingDataRef.current[rowNumber],
        customer: customer.name,
        customer_id: customer.id
      };
      validateField('customer', customer.name);
    }
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceName = e.target.value;
    editingDataRef.current[rowNumber] = {
      ...editingDataRef.current[rowNumber],
      service: serviceName
    };
    validateField('service', serviceName);
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vehicleName = e.target.value;
    editingDataRef.current[rowNumber] = {
      ...editingDataRef.current[rowNumber],
      vehicle: vehicleName
    };
    validateField('vehicle', vehicleName);
  };

  const handleDriverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const driverName = e.target.value;
    editingDataRef.current[rowNumber] = {
      ...editingDataRef.current[rowNumber],
      driver: driverName
    };
    validateField('driver', driverName);
  };

  const handleContractorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const contractorName = e.target.value;
    editingDataRef.current[rowNumber] = {
      ...editingDataRef.current[rowNumber],
      contractor: contractorName
    };
    validateField('contractor', contractorName);
  };

  // Filter reference data based on user role
  const filteredCustomers = useMemo(() => {
    if (!referenceData) return [];
    if (userRole === 'customer' && user?.customer_id) {
      return referenceData.customers.filter(c => c.id === user.customer_id);
    }
    return referenceData.customers;
  }, [referenceData, userRole, user]);

  return (
    <div className="px-6 py-4 bg-transparent border-t border-border-color">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Customer Dropdown */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Customer *
            </label>
            {isLoadingReferenceData ? (
              <div className="w-full px-3 py-2 border border-border-color rounded-md">
                <span className="text-text-secondary">Loading...</span>
              </div>
            ) : referenceData && filteredCustomers.length > 0 ? (
              <>
                <select
                  defaultValue={row.customer || ''}
                  onChange={handleCustomerChange}
                  className={clsx(selectClassName, validationErrors.customer && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
                  required
                  disabled={userRole === 'customer'}
                >
                  <option value="">Select Customer</option>
                  {filteredCustomers.map(customer => (
                    <option key={customer.id} value={customer.name}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {validationErrors.customer && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.customer}</p>
                )}
              </>
            ) : (
              <input
                type="text"
                defaultValue={row.customer || ''}
                onChange={(e) => handleChange('customer', e.target.value)}
                className={inputClassName}
                placeholder="Enter customer"
              />
            )}
          </div>

          {/* Service Dropdown */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Service *
            </label>
            {isLoadingReferenceData ? (
              <div className="w-full px-3 py-2 border border-border-color rounded-md">
                <span className="text-text-secondary">Loading...</span>
              </div>
            ) : referenceData && referenceData.services.length > 0 ? (
              <>
                <select
                  defaultValue={row.service || ''}
                  onChange={handleServiceChange}
                  className={clsx(selectClassName, validationErrors.service && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
                  required
                >
                  <option value="">Select Service</option>
                  {referenceData.services.map(service => (
                    <option key={service.id} value={service.name}>
                      {service.name}
                    </option>
                  ))}
                </select>
                {validationErrors.service && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.service}</p>
                )}
              </>
            ) : (
              <input
                type="text"
                defaultValue={row.service || ''}
                onChange={(e) => handleChange('service', e.target.value)}
                className={inputClassName}
                placeholder="Enter service"
              />
            )}
          </div>

          {/* Pickup Date */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Pickup Date *
            </label>
            <input
              type="date"
              defaultValue={row.pickup_date || ''}
              onChange={(e) => handleChange('pickup_date', e.target.value)}
              className={clsx(inputClassName, validationErrors.pickup_date && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
              required
            />
            {validationErrors.pickup_date && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.pickup_date}</p>
            )}
          </div>

          {/* Pickup Time */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Pickup Time *
            </label>
            <input
              type="time"
              defaultValue={row.pickup_time || ''}
              onChange={(e) => handleChange('pickup_time', e.target.value)}
              className={clsx(inputClassName, validationErrors.pickup_time && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
              required
            />
            {validationErrors.pickup_time && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.pickup_time}</p>
            )}
          </div>

          {/* Pickup Location */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Pickup Location *
            </label>
            <input
              type="text"
              defaultValue={row.pickup_location || ''}
              onChange={(e) => handleChange('pickup_location', e.target.value)}
              className={clsx(inputClassName, validationErrors.pickup_location && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
              required
            />
            {validationErrors.pickup_location && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.pickup_location}</p>
            )}
          </div>

          {/* Dropoff Location */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Dropoff Location *
            </label>
            <input
              type="text"
              defaultValue={row.dropoff_location || ''}
              onChange={(e) => handleChange('dropoff_location', e.target.value)}
              className={clsx(inputClassName, validationErrors.dropoff_location && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
              required
            />
            {validationErrors.dropoff_location && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.dropoff_location}</p>
            )}
          </div>

          {/* Passenger Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Passenger Name
            </label>
            <input
              type="text"
              defaultValue={row.passenger_name || ''}
              onChange={(e) => handleChange('passenger_name', e.target.value)}
              className={inputClassName}
            />
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Vehicle Type
            </label>
            {isLoadingReferenceData ? (
              <div className="w-full px-3 py-2 border border-border-color rounded-md">
                <span className="text-text-secondary">Loading...</span>
              </div>
            ) : referenceData && referenceData.vehicle_types && referenceData.vehicle_types.length > 0 ? (
              <select
                key={`vehicle-type-${row.vehicle_type || 'none'}`}
                defaultValue={row.vehicle_type || ""}
                onChange={(e) => handleChange("vehicle_type", e.target.value)}
                className={selectClassName}
              >
                <option value="">Select Vehicle Type</option>
                {referenceData.vehicle_types.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                defaultValue={row.vehicle_type || ''}
                onChange={(e) => handleChange('vehicle_type', e.target.value)}
                className={inputClassName}
                placeholder="Enter vehicle type"
              />
            )}
          </div>

          {/* Vehicle - Hidden for customer users */}
          {userRole !== 'customer' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Vehicle
              </label>
              {isLoadingReferenceData ? (
                <div className="w-full px-3 py-2 border border-border-color rounded-md">
                  <span className="text-text-secondary">Loading...</span>
                </div>
              ) : referenceData && referenceData.vehicles && referenceData.vehicles.length > 0 ? (
                <select
                  defaultValue={row.vehicle || ''}
                  onChange={handleVehicleChange}
                  className={selectClassName}
                >
                  <option value="">Select Vehicle</option>
                  {referenceData.vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.name}>
                      {vehicle.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  defaultValue={row.vehicle || ''}
                  onChange={(e) => handleChange('vehicle', e.target.value)}
                  className={inputClassName}
                  placeholder="Enter vehicle"
                />
              )}
              {validationErrors.vehicle && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.vehicle}</p>
              )}
            </div>
          )}

          {/* Driver - Hidden for customer users */}
          {userRole !== 'customer' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Driver
              </label>
              {isLoadingReferenceData ? (
                <div className="w-full px-3 py-2 border border-border-color rounded-md">
                  <span className="text-text-secondary">Loading...</span>
                </div>
              ) : referenceData && referenceData.drivers && referenceData.drivers.length > 0 ? (
                <select
                  defaultValue={row.driver || ''}
                  onChange={handleDriverChange}
                  className={clsx(selectClassName, validationErrors.driver && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
                >
                  <option value="">Select Driver</option>
                  {referenceData.drivers.map(driver => (
                    <option key={driver.id} value={driver.name}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  defaultValue={row.driver || ''}
                  onChange={(e) => handleChange('driver', e.target.value)}
                  className={inputClassName}
                  placeholder="Enter driver"
                />
              )}
              {validationErrors.driver && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.driver}</p>
              )}
            </div>
          )}

          {/* Contractor */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Contractor
            </label>
            {isLoadingReferenceData ? (
              <div className="w-full px-3 py-2 border border-border-color rounded-md">
                <span className="text-text-secondary">Loading...</span>
              </div>
            ) : referenceData && referenceData.contractors && referenceData.contractors.length > 0 ? (
              <select
                defaultValue={row.contractor || ''}
                onChange={handleContractorChange}
                className={selectClassName}
              >
                <option value="">Select Contractor</option>
                {referenceData.contractors.map(contractor => (
                  <option key={contractor.id} value={contractor.name}>
                    {contractor.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                defaultValue={row.contractor || ''}
                onChange={(e) => handleChange('contractor', e.target.value)}
                className={inputClassName}
                placeholder="Enter contractor"
              />
            )}
          </div>

          {/* Remarks */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Remarks
            </label>
            <textarea
              defaultValue={row.remarks || ''}
              onChange={(e) => handleChange('remarks', e.target.value)}
              rows={3}
              className={inputClassName}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-border-color">
          <button
            onClick={onCancelEditing}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-main border border-border-color rounded-md hover:bg-background-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSaveEditing}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary flex items-center space-x-2"
          >
            <CheckIcon className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
