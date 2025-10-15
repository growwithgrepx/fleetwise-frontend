"use client";
import React, { useState, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import { FixedSizeList as List } from 'react-window';
import { VariableSizeList as VList } from 'react-window';

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

interface ExcelRow {
  row_number: number;
  customer: string;
  service: string;
  vehicle: string;
  driver: string;
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_location: string;
  passenger_name: string;
  status: string;
  remarks: string;
  is_valid: boolean;
  error_message: string;
  is_rejected?: boolean;
}

interface ExcelUploadTableProps {
  data: ExcelRow[];
  validCount: number;
  errorCount: number;
  onConfirmUpload: () => void;
  onRevalidate: () => void;
  onDownloadTemplate: () => void;
  onUpdateRow?: (rowNumber: number, updatedRow: ExcelRow) => void;
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
  isLoading = false
}: ExcelUploadTableProps) {
  // Force reset editing state on component mount
  React.useEffect(() => {
    setEditingRow(null);
    setEditingData(null);
    setExpandedRows(new Set());
  }, []);

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<ExcelRow | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset editing state when data changes
  React.useEffect(() => {
    setEditingRow(null);
    setEditingData(null);
    setExpandedRows(new Set());
    setValidationErrors({});
  }, [data]);

  const [sortConfig, setSortConfig] = useState<{
    key: keyof ExcelRow;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Toggle row expansion
  const toggleRowExpansion = (rowNumber: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowNumber)) {
      newExpanded.delete(rowNumber);
    } else {
      newExpanded.add(rowNumber);
    }
    setExpandedRows(newExpanded);
  };

  // Toggle row selection
  const toggleRowSelection = (rowNumber: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowNumber)) {
      newSelected.delete(rowNumber);
    } else {
      newSelected.add(rowNumber);
    }
    setSelectedRows(newSelected);
  };

  // Select all valid rows
  const selectAllValid = () => {
    const validRowNumbers = data
      .filter(row => row.is_valid && !row.is_rejected)
      .map(row => row.row_number);
    setSelectedRows(new Set(validRowNumbers));
  };

  const selectAllRows = () => {
    const allRowNumbers = data
      .filter(row => !row.is_rejected)
      .map(row => row.row_number);
    setSelectedRows(new Set(allRowNumbers));
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
  };

  const rejectRow = (rowNumber: number) => {
    if (onUpdateRow) {
    const row = data.find(r => r.row_number === rowNumber);
      if (row) {
        const updatedRow = { ...row, is_rejected: !row.is_rejected };
      onUpdateRow(rowNumber, updatedRow);
      }
    }
  };

  const downloadSelectedRows = async () => {
    if (selectedRows.size === 0) return;
    
    const selectedData = data.filter(row => selectedRows.has(row.row_number));
    try {
      await uploadDownloadApi.downloadSelectedRows(selectedData);
    } catch (error) {
      console.error('Error downloading selected rows:', error);
    }
  };

  const startEditing = (row: ExcelRow) => {
    setEditingRow(row.row_number);
    setEditingData({ ...row });
    setValidationErrors({});
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditingData(null);
  };

  const saveEditing = async () => {
    if (!editingData || !onUpdateRow) return;

      setIsValidating(true);
      try {
      const response = await uploadDownloadApi.validateRow(editingData);
        
        const updatedRow = {
          ...editingData,
        is_valid: response.is_valid,
        error_message: response.error_message || ''
        };
        
        onUpdateRow(editingData.row_number, updatedRow);
        setEditingRow(null);
        setEditingData(null);
    
      if (response.is_valid) {
        toast.success('Row validated successfully!');
      } else {
        toast.error(`Validation failed: ${response.error_message}`);
      }
      
      } catch (error) {
      console.error('Error saving row:', error);
      toast.error('Failed to validate row. Please try again.');
      const errorRow = {
          ...editingData,
          is_valid: false,
        error_message: 'Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        };
      onUpdateRow(editingData.row_number, errorRow);
        setEditingRow(null);
        setEditingData(null);
      } finally {
        setIsValidating(false);
      }
  };

  // Client-side validation functions
  const validateInput = (field: keyof ExcelRow, value: string): { isValid: boolean; error: string; validatedValue: string } => {
    const trimmedValue = value.trim();
    
    const requiredFields = ['customer', 'service', 'vehicle', 'driver', 'pickup_date', 'pickup_time', 'pickup_location', 'dropoff_location'];
    if (requiredFields.includes(field) && !trimmedValue) {
      return { isValid: false, error: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`, validatedValue: value };
    }
    
    switch (field) {
      case 'pickup_date':
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(trimmedValue)) {
          return { isValid: false, error: 'Date must be in YYYY-MM-DD format', validatedValue: value };
        }
        const date = new Date(trimmedValue);
        if (isNaN(date.getTime())) {
          return { isValid: false, error: 'Invalid date format', validatedValue: value };
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          return { isValid: false, error: 'Date cannot be in the past', validatedValue: value };
        }
        return { isValid: true, error: '', validatedValue: trimmedValue };
        
      case 'pickup_time':
        const timeRegex = /^\d{2}:\d{2}$/;
        if (!timeRegex.test(trimmedValue)) {
          return { isValid: false, error: 'Time must be in HH:MM format', validatedValue: value };
        }
        const [hours, minutes] = trimmedValue.split(':').map(Number);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          return { isValid: false, error: 'Invalid time format', validatedValue: value };
        }
        return { isValid: true, error: '', validatedValue: trimmedValue };
        
      case 'customer':
      case 'service':
      case 'vehicle':
      case 'driver':
        if (trimmedValue.length < 2) {
          return { isValid: false, error: `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least 2 characters`, validatedValue: value };
        }
        if (trimmedValue.length > 100) {
          return { isValid: false, error: `${field.charAt(0).toUpperCase() + field.slice(1)} must be less than 100 characters`, validatedValue: value };
        }
        return { isValid: true, error: '', validatedValue: trimmedValue };
        
      case 'pickup_location':
      case 'dropoff_location':
        if (trimmedValue.length < 5) {
          return { isValid: false, error: `${field.charAt(0).toUpperCase() + field.slice(1)} must be at least 5 characters`, validatedValue: value };
        }
        if (trimmedValue.length > 200) {
          return { isValid: false, error: `${field.charAt(0).toUpperCase() + field.slice(1)} must be less than 200 characters`, validatedValue: value };
        }
        return { isValid: true, error: '', validatedValue: trimmedValue };
        
      case 'passenger_name':
        if (trimmedValue && trimmedValue.length < 2) {
          return { isValid: false, error: 'Passenger name must be at least 2 characters', validatedValue: value };
        }
        if (trimmedValue && trimmedValue.length > 100) {
          return { isValid: false, error: 'Passenger name must be less than 100 characters', validatedValue: value };
        }
        return { isValid: true, error: '', validatedValue: trimmedValue };
        
      case 'status':
        const validStatuses = ['new', 'pending', 'confirmed', 'otw', 'ots', 'pob', 'jc', 'sd', 'canceled'];
        if (trimmedValue && !validStatuses.includes(trimmedValue.toLowerCase())) {
          return { isValid: false, error: `Status must be one of: ${validStatuses.join(', ')}`, validatedValue: value };
        }
        return { isValid: true, error: '', validatedValue: trimmedValue };
        
      case 'remarks':
        if (trimmedValue && trimmedValue.length > 500) {
          return { isValid: false, error: 'Remarks must be less than 500 characters', validatedValue: value };
        }
        return { isValid: true, error: '', validatedValue: trimmedValue };
        
      default:
        return { isValid: true, error: '', validatedValue: value };
    }
  };

  const updateEditingData = (field: keyof ExcelRow, value: string) => {
    if (!editingData) return;
    
    const validation = validateInput(field, value);
    
    setValidationErrors(prev => ({
      ...prev,
      [field]: validation.error
    }));
    
      setEditingData({
        ...editingData,
      [field]: validation.validatedValue
    });
  };

  const isFormValid = useMemo(() => {
    if (!editingData) return false;
    
    const requiredFields = ['customer', 'service', 'vehicle', 'driver', 'pickup_date', 'pickup_time', 'pickup_location', 'dropoff_location'];
    
    for (const field of requiredFields) {
      const validation = validateInput(field as keyof ExcelRow, editingData[field as keyof ExcelRow] as string);
      if (!validation.isValid) {
        return false;
      }
    }
    
    return true;
  }, [editingData]);

  const getFieldError = (field: keyof ExcelRow): string => {
    return validationErrors[field] || '';
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key] as string | number | undefined;
      const bValue = b[sortConfig.key] as string | number | undefined;

      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  const handleSort = (key: keyof ExcelRow) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const getStatusIcon = (isValid: boolean, errorMessage: string, isRejected: boolean = false) => {
    if (isRejected) {
      return <RejectIcon className="w-5 h-5 text-gray-500" />;
    }
    if (isValid) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    }
    if (errorMessage.includes('Missing')) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    }
    return <XCircleIcon className="w-5 h-5 text-red-500" />;
  };

  // Calculate row height based on expansion and editing state
  const getRowHeight = useCallback((index: number) => {
    const row = sortedData[index];
    if (!row) return 60; // Default height
    
    const isExpanded = expandedRows.has(row.row_number);
    const isEditing = editingRow === row.row_number;
    
    let height = 60; // Base row height
    
    if (isExpanded) {
      height += 140; // Height for expanded details (increased for better spacing)
    }
    
    if (isEditing) {
      height += 550; // Height for editing form (increased for better spacing and button padding)
    }
    
    return height;
  }, [sortedData, expandedRows, editingRow]);

  // Reset cache when data changes
  const listRef = React.useRef<VList>(null);
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [sortedData, expandedRows, editingRow]);

  // Removed unnecessary callback wrappers to prevent memory leaks
  // const handleRowClick = useCallback((rowNumber: number) => {
  //   toggleRowExpansion(rowNumber);
  //   // Force re-render to update virtualization
  //   setTimeout(() => forceUpdate({}), 0);
  // }, [toggleRowExpansion]);

  // const handleRowKeyDown = useCallback((rowNumber: number, e: React.KeyboardEvent) => {
  //   if (e.key === 'Enter' || e.key === ' ') {
  //     e.preventDefault();
  //     toggleRowExpansion(rowNumber);
  //   }
  // }, [toggleRowExpansion]);

  // const handleRowSelection = useCallback((rowNumber: number) => {
  //   toggleRowSelection(rowNumber);
  // }, [toggleRowSelection]);

  // const handleStartEditing = useCallback((row: ExcelRow) => {
  //   startEditing(row);
  // }, [startEditing]);

  // const handleRejectRow = useCallback((rowNumber: number) => {
  //   rejectRow(rowNumber);
  // }, [rejectRow]);

  // const handleUpdateEditingData = useCallback((field: keyof ExcelRow, value: string) => {
  //   updateEditingData(field, value);
  // }, [updateEditingData]);

  // Optimized row content component to prevent memory leaks
  const RowContent = useCallback(({ row, isExpanded, isSelected, isEditing }: {
    row: ExcelRow;
    isExpanded: boolean;
    isSelected: boolean;
    isEditing: boolean;
  }) => {
    return (
      <>
        <div
          key={row.row_number}
          className={clsx(
            "border-b border-border-color/60 transition-all duration-200 cursor-pointer group relative",
            isSelected && "bg-blue-500/10 border-blue-500/20",
            isExpanded && "bg-primary/5 hover:bg-primary/10",
            !isExpanded && "hover:bg-background-light/70"
          )}
          style={{
            backgroundColor: row.is_valid 
              ? 'rgba(34, 197, 94, 0.1)' 
              : 'rgba(239, 68, 68, 0.2)',
            borderColor: row.is_valid 
              ? 'rgba(34, 197, 94, 0.2)' 
              : 'rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            minHeight: '60px'
          }}
          data-is-valid={row.is_valid}
          data-row-number={row.row_number}
          title={`Row ${row.row_number}: is_valid=${row.is_valid}, error=${row.error_message}`}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('button') && !target.closest('input') && !target.closest('a') && !target.closest('[role="button"]')) {
              toggleRowExpansion(row.row_number);
            }
          }}
          aria-expanded={isExpanded}
          role="row"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleRowExpansion(row.row_number);
            }
          }}
        >
          <div className="px-6 py-3.5 w-10 flex-shrink-0">
            {!row.is_rejected && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleRowSelection(row.row_number)}
                onClick={(e) => e.stopPropagation()}
                className="form-checkbox h-4 w-4 text-primary bg-background-light border-border-color rounded focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background"
              />
            )}
          </div>
          <div className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md text-text-main flex-shrink-0">
            {getStatusIcon(row.is_valid, row.error_message, row.is_rejected)}
          </div>
          <div className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md text-text-main flex-shrink-0">
            {row.row_number}
          </div>
          <div className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md text-text-main flex-shrink-0">
            {row.customer}
          </div>
          <div className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md text-text-main flex-shrink-0">
            {row.service}
          </div>
          <div className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md text-text-main flex-shrink-0">
            {row.pickup_date}
          </div>
          <div className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md text-text-main flex-shrink-0">
            {row.pickup_location}
          </div>
                     <div className="px-4 py-3 sticky right-0 text-right flex-shrink-0 min-w-[120px]">
             <div className="flex items-center justify-end space-x-2 w-full">
                                    <button
                    onClick={(e) => {
                      e.stopPropagation();
                  toggleRowExpansion(row.row_number);
                }}
                className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                title={isExpanded ? "Collapse row" : "Expand row"}
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-5 h-5" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5" />
                )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                  startEditing(row);
                    }}
                className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                title="Edit row"
                  >
                <PencilIcon className="w-4 h-4" />
                  </button>
                                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  rejectRow(row.row_number);
                }}
                className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                title={row.is_rejected ? "Unreject row" : "Reject row"}
              >
                <RejectIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Expanded row details */}
        {isExpanded && (
          <div className="bg-background-light/50 border-b border-border-color/60 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-text-secondary">Vehicle:</span>
                <span className="ml-2 text-text-main">{row.vehicle || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-text-secondary">Driver:</span>
                <span className="ml-2 text-text-main">{row.driver || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-text-secondary">Pickup Time:</span>
                <span className="ml-2 text-text-main">{row.pickup_time || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-text-secondary">Dropoff Location:</span>
                <span className="ml-2 text-text-main">{row.dropoff_location || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-text-secondary">Passenger Name:</span>
                <span className="ml-2 text-text-main">{row.passenger_name || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-text-secondary">Status:</span>
                <span className="ml-2 text-text-main">{row.status || 'N/A'}</span>
              </div>
              {row.remarks && (
                <div className="md:col-span-2 lg:col-span-3">
                  <span className="font-medium text-text-secondary">Remarks:</span>
                  <span className="ml-2 text-text-main">{row.remarks}</span>
                </div>
              )}
              {row.error_message && (
                <div className="md:col-span-2 lg:col-span-3">
                  <span className="font-medium text-red-600">Error:</span>
                  <span className="ml-2 text-red-600">{row.error_message}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Editing form */}
        {isEditing && editingData && (
          <div className="bg-background-light/80 border-b border-blue-200 px-6 py-4 pb-8 shadow-sm mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Customer</label>
                        <input
                          type="text"
                  value={editingData.customer}
                  onChange={(e) => updateEditingData('customer', e.target.value)}
                          className={clsx(
                    "w-full px-3 py-2 border rounded-md text-sm",
                    getFieldError('customer')
                              ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                              : "border-gray-300"
                          )}
                          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                />
                {getFieldError('customer') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('customer')}</p>
                )}
                          </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Service</label>
                <input
                  type="text"
                  value={editingData.service}
                  onChange={(e) => updateEditingData('service', e.target.value)}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-md text-sm",
                    getFieldError('service')
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300"
                  )}
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                />
                {getFieldError('service') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('service')}</p>
                        )}
                      </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Vehicle</label>
                <input
                  type="text"
                  value={editingData.vehicle}
                  onChange={(e) => updateEditingData('vehicle', e.target.value)}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-md text-sm",
                    getFieldError('vehicle')
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300"
                  )}
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                />
                {getFieldError('vehicle') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('vehicle')}</p>
                )}
                </div>
                <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Driver</label>
                        <input
                          type="text"
                  value={editingData.driver}
                  onChange={(e) => updateEditingData('driver', e.target.value)}
                          className={clsx(
                    "w-full px-3 py-2 border rounded-md text-sm",
                            getFieldError('driver') 
                              ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                              : "border-gray-300"
                          )}
                          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                        />
                        {getFieldError('driver') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('driver')}</p>
                        )}
                      </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Pickup Date</label>
                <input
                  type="date"
                  value={editingData.pickup_date}
                  onChange={(e) => updateEditingData('pickup_date', e.target.value)}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-md text-sm",
                    getFieldError('pickup_date')
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300"
                  )}
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                />
                {getFieldError('pickup_date') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('pickup_date')}</p>
                )}
                </div>
                <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Pickup Time</label>
                        <input
                          type="time"
                  value={editingData.pickup_time}
                  onChange={(e) => updateEditingData('pickup_time', e.target.value)}
                          className={clsx(
                    "w-full px-3 py-2 border rounded-md text-sm",
                            getFieldError('pickup_time') 
                              ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                              : "border-gray-300"
                          )}
                          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                        />
                        {getFieldError('pickup_time') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('pickup_time')}</p>
                        )}
                      </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Pickup Location</label>
                <input
                  type="text"
                  value={editingData.pickup_location}
                  onChange={(e) => updateEditingData('pickup_location', e.target.value)}
                  className={clsx(
                    "w-full px-3 py-2 border rounded-md text-sm",
                    getFieldError('pickup_location')
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300"
                  )}
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                />
                {getFieldError('pickup_location') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('pickup_location')}</p>
                )}
                </div>
                <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Dropoff Location</label>
                        <input
                          type="text"
                  value={editingData.dropoff_location}
                  onChange={(e) => updateEditingData('dropoff_location', e.target.value)}
                          className={clsx(
                    "w-full px-3 py-2 border rounded-md text-sm",
                            getFieldError('dropoff_location') 
                              ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                              : "border-gray-300"
                          )}
                          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                        />
                        {getFieldError('dropoff_location') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('dropoff_location')}</p>
                        )}
                </div>
                <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Passenger Name</label>
                        <input
                          type="text"
                  value={editingData.passenger_name}
                  onChange={(e) => updateEditingData('passenger_name', e.target.value)}
                          className={clsx(
                    "w-full px-3 py-2 border rounded-md text-sm",
                            getFieldError('passenger_name') 
                              ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                              : "border-gray-300"
                          )}
                          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                        />
                        {getFieldError('passenger_name') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('passenger_name')}</p>
                        )}
                </div>
                <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">Status</label>
                <select
                  value={editingData.status}
                  onChange={(e) => updateEditingData('status', e.target.value)}
                          className={clsx(
                    "w-full px-3 py-2 border rounded-md text-sm",
                            getFieldError('status') 
                              ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                              : "border-gray-300"
                          )}
                          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                >
                  <option value="">Select status</option>
                  <option value="new">New</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="otw">OTW (On The Way)</option>
                  <option value="ots">OTS (On The Site)</option>
                  <option value="pob">POB (Passenger On Board)</option>
                  <option value="jc">JC (Job Complete)</option>
                  <option value="sd">SD (Service Delivered)</option>
                  <option value="canceled">Canceled</option>
                </select>
                        {getFieldError('status') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('status')}</p>
                        )}
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-semibold text-gray-800 mb-1">Remarks</label>
                <textarea
                  value={editingData.remarks}
                  onChange={(e) => updateEditingData('remarks', e.target.value)}
                  rows={3}
                          className={clsx(
                    "w-full px-3 py-2 border rounded-md text-sm",
                            getFieldError('remarks') 
                              ? "border-red-500 focus:ring-red-500 focus:border-red-500" 
                              : "border-gray-300"
                          )}
                          style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-main)' }}
                        />
                        {getFieldError('remarks') && (
                  <p className="text-red-500 text-xs mt-1">{getFieldError('remarks')}</p>
                        )}
                      </div>
                  </div>
            <div className="flex items-center justify-end space-x-3 mt-6 pb-4">
                  <button
                onClick={cancelEditing}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md transition-colors"
              >
                Cancel
                  </button>
                  <button
                onClick={saveEditing}
                disabled={!isFormValid || isValidating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {isValidating ? 'Validating...' : 'Save Changes'}
                  </button>
                  </div>
                </div>
              )}
      </>
    );
  }, [toggleRowExpansion, toggleRowSelection, startEditing, rejectRow, updateEditingData, getStatusIcon, getFieldError, isFormValid, isValidating, cancelEditing, saveEditing]);

  // Optimized row renderer with minimal dependencies
  const RowRenderer = useCallback((row: ExcelRow) => {
    if (!row) return null;

    const isExpanded = expandedRows.has(row.row_number);
    const isSelected = selectedRows.has(row.row_number);
    const isEditing = editingRow === row.row_number;

  return (
      <RowContent 
        row={row}
        isExpanded={isExpanded}
        isSelected={isSelected}
        isEditing={isEditing}
      />
    );
  }, [expandedRows, selectedRows, editingRow, RowContent]);

  return (
    <div className="bg-background-light backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden border border-border-color">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-color">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-text-main">Excel Upload Preview</h3>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                {validCount} Valid
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                {errorCount} Errors
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onDownloadTemplate}
              className="px-3 py-1.5 text-sm font-medium border rounded-md transition-colors"
              style={{ 
                color: 'var(--color-primary)', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                borderColor: 'var(--color-primary)' 
              }}
            >
              <DocumentArrowDownIcon className="w-4 h-4 inline mr-1" />
              Download Template
            </button>
            <button
              onClick={onRevalidate}
              className="px-3 py-1.5 text-sm font-medium border rounded-md transition-colors"
              style={{ 
                color: '#f97316', 
                backgroundColor: 'rgba(249, 115, 22, 0.1)', 
                borderColor: '#f97316' 
              }}
            >
              <DocumentArrowUpIcon className="w-4 h-4 inline mr-1" />
              Revalidate
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-3 border-b border-border-color">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={selectAllValid}
              className="px-3 py-1 text-sm font-medium hover:text-blue-700 text-primary"
            >
              Select All Valid
            </button>
            <button
              onClick={selectAllRows}
              className="px-3 py-1 text-sm font-medium hover:text-blue-700 text-primary"
            >
              Select All
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-sm font-medium hover:text-gray-700 text-text-secondary"
            >
              Clear Selection
            </button>
            {selectedRows.size > 0 && (
              <button
                onClick={downloadSelectedRows}
                className="px-3 py-1 text-sm font-medium text-green-600 hover:text-green-700"
              >
                Download Selected ({selectedRows.size})
              </button>
            )}
            <span className="text-sm text-text-secondary">
              {selectedRows.size} selected
            </span>
          </div>
          {validCount > 0 && (
            <button
              onClick={onConfirmUpload}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: '#10b981' }}
            >
              {isLoading ? 'Processing...' : `Confirm Upload (${validCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Virtualized Table */}
      <div className="overflow-auto">
        {/* Table Header */}
        <div className="text-xs font-medium text-text-secondary bg-background-light/95 backdrop-blur-md sticky top-0 z-10 border-b border-border-color">
          <div 
            className="flex items-center w-full text-sm text-left text-text-main"
            style={{
              display: 'flex',
              alignItems: 'center',
              minHeight: '60px'
            }}
          >
            <div className="px-6 py-3.5 w-10 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={selectedRows.size === data.filter(row => !row.is_rejected).length && data.filter(row => !row.is_rejected).length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAllRows();
                    } else {
                      clearSelection();
                    }
                  }}
                  className="form-checkbox h-4 w-4 text-primary bg-background-light border-border-color rounded-md focus:ring-2 focus:ring-primary/40 focus:ring-offset-0"
                />
            </div>
            <div className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md flex-shrink-0">
                <div className="font-bold text-base text-text-main whitespace-normal break-words">Status</div>
            </div>
            <div 
                className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md text-text-main flex-shrink-0 cursor-pointer"
                onClick={() => handleSort('row_number')}
              >
                <div className="font-bold text-base text-text-main whitespace-normal break-words">
                  Row
                  {sortConfig?.key === 'row_number' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
            </div>
            <div 
                className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md text-text-main flex-shrink-0 cursor-pointer"
                onClick={() => handleSort('customer')}
              >
                <div className="font-bold text-base text-text-main whitespace-normal break-words">
                  Customer
                  {sortConfig?.key === 'customer' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
            </div>
            <div 
                className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md text-text-main flex-shrink-0 cursor-pointer"
                onClick={() => handleSort('service')}
              >
                <div className="font-bold text-base text-text-main whitespace-normal break-words">
                  Service
                  {sortConfig?.key === 'service' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
            </div>
            <div 
                className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md text-text-main flex-shrink-0 cursor-pointer"
                onClick={() => handleSort('pickup_date')}
              >
                <div className="font-bold text-base text-text-main whitespace-normal break-words">
                  Date
                  {sortConfig?.key === 'pickup_date' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
            </div>
            <div 
                className="px-4 py-3 whitespace-normal break-words max-w-xs md:max-w-sm lg:max-w-md text-text-main flex-shrink-0 cursor-pointer"
                onClick={() => handleSort('pickup_location')}
              >
                <div className="font-bold text-base text-text-main whitespace-normal break-words">
                  Pickup
                  {sortConfig?.key === 'pickup_location' && (
                    <span className="ml-1">
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
                        </div>
            <div className="px-4 py-3 sticky right-0 text-right flex-shrink-0 min-w-[120px]">
                <div className="font-bold text-base text-text-secondary text-right" style={{ width: '100%' }}>Actions</div>
                      </div>
                          </div>
                          </div>
        
        {/* Table Body */}
        {sortedData.length > 0 ? (
          <div className="text-sm text-left text-text-main">
            <VList
              ref={listRef}
              height={Math.min(600, sortedData.length * 60 + (expandedRows.size * 140) + (editingRow ? 550 : 0))}
              itemCount={sortedData.length}
              itemSize={getRowHeight}
              overscanCount={5}
              width="100%"
            >
              {({ index, style }) => (
                <div style={style}>
                  {RowRenderer(sortedData[index])}
                </div>
              )}
            </VList>
                          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-text-secondary">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">No data to display</div>
              <div className="text-sm">Upload an Excel file to see the preview</div>
                          </div>
                          </div>
                            )}
                          </div>
    </div>
  );
} 