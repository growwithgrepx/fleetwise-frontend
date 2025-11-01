"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import clsx from 'clsx';

import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  XMarkIcon as RejectIcon
} from '@heroicons/react/24/outline';
import { uploadDownloadApi } from '@/services/api/uploadDownloadApi';
import toast from 'react-hot-toast';
import { useUser } from '@/context/UserContext';

interface ExcelRow {
  row_number: number;
  customer: string;
  customer_reference_no?: string;
  department_person_in_charge?: string;
  service: string;
  vehicle: string;
  driver: string;
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_location: string;
  passenger_name: string;
  passenger_mobile?: string;
  status: string;
  remarks: string;
  is_valid: boolean;
  error_message: string;
  is_rejected?: boolean;
  customer_id?: number;
  service_type?: string;
  vehicle_id?: number;
  driver_id?: number;
  vehicle_type?: string;
  contractor?: string;
  contractor_id?: number;
  job_id?: string;
  _originalData?: Omit<ExcelRow, '_originalData'>; // Store original data for change detection during editing
}

// Reference data interfaces (adjust based on your API response)
interface Customer {
  id: number;
  name: string;
}

interface Service {
  id: number;
  name: string;
}

interface Vehicle {
  id: number;
  number: string;
  name?: string;  // Optional vehicle name/model
}

interface Driver {
  id: number;
  name: string;
}

interface Contractor {
  id: number;
  name: string;
}

interface VehicleType {
  id: number;
  name: string;
}

interface ReferenceData {
  customers: Customer[];
  services: Service[];
  vehicles: Vehicle[];
  drivers: Driver[];
  contractors: Contractor[];
  vehicle_types: VehicleType[];
}

interface ExcelUploadTableProps {
  data: ExcelRow[];
  validCount: number;
  errorCount: number;
  onConfirmUpload: () => void;
  onRevalidate: () => void;
  onDownloadTemplate: () => void;
  onUpdateRow?: (rowNumber: number, updatedRow: ExcelRow) => void;
  onSelectionChange?: (selectedRowNumbers: number[], selectedValidCount: number) => void;
  isLoading?: boolean;
}

export default function ExcelUploadTable({
  data,
  validCount,
  errorCount,
  onConfirmUpload,
  onRevalidate,
  onDownloadTemplate,
  onUpdateRow,
  onSelectionChange,
  isLoading = false
}: ExcelUploadTableProps) {
  // Get logged-in user information
  const { user } = useUser();
  const userRole = (user?.roles?.[0]?.name || "guest").toLowerCase();

  // State management
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ExcelRow;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filter state
  const [showInvalidOnly, setShowInvalidOnly] = useState(false);

  // Reference data state
  const [referenceData, setReferenceData] = useState<ReferenceData>({
    customers: [],
    services: [],
    vehicles: [],
    drivers: [],
    contractors: [],
    vehicle_types: []
  });
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(false);

  // Store editing data in a ref to avoid re-renders
  const editingDataRef = useRef<Record<number, ExcelRow>>({});

  // Reset editing state when data changes
  useEffect(() => {
    setEditingRow(null);
    editingDataRef.current = {};
    setExpandedRows(new Set());
    setCurrentPage(1); // Reset to first page when data changes
  }, [data]);

  // Fetch reference data on mount
  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    setIsLoadingReferenceData(true);
    try {
      const fetchWithLogging = async (url: string, name: string) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`Failed to fetch ${name}: ${response.status}`);
            toast.error(`Failed to load ${name} - please refresh`);
            return [];
          }
          return await response.json();
        } catch (error) {
          console.error(`Error fetching ${name}:`, error);
          toast.error(`Failed to load ${name} - please refresh`);
          return [];
        }
      };

      // For customer users, skip fetching vehicles and drivers (but still fetch vehicle types)
      const isCustomerUser = userRole === 'customer';

      const fetchPromises = [
        fetchWithLogging('/api/customers', 'customers'),
        fetchWithLogging('/api/services', 'services'),
        !isCustomerUser ? fetchWithLogging('/api/vehicles', 'vehicles') : Promise.resolve([]),
        !isCustomerUser ? fetchWithLogging('/api/drivers', 'drivers') : Promise.resolve([]),
        fetchWithLogging('/api/contractors', 'contractors'),
        fetchWithLogging('/api/vehicle-types', 'vehicle types') // Always fetch for all users
      ];

      const [customersRes, servicesRes, vehiclesRes, driversRes, contractorsRes, vehicleTypesRes] = await Promise.all(fetchPromises);

      // Validate critical reference data loaded successfully
      if (!customersRes || !servicesRes || !contractorsRes || !vehicleTypesRes) {
        toast.error('Failed to load reference data. Please refresh and try again.');
        setIsLoadingReferenceData(false);
        return;
      }

      if (!isCustomerUser && (!vehiclesRes || !driversRes)) {
        toast.error('Failed to load vehicle/driver data. Please refresh and try again.');
        setIsLoadingReferenceData(false);
        return;
      }

      console.log('✅ Reference data fetched:', {
        customers: customersRes,
        services: servicesRes,
        vehicles: isCustomerUser ? 'skipped for customer user' : vehiclesRes,
        drivers: isCustomerUser ? 'skipped for customer user' : driversRes,
        contractors: contractorsRes,
        vehicle_types: vehicleTypesRes
      });

      setReferenceData({
        customers: Array.isArray(customersRes) ? customersRes : [],
        services: Array.isArray(servicesRes) ? servicesRes : [],
        vehicles: Array.isArray(vehiclesRes) ? vehiclesRes : [],
        drivers: Array.isArray(driversRes) ? driversRes : [],
        contractors: Array.isArray(contractorsRes) ? contractorsRes : [],
        vehicle_types: Array.isArray(vehicleTypesRes) ? vehicleTypesRes : []
      });
    } catch (error) {
      console.error('Error fetching reference data:', error);
      toast.error('Failed to load dropdown data');
      // Set empty arrays as fallback
      setReferenceData({
        customers: [],
        services: [],
        vehicles: [],
        drivers: [],
        contractors: [],
        vehicle_types: []
      });
    } finally {
      setIsLoadingReferenceData(false);
    }
  };

  // ==========================================
  // MEMOIZED CALLBACKS
  // ==========================================

  const toggleRowExpansion = useCallback((rowNumber: number) => {
    setExpandedRows(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(rowNumber)) {
        newExpanded.delete(rowNumber);
      } else {
        newExpanded.add(rowNumber);
      }
      return newExpanded;
    });
  }, []);

  const toggleRowSelection = useCallback((rowNumber: number) => {
    setSelectedRows(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(rowNumber)) {
        newSelected.delete(rowNumber);
      } else {
        newSelected.add(rowNumber);
      }
      return newSelected;
    });
  }, []);

  const selectAllValid = useCallback(() => {
    const validRowNumbers = data
      .filter(row => row.is_valid && !row.is_rejected)
      .map(row => row.row_number);
    setSelectedRows(new Set(validRowNumbers));
  }, [data]);

  const selectAllRows = useCallback(() => {
    const allRowNumbers = data
      .filter(row => !row.is_rejected)
      .map(row => row.row_number);
    setSelectedRows(new Set(allRowNumbers));
  }, [data]);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const rejectRow = useCallback((rowNumber: number) => {
    if (onUpdateRow) {
      const row = data.find(r => r.row_number === rowNumber);
      if (row) {
        const updatedRow = { ...row, is_rejected: !row.is_rejected };
        onUpdateRow(rowNumber, updatedRow);
      }
    }
  }, [data, onUpdateRow]);

  const downloadSelectedRows = useCallback(async () => {
    if (selectedRows.size === 0) return;

    const selectedData = data.filter(row => selectedRows.has(row.row_number));
    try {
      await uploadDownloadApi.downloadSelectedRows(selectedData);
    } catch (error) {
      console.error('Error downloading selected rows:', error);
    }
  }, [selectedRows, data]);


  const cancelEditing = useCallback(() => {
    if (editingRow) {
      delete editingDataRef.current[editingRow];
    }
    setEditingRow(null);
  }, [editingRow]);

  const saveEditing = useCallback(async () => {
    if (!editingRow || !editingDataRef.current[editingRow] || !onUpdateRow) return;

    setIsValidating(true);
    const currentEditData = editingDataRef.current[editingRow];
    const originalData = currentEditData._originalData;

    try {
      // Guard: Prevent validation when reference data is incomplete
      if (!referenceData.customers.length || !referenceData.services.length) {
        toast.error('Reference data not loaded. Please wait and try again.');
        setIsValidating(false);
        return;
      }

      if (userRole !== 'customer' && (!referenceData.vehicles.length || !referenceData.drivers.length)) {
        toast.error('Vehicle/Driver data not loaded. Please wait and try again.');
        setIsValidating(false);
        return;
      }

      // Helper function to check if a value is empty (null, undefined, empty string, or whitespace)
      const isEmpty = (value: any): boolean => {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        return false;
      };

      // Check if any changes were made to the row
      const hasChanges = !originalData ||
        currentEditData.customer_id !== originalData.customer_id ||
        currentEditData.customer !== originalData.customer ||
        currentEditData.service !== originalData.service ||
        currentEditData.vehicle_id !== originalData.vehicle_id ||
        currentEditData.vehicle !== originalData.vehicle ||
        currentEditData.driver_id !== originalData.driver_id ||
        currentEditData.driver !== originalData.driver ||
        currentEditData.pickup_date !== originalData.pickup_date ||
        currentEditData.pickup_time !== originalData.pickup_time ||
        currentEditData.pickup_location !== originalData.pickup_location ||
        currentEditData.dropoff_location !== originalData.dropoff_location ||
        currentEditData.passenger_name !== originalData.passenger_name ||
        currentEditData.remarks !== originalData.remarks;

      // If no changes were made to an invalid row, reject the save
      if (!hasChanges && originalData && !originalData.is_valid) {
        toast.error('Please make changes to fix the validation errors before saving.');
        setIsValidating(false);
        return;
      }

      // Validate required fields
      const errors: string[] = [];

      // Normalize optional fields to null (create a copy to avoid mutation)
      const dataToValidate = {
        ...currentEditData,
        vehicle_id: currentEditData.vehicle_id ?? null,
        driver_id: currentEditData.driver_id ?? null,
        vehicle: currentEditData.vehicle ?? null,
        driver: currentEditData.driver ?? null,
      };

      // Validate required fields with stricter empty checks
      if (isEmpty(dataToValidate.customer_id) || isEmpty(dataToValidate.customer)) {
        errors.push('Customer is required');
      } else {
        // Validate that customer_id exists in reference data
        const customerExists = referenceData.customers.some(c => c.id === dataToValidate.customer_id);
        if (!customerExists) {
          errors.push('Invalid customer selected');
        }
      }

      if (isEmpty(dataToValidate.service)) {
        errors.push('Service is required');
      } else {
        // Validate that service exists in reference data
        const serviceExists = referenceData.services.some(s => s.name === dataToValidate.service);
        if (!serviceExists) {
          errors.push('Invalid service - please select a valid service from the dropdown');
        }
      }

      // Validate contractor if provided (optional field)
      if (!isEmpty(dataToValidate.contractor)) {
        const contractorExists = referenceData.contractors.some(c => c.name === dataToValidate.contractor);
        if (!contractorExists) {
          errors.push('Invalid contractor - please select a valid contractor from the dropdown');
        } else if (userRole === 'customer') {
          // Enforce AG-only rule for customer users in validation
          const contractor = referenceData.contractors.find(c => c.name === dataToValidate.contractor);
          const isAG = contractor && ['ag', 'ag (internal)'].includes(contractor.name.toLowerCase());
          if (!isAG) {
            errors.push('Customer users can only select AG (Internal) contractor');
          }
        }
      }

      // Validate vehicle type if provided (optional field)
      if (!isEmpty(dataToValidate.vehicle_type)) {
        const vehicleTypeExists = referenceData.vehicle_types.some(vt => vt.name === dataToValidate.vehicle_type);
        if (!vehicleTypeExists) {
          errors.push('Invalid vehicle type - please select a valid vehicle type from the dropdown');
        }
      }

      // Vehicle and Driver validation based on user role
      // For admin users, vehicle and driver are required
      // For customer users, vehicle and driver are optional
      if (userRole !== 'customer') {
        if (isEmpty(dataToValidate.vehicle_id) || isEmpty(dataToValidate.vehicle)) {
          errors.push('Vehicle is required');
        } else {
          // Validate that vehicle_id exists in reference data
          const vehicleExists = referenceData.vehicles.some(v => v.id === dataToValidate.vehicle_id);
          if (!vehicleExists) {
            errors.push('Invalid vehicle selected');
          }
        }

        if (isEmpty(dataToValidate.driver_id) || isEmpty(dataToValidate.driver)) {
          errors.push('Driver is required');
        } else {
          // Validate that driver_id exists in reference data
          const driverExists = referenceData.drivers.some(d => d.id === dataToValidate.driver_id);
          if (!driverExists) {
            errors.push('Invalid driver selected');
          }
        }
      }

      if (isEmpty(dataToValidate.pickup_date)) {
        errors.push('Pickup date is required');
      }
      if (isEmpty(dataToValidate.pickup_time)) {
        errors.push('Pickup time is required');
      }
      if (isEmpty(dataToValidate.pickup_location)) {
        errors.push('Pickup location is required');
      }
      if (isEmpty(dataToValidate.dropoff_location)) {
        errors.push('Dropoff location is required');
      }

      // If there are validation errors, show them and don't save
      if (errors.length > 0) {
        const { _originalData, ...cleanData } = currentEditData;
        const updatedRow = {
          ...cleanData,
          ...dataToValidate,
          is_valid: false,
          error_message: errors.join(', ')
        };
        onUpdateRow(editingRow, updatedRow);
        delete editingDataRef.current[editingRow];
        setEditingRow(null);
        toast.error(`Validation failed: ${errors.join(', ')}`);
        return;
      }

      // All validations passed - mark as valid
      const { _originalData, ...cleanData } = currentEditData;
      const updatedRow = {
        ...cleanData,
        ...dataToValidate,
        is_valid: true,
        error_message: ''
      };

      onUpdateRow(editingRow, updatedRow);
      delete editingDataRef.current[editingRow];
      setEditingRow(null);
      toast.success('Row updated successfully!');

    } catch (error) {
      console.error('Error saving row:', error);
      toast.error('Failed to update row. Please try again.');
    } finally {
      setIsValidating(false);
    }
  }, [editingRow, onUpdateRow, referenceData, userRole]);

  const handleSort = useCallback((key: keyof ExcelRow) => {
    setSortConfig(prevConfig => {
      if (prevConfig?.key === key) {
        return {
          key,
          direction: prevConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  // ==========================================
  // MEMOIZED VALUES
  // ==========================================

  const selectedValidRows = useMemo(() => {
    return data.filter(row => selectedRows.has(row.row_number) && row.is_valid && !row.is_rejected);
  }, [data, selectedRows]);

  const selectedValidCount = selectedValidRows.length;

  const hasSelection = selectedRows.size > 0;
  const uploadableCount = hasSelection ? selectedValidCount : validCount;

  // Sync selections when data changes - remove invalid rows from selection
  useEffect(() => {
    if (selectedRows.size > 0) {
      // Get set of valid row numbers
      const validRowNumbers = new Set(
        data.filter(r => r.is_valid && !r.is_rejected).map(r => r.row_number)
      );

      // Check if any selected rows are now invalid
      const updatedSelection = new Set(
        Array.from(selectedRows).filter(num => validRowNumbers.has(num))
      );

      // Only update if the selection has changed
      if (updatedSelection.size !== selectedRows.size) {
        setSelectedRows(updatedSelection);
      }
    }
  }, [data, selectedRows]);

  // Filter data based on showInvalidOnly flag
  const filteredData = useMemo(() => {
    if (showInvalidOnly) {
      return data.filter(row => !row.is_valid && !row.is_rejected);
    }
    return data;
  }, [data, showInvalidOnly]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  useEffect(() => {
    if (onSelectionChange) {
      const selectedRowNumbers = Array.from(selectedRows);
      onSelectionChange(selectedRowNumbers, selectedValidCount);
    }
  }, [selectedRows, selectedValidCount, onSelectionChange]);

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Start editing with auto-navigation to correct page
  const startEditing = useCallback((row: ExcelRow) => {
    // Find the row's position in sorted data to determine correct page
    const rowIndex = sortedData.findIndex(r => r.row_number === row.row_number);
    if (rowIndex === -1) return; // Row not found, bail out

    const targetPage = Math.floor(rowIndex / rowsPerPage) + 1;

    // If row is on a different page, navigate to it first
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
    }

    // Store the original data for this row along with its original validation state
    editingDataRef.current[row.row_number] = {
      ...row,
      _originalData: { ...row } // Store a copy for comparison
    };

    // Set editing row
    setEditingRow(row.row_number);
  }, [sortedData, rowsPerPage, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Collapse all rows when changing pages
    setExpandedRows(new Set());
    setEditingRow(null);
  };

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows);
    setCurrentPage(1); // Reset to first page
  };

  const toggleInvalidFilter = useCallback(() => {
    setShowInvalidOnly(prev => !prev);
    setCurrentPage(1); // Reset to first page when toggling filter
  }, []);

  // Clear edit state if current row not in paginated view (prevents cross-page state leakage)
  useEffect(() => {
    if (editingRow !== null) {
      const isRowVisible = paginatedData.some(r => r.row_number === editingRow);
      if (!isRowVisible) {
        setEditingRow(null);
        delete editingDataRef.current[editingRow];
      }
    }
  }, [paginatedData, editingRow]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-background-light rounded-xl shadow-xl border border-border-color overflow-hidden">
      {/* Header Section - keeping original structure */}
      <div className="px-6 py-4 bg-gradient-to-r from-background-light to-background-hover border-b border-border-color">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-text-main">Upload Preview</h2>
            <p className="text-sm text-text-secondary mt-1">
              Review and validate your data before uploading
            </p>
          </div>
          {/* <button
            onClick={onDownloadTemplate}
            className="flex items-center space-x-2 px-4 py-2 bg-background-hover hover:bg-background-dark border border-border-color rounded-lg transition-colors"
          >
            <DocumentArrowDownIcon className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-text-main">Download Template</span>
          </button> */}
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-background-hover rounded-lg p-4 border border-border-color">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Rows</p>
                <p className="text-2xl font-bold text-text-main mt-1">{data.length}</p>
              </div>
              <DocumentArrowUpIcon className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Valid Rows</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{validCount}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Errors</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{errorCount}</p>
              </div>
              <XCircleIcon className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </div>

          <div className="bg-primary/10 rounded-lg p-4 border border-primary/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary">Selected</p>
                <p className="text-2xl font-bold text-primary mt-1">{selectedRows.size}</p>
              </div>
              <CheckIcon className="w-8 h-8 text-primary opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      <div className="px-6 py-3 bg-background-hover border-b border-border-color flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleInvalidFilter}
            className={clsx(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center space-x-1",
              showInvalidOnly
                ? "text-white bg-red-600 hover:bg-red-700 border border-red-600"
                : "text-red-600 hover:text-red-700 border border-red-600/30 hover:bg-red-50"
            )}
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>{showInvalidOnly ? `Showing ${errorCount} Invalid` : 'Show Invalid Only'}</span>
          </button>
          <button
            onClick={selectAllValid}
            className="px-3 py-1.5 text-xs font-medium text-primary hover:text-primary-dark border border-primary/30 rounded-md hover:bg-primary/10 transition-colors"
          >
            Select All Valid
          </button>
          <button
            onClick={selectAllRows}
            className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-main border border-border-color rounded-md hover:bg-background-light transition-colors"
          >
            Select All
          </button>
          {selectedRows.size > 0 && (
            <>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 border border-red-600/30 rounded-md hover:bg-red-50 transition-colors"
              >
                Clear Selection
              </button>
              <button
                onClick={downloadSelectedRows}
                className="px-3 py-1.5 text-xs font-medium text-text-main hover:text-primary border border-border-color rounded-md hover:bg-background-light transition-colors flex items-center space-x-1"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                <span>Download Selected</span>
              </button>
            </>
          )}
        </div>

        {selectedRows.size > 0 ? (
          <div className="text-sm text-text-secondary">
            <span className="font-medium text-primary">{selectedValidCount}</span> of{' '}
            <span className="font-medium">{selectedRows.size}</span> selected rows are valid
          </div>
        ) : showInvalidOnly && errorCount > 0 ? (
          <div className="text-sm text-red-600 font-medium">
            Showing {sortedData.length} invalid row(s)
          </div>
        ) : null}
      </div>

      {/* Paginated Table */}
      <div className="overflow-auto" style={{ maxHeight: '600px' }}>
        {paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-text-main mb-2">
              {showInvalidOnly ? 'No Invalid Rows!' : 'No Data'}
            </h3>
            <p className="text-sm text-text-secondary text-center">
              {showInvalidOnly
                ? 'All rows are valid and ready for upload. Click "Show Invalid Only" to view all rows.'
                : 'No rows to display.'
              }
            </p>
            {showInvalidOnly && (
              <button
                onClick={toggleInvalidFilter}
                className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:text-primary-dark border border-primary/30 rounded-md hover:bg-primary/10 transition-colors"
              >
                Show All Rows
              </button>
            )}
          </div>
        ) : (
          paginatedData.map((row) => (
            <RowItem
              key={row.row_number}
              row={row}
              isExpanded={expandedRows.has(row.row_number)}
              isEditing={editingRow === row.row_number}
              isSelected={selectedRows.has(row.row_number)}
              onToggleExpansion={toggleRowExpansion}
              onToggleSelection={toggleRowSelection}
              onStartEditing={startEditing}
              onCancelEditing={cancelEditing}
              onSaveEditing={saveEditing}
              onRejectRow={rejectRow}
              editingDataRef={editingDataRef}
              isValidating={isValidating}
              referenceData={referenceData}
              isLoadingReferenceData={isLoadingReferenceData}
              user={user}
              userRole={userRole}
            />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {sortedData.length > 10 && (
        <div className="px-6 py-4 bg-background-hover border-t border-border-color flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-text-secondary">
              Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length} rows
            </span>
            <div className="flex items-center space-x-2">
              <label className="text-sm text-text-secondary">Rows per page:</label>
              <select
                value={rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-border-color rounded-md bg-background-light text-text-main"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-border-color rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-light transition-colors"
            >
              First
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-border-color rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-light transition-colors"
            >
              Previous
            </button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={clsx(
                      "px-3 py-1 text-sm border rounded-md transition-colors",
                      currentPage === pageNum
                        ? "bg-primary text-white border-primary"
                        : "border-border-color hover:bg-background-light"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-border-color rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-light transition-colors"
            >
              Next
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-border-color rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-light transition-colors"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      {/* <div className="px-6 py-1 bg-background-hover border-t border-border-color flex items-center justify-between">
        <div className="text-sm text-text-secondary">
          {hasSelection ? (
            <>
              Ready to upload <span className="font-bold text-primary">{uploadableCount}</span> selected valid row(s)
            </>
          ) : (
            <>
              Ready to upload <span className="font-bold text-primary">{uploadableCount}</span> valid row(s)
            </>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onRevalidate}
            disabled={errorCount === 0}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-main border border-border-color rounded-lg hover:bg-background-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Re-validate All
          </button>
          <button
            onClick={onConfirmUpload}
            disabled={uploadableCount === 0}
            className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {hasSelection ? `Upload ${uploadableCount} Selected Row(s)` : `Upload ${uploadableCount} Valid Row(s)`}
          </button>
        </div>
      </div> */}
    </div>
  );
}

// ==========================================
// ROW ITEM COMPONENT
// ==========================================

interface RowItemProps {
  row: ExcelRow;
  isExpanded: boolean;
  isEditing: boolean;
  isSelected: boolean;
  onToggleExpansion: (rowNumber: number) => void;
  onToggleSelection: (rowNumber: number) => void;
  onStartEditing: (row: ExcelRow) => void;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  onRejectRow: (rowNumber: number) => void;
  editingDataRef: React.MutableRefObject<Record<number, ExcelRow>>;
  isValidating: boolean;
  referenceData: ReferenceData;
  isLoadingReferenceData: boolean;
  user: any;
  userRole: string;
}

function RowItem({
  row,
  isExpanded,
  isEditing,
  isSelected,
  onToggleExpansion,
  onToggleSelection,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onRejectRow,
  editingDataRef,
  isValidating,
  referenceData,
  isLoadingReferenceData,
  user,
  userRole
}: RowItemProps) {

  const baseRowClass = clsx(
    "border-b border-border-color transition-all duration-200",
    {
      "bg-green-500/5": row.is_valid && !row.is_rejected,
      "bg-red-500/5": !row.is_valid && !row.is_rejected,
      "bg-gray-500/10 opacity-60": row.is_rejected,
      "ring-2 ring-primary": isSelected,
    }
  );

  return (
    <div className={baseRowClass}>
      {/* Main Row */}
      <div className="flex items-center px-6 py-2 hover:bg-background-hover cursor-pointer"
        onClick={() => !isEditing && onToggleExpansion(row.row_number)}>

        <div className="mr-4" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection(row.row_number)}
            disabled={row.is_rejected}
            className="form-checkbox h-4 w-4 text-primary rounded focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="mr-4">
          {isExpanded ? (
            <ChevronDownIcon className="w-5 h-5 text-text-secondary" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 text-text-secondary" />
          )}
        </div>

        <div className="mr-4">
          {row.is_rejected ? (
            <RejectIcon className="w-5 h-5 text-gray-500" />
          ) : row.is_valid ? (
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          ) : (
            <XCircleIcon className="w-5 h-5 text-red-500" />
          )}
        </div>

        <div className="w-16 text-sm font-medium text-text-secondary">
          #{row.row_number}
        </div>

        {row.job_id && (
          <div className="w-32 px-2">
            <p className="text-sm font-semibold text-primary">{row.job_id}</p>
          </div>
        )}

        <div className="flex-1 min-w-0 px-2">
          <p className="text-sm font-medium text-text-main truncate">{row.customer}</p>
        </div>

        <div className="flex-1 min-w-0 px-2">
          <p className="text-sm text-text-secondary truncate">{row.service}</p>
        </div>

        <div className="w-32 px-2">
          <p className="text-sm text-text-secondary">{row.pickup_date}</p>
        </div>

        <div className="flex items-center space-x-2 ml-4" onClick={(e) => e.stopPropagation()}>
          {!row.is_rejected && !isEditing && (
            <button
              onClick={() => onStartEditing(row)}
              className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
              title="Edit"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onRejectRow(row.row_number)}
            className={clsx(
              "p-1.5 rounded-lg transition-colors",
              row.is_rejected
                ? "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
            )}
            title={row.is_rejected ? "Un-reject" : "Reject"}
          >
            {row.is_rejected ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <RejectIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && !isEditing && (
        <div className="px-6 py-3 bg-background-hover/50 border-t border-border-color">
          <div className="grid grid-cols-2 gap-2 text-xs leading-normal">
            {row.job_id && (
              <div className="col-span-2 mb-2">
                <span className="font-medium text-text-secondary">Job ID:</span>
                <span className="ml-2 text-primary font-semibold">{row.job_id}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-text-secondary">Customer:</span>
              <span className="ml-2 text-text-main">{row.customer}</span>
            </div>
            {row.customer_reference_no && (
              <div>
                <span className="font-medium text-text-secondary">Customer Ref No:</span>
                <span className="ml-2 text-text-main">{row.customer_reference_no}</span>
              </div>
            )}
            {row.department_person_in_charge && (
              <div>
                <span className="font-medium text-text-secondary">Department/Person:</span>
                <span className="ml-2 text-text-main">{row.department_person_in_charge}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-text-secondary">Service:</span>
              <span className="ml-2 text-text-main">{row.service}</span>
            </div>
            {/* Hide Vehicle and Driver fields for customer users */}
            {userRole !== 'customer' && (
              <>
                <div>
                  <span className="font-medium text-text-secondary">Vehicle:</span>
                  <span className="ml-2 text-text-main">{row.vehicle}</span>
                </div>
                <div>
                  <span className="font-medium text-text-secondary">Driver:</span>
                  <span className="ml-2 text-text-main">{row.driver}</span>
                </div>
              </>
            )}
            {/* Vehicle Type - visible for all users */}
            {row.vehicle_type && (
              <div>
                <span className="font-medium text-text-secondary">Vehicle Type:</span>
                <span className="ml-2 text-text-main">{row.vehicle_type}</span>
              </div>
            )}
            {row.contractor && (
              <div>
                <span className="font-medium text-text-secondary">Contractor:</span>
                <span className="ml-2 text-text-main">{row.contractor}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-text-secondary">Pickup Date:</span>
              <span className="ml-2 text-text-main">{row.pickup_date}</span>
            </div>
            <div>
              <span className="font-medium text-text-secondary">Pickup Time:</span>
              <span className="ml-2 text-text-main">{row.pickup_time}</span>
            </div>
            <div>
              <span className="font-medium text-text-secondary">Passenger:</span>
              <span className="ml-2 text-text-main">{row.passenger_name}</span>
            </div>
            {row.passenger_mobile && (
              <div>
                <span className="font-medium text-text-secondary">Passenger Mobile:</span>
                <span className="ml-2 text-text-main">{row.passenger_mobile}</span>
              </div>
            )}
            <div className="col-span-2">
              <span className="font-medium text-text-secondary">Pickup Location:</span>
              <span className="ml-2 text-text-main">{row.pickup_location}</span>
            </div>
            <div className="col-span-2">
              <span className="font-medium text-text-secondary">Dropoff:</span>
              <span className="ml-2 text-text-main">{row.dropoff_location}</span>
            </div>
            {row.remarks && (
              <div className="col-span-2">
                <span className="font-medium text-text-secondary">Remarks:</span>
                <span className="ml-2 text-text-main">{row.remarks}</span>
              </div>
            )}
            {!row.is_valid && row.error_message && (
              <div className="col-span-2">
                <div className="flex items-start space-x-2 text-red-600">
                  <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{row.error_message}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <EditForm
          rowNumber={row.row_number}
          editingDataRef={editingDataRef}
          onCancelEditing={onCancelEditing}
          onSaveEditing={onSaveEditing}
          isValidating={isValidating}
          referenceData={referenceData}
          isLoadingReferenceData={isLoadingReferenceData}
          user={user}
          userRole={userRole}
        />
      )}
    </div>
  );
}

// ==========================================
// EDIT FORM COMPONENT - WITH DROPDOWNS
// ==========================================

interface EditFormProps {
  rowNumber: number;
  editingDataRef: React.MutableRefObject<Record<number, ExcelRow>>;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  isValidating: boolean;
  referenceData: ReferenceData;
  isLoadingReferenceData: boolean;
  user: any;
  userRole: string;
}

function EditForm({
  rowNumber,
  editingDataRef,
  onCancelEditing,
  onSaveEditing,
  isValidating,
  referenceData,
  isLoadingReferenceData,
  user,
  userRole
}: EditFormProps) {

  const row = editingDataRef.current[rowNumber];
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userRole === 'customer' && user?.customer_id) {
      const currentCustomer = row?.customer_id || row?.customer;
      if (currentCustomer !== user.customer_id) {
        handleCustomerChange({ target: { value: user.customer_id.toString() } } as React.ChangeEvent<HTMLSelectElement>);
      }
    }
  }, [userRole, user?.customer_id]);

  if (!row) return null;

  // Filter reference data based on user role
  const filteredCustomers = useMemo(() => {
    if (userRole === 'customer' && user?.customer_id) {
      // For customer role, show only the logged-in user's customer
      return referenceData.customers.filter(c => c.id === user.customer_id);
    }
    return referenceData.customers;
  }, [userRole, user, referenceData.customers]);

  const filteredContractors = useMemo(() => {
    // For customer users, only show AG (Internal)
    if (userRole === 'customer') {
      let agInternal = referenceData.contractors.find(c =>
        ['ag', 'ag (internal)'].includes(c.name.toLowerCase())
      );
      if (!agInternal) {
        agInternal = referenceData.contractors.find(c =>
          c.name.toLowerCase().includes('ag')
        );
      }
      return agInternal ? [agInternal] : [];
    }
    // For admin users, show all contractors
    return referenceData.contractors;
  }, [referenceData.contractors, userRole]);

  const validateField = useCallback((field: string, value: any) => {
    const errors: Record<string, string> = { ...validationErrors };

    switch(field) {
      case 'customer_id':
      case 'customer':
        if (!value) {
          errors.customer = 'Customer is required';
        } else {
          delete errors.customer;
        }
        break;
      case 'service':
        if (!value) {
          errors.service = 'Service is required';
        } else {
          delete errors.service;
        }
        break;
      case 'vehicle_id':
      case 'vehicle':
        if (userRole !== 'customer' && !value) {
          errors.vehicle = 'Vehicle is required';
        } else {
          delete errors.vehicle;
        }
        break;
      case 'driver_id':
      case 'driver':
        if (userRole !== 'customer' && !value) {
          errors.driver = 'Driver is required';
        } else {
          delete errors.driver;
        }
        break;
      case 'pickup_date':
        if (!value) {
          errors.pickup_date = 'Pickup date is required';
        } else {
          delete errors.pickup_date;
        }
        break;
      case 'pickup_time':
        if (!value) {
          errors.pickup_time = 'Pickup time is required';
        } else {
          delete errors.pickup_time;
        }
        break;
      case 'pickup_location':
        if (!value) {
          errors.pickup_location = 'Pickup location is required';
        } else {
          delete errors.pickup_location;
        }
        break;
      case 'dropoff_location':
        if (!value) {
          errors.dropoff_location = 'Dropoff location is required';
        } else {
          delete errors.dropoff_location;
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [validationErrors]);

  const handleChange = (field: keyof ExcelRow, value: any) => {
    editingDataRef.current[rowNumber] = {
      ...editingDataRef.current[rowNumber],
      [field]: value
    };
    validateField(field, value);
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = parseInt(e.target.value);
    const customer = referenceData.customers.find(c => c.id === customerId);
    if (customer) {
      editingDataRef.current[rowNumber] = {
        ...editingDataRef.current[rowNumber],
        customer: customer.name,
        customer_id: customer.id
      };
      validateField('customer_id', customer.id);
    } else {
      validateField('customer_id', '');
    }
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceName = e.target.value;
    const service = referenceData.services.find(s => s.name === serviceName);
    if (service) {
      editingDataRef.current[rowNumber] = {
        ...editingDataRef.current[rowNumber],
        service: service.name,
        service_type: service.name
      };
      validateField('service', service.name);
    } else {
      validateField('service', '');
    }
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vehicleId = parseInt(e.target.value);
    const vehicle = referenceData.vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      editingDataRef.current[rowNumber] = {
        ...editingDataRef.current[rowNumber],
        vehicle: vehicle.number,
        vehicle_id: vehicle.id,

      };
      validateField('vehicle_id', vehicle.id);
    } else {
      validateField('vehicle_id', '');
    }
  };

  const handleDriverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const driverId = parseInt(e.target.value);
    const driver = referenceData.drivers.find(d => d.id === driverId);
    if (driver) {
      editingDataRef.current[rowNumber] = {
        ...editingDataRef.current[rowNumber],
        driver: driver.name,
        driver_id: driver.id
      };
      validateField('driver_id', driver.id);
    } else {
      validateField('driver_id', '');
    }
  };

  const handleContractorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const contractorId = parseInt(e.target.value);
    const contractor = referenceData.contractors.find(c => c.id === contractorId);
    if (contractor) {
      editingDataRef.current[rowNumber] = {
        ...editingDataRef.current[rowNumber],
        contractor: contractor.name,
        contractor_id: contractor.id
      };
    }
  };

  const inputClassName = "w-full px-3 py-2 bg-transparent text-text-main border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary placeholder-text-secondary/50";
  const selectClassName = "w-full px-3 py-2 bg-background-light text-text-main border border-border-color rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary";

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
            ) : (
              <>
                <select
                  defaultValue={row.customer_id || ''}
                  onChange={handleCustomerChange}
                  className={clsx(selectClassName, validationErrors.customer && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
                  required
                  disabled={userRole === 'customer'}
                >
                  <option value="">Select Customer</option>
                  {filteredCustomers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
                {validationErrors.customer && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.customer}</p>
                )}
              </>
            )}
          </div>

          {/* Customer Reference No */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Customer Reference No
            </label>
            <input
              type="text"
              defaultValue={row.customer_reference_no || ''}
              onChange={(e) => handleChange('customer_reference_no', e.target.value)}
              className={inputClassName}
              placeholder="Enter reference number"
            />
          </div>

          {/* Department/Person In Charge */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Department/Person In Charge
            </label>
            <input
              type="text"
              defaultValue={row.department_person_in_charge || ''}
              onChange={(e) => handleChange('department_person_in_charge', e.target.value)}
              className={inputClassName}
              placeholder="Enter department or person in charge"
            />
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
            ) : (
              <>
                <select
                  defaultValue={row.service}
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
            )}
          </div>

          {/* Vehicle Dropdown - Hidden for customer users */}
          {userRole !== 'customer' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Vehicle <span className="text-red-500">*</span>
              </label>
              {isLoadingReferenceData ? (
                <div className="w-full px-3 py-2 border border-border-color rounded-md">
                  <span className="text-text-secondary">Loading...</span>
                </div>
              ) : (
                <>
                  <select
                    value={row.vehicle_id || ''}
                    onChange={(e) => {
                      handleVehicleChange(e);
                    }}
                    className={clsx(selectClassName, validationErrors.vehicle && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
                  >
                    <option value="">Select Vehicle</option>
                    {Array.isArray(referenceData?.vehicles) && referenceData.vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.number}
                      </option>
                    ))}
                  </select>
                  {validationErrors.vehicle && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.vehicle}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Driver Dropdown - Hidden for customer users */}
          {userRole !== 'customer' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Driver <span className="text-red-500">*</span>
              </label>
              {isLoadingReferenceData ? (
                <div className="w-full px-3 py-2 border border-border-color rounded-md">
                  <span className="text-text-secondary">Loading...</span>
                </div>
              ) : (
                <>
                  <select
                    value={row.driver_id || ''}
                    onChange={handleDriverChange}
                    className={clsx(selectClassName, validationErrors.driver && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
                  >
                    <option value="">Select Driver</option>
                    {Array.isArray(referenceData?.drivers) && referenceData.drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.driver && (
                    <p className="text-xs text-red-500 mt-1">{validationErrors.driver}</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Contractor Dropdown */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Contractor
            </label>
            {isLoadingReferenceData ? (
              <div className="w-full px-3 py-2 border border-border-color rounded-md">
                <span className="text-text-secondary">Loading...</span>
              </div>
            ) : (
              <>
                {(() => {
                  // If contractor_id exists, use it. Otherwise, try to find contractor by name
                  let contractorValue = row.contractor_id;
                  if (!contractorValue && row.contractor) {
                    const foundContractor = referenceData.contractors.find(
                      c => c.name.toLowerCase() === row.contractor.toLowerCase()
                    );
                    if (foundContractor) {
                      contractorValue = foundContractor.id;
                      // Update the ref with the found contractor_id
                      editingDataRef.current[rowNumber] = {
                        ...editingDataRef.current[rowNumber],
                        contractor_id: foundContractor.id
                      };
                    }
                  }
                  console.log("👔 Contractor Data:", {
                    contractor_id: row.contractor_id,
                    contractor: row.contractor,
                    resolvedValue: contractorValue,
                    contractors: referenceData.contractors
                  });
                  return null;
                })()}
                <select
                  key={`contractor-${row.contractor_id || row.contractor || 'none'}`}
                  defaultValue={row.contractor_id || (() => {
                    const foundContractor = filteredContractors.find(
                      c => c.name.toLowerCase() === (row.contractor || '').toLowerCase()
                    );
                    return foundContractor?.id || '';
                  })()}
                  onChange={handleContractorChange}
                  className={selectClassName}
                  disabled={userRole === 'customer' && filteredContractors.length === 1}
                >
                  <option value="">Select Contractor</option>
                  {filteredContractors.map(contractor => (
                    <option key={contractor.id} value={contractor.id}>
                      {contractor.name}
                    </option>
                  ))}
                </select>
              </>
            )}
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
            ) : (
              <>
                {console.log("🚗 Vehicle Type Data:", {
                  vehicle_type: row.vehicle_type,
                  vehicle_types: referenceData.vehicle_types
                })}
                <select
                  key={`vehicle-type-${row.vehicle_type || 'none'}`}
                  defaultValue={row.vehicle_type || ""}
                  onChange={(e) => {
                    console.log("✅ Vehicle Type selected:", e.target.value);
                    handleChange("vehicle_type", e.target.value);
                  }}
                  className={selectClassName}
                >
                  <option value="">Select Vehicle Type</option>
                  {referenceData.vehicle_types?.map((type, index) => {
                    return (
                      <option key={type.id} value={type.name}>
                        {type.name}
                      </option>
                    );
                  })}
                </select>
              </>
            )}
          </div>


          {/* Pickup Date */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Pickup Date *
            </label>
            <input
              type="date"
              defaultValue={row.pickup_date}
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
              defaultValue={row.pickup_time}
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
              defaultValue={row.pickup_location}
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
              defaultValue={row.dropoff_location}
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
              defaultValue={row.passenger_name}
              onChange={(e) => handleChange('passenger_name', e.target.value)}
              className={inputClassName}
            />
          </div>

          {/* Passenger Mobile */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Passenger Mobile
            </label>
            <input
              type="tel"
              defaultValue={row.passenger_mobile || ''}
              onChange={(e) => handleChange('passenger_mobile', e.target.value)}
              className={inputClassName}
              placeholder="Enter mobile number"
            />
          </div>

          {/* Remarks */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Remarks
            </label>
            <textarea
              defaultValue={row.remarks}
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
            disabled={isValidating}
            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-main border border-border-color rounded-md hover:bg-background-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onSaveEditing}
            disabled={isValidating || isLoadingReferenceData}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isValidating ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}