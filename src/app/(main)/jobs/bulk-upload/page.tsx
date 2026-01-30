"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import JobCategorySection from '@/components/organisms/JobCategorySection';
import { useUser } from '@/context/UserContext';
import { uploadDownloadApi, type PreviewData as ApiPreviewData, type ExcelRow as ApiExcelRow } from '@/services/api/uploadDownloadApi';
import NotAuthorizedPage from '@/app/not-authorized/page';
import { api } from '@/lib/api';

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
  name: string;
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

interface ExcelRow extends ApiExcelRow {
  is_rejected?: boolean;
}

interface PreviewData extends Omit<ApiPreviewData, 'rows'> {
  rows: ExcelRow[];
}

export default function BulkUploadPreviewPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<'upload' | 'preview'>('upload');
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData>({
    customers: [],
    services: [],
    vehicles: [],
    drivers: [],
    contractors: [],
    vehicle_types: []
  });
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(false);
  const { user } = useUser();
  const role = (user?.roles?.[0]?.name || "guest").toLowerCase();

  // Fetch reference data
  useEffect(() => {
    const fetchReferenceData = async () => {
      setIsLoadingReferenceData(true);
      try {
        const fetchReferenceDataEndpoint = async (url: string, name: string) => {
          try {
            const response = await api.get(url);
            return response.data || [];
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Error fetching ${name}:`, error);
            }
            return [];
          }
        };

        // For customer users, skip fetching vehicles and drivers
        const isCustomerUser = role === 'customer';

        const fetchPromises = [
          fetchReferenceDataEndpoint('/api/customers', 'customers'),
          fetchReferenceDataEndpoint('/api/services', 'services'),
          !isCustomerUser ? fetchReferenceDataEndpoint('/api/vehicles', 'vehicles') : Promise.resolve([]),
          !isCustomerUser ? fetchReferenceDataEndpoint('/api/drivers', 'drivers') : Promise.resolve([]),
          fetchReferenceDataEndpoint('/api/contractors', 'contractors'),
          fetchReferenceDataEndpoint('/api/vehicle-types', 'vehicle types')
        ];

        const [customersRes, servicesRes, vehiclesRes, driversRes, contractorsRes, vehicleTypesRes] = await Promise.all(fetchPromises);

        // Transform vehicle response to match expected format
        const vehiclesFormatted = vehiclesRes && Array.isArray(vehiclesRes) ? vehiclesRes.map((v: any) => ({
          id: v.id,
          name: v.number || v.name
        })) : [];

        // Transform driver response to match expected format
        const driversFormatted = driversRes && Array.isArray(driversRes) ? driversRes.map((d: any) => ({
          id: d.id,
          name: d.name
        })) : [];

        // Transform customer response to match expected format
        const customersFormatted = customersRes && Array.isArray(customersRes) ? customersRes.map((c: any) => ({
          id: c.id,
          name: c.name
        })) : [];

        // Transform service response to match expected format
        const servicesFormatted = servicesRes && Array.isArray(servicesRes) ? servicesRes.map((s: any) => ({
          id: s.id,
          name: s.name
        })) : [];

        // Transform contractor response to match expected format
        const contractorsFormatted = contractorsRes && Array.isArray(contractorsRes) ? contractorsRes.map((c: any) => ({
          id: c.id,
          name: c.name
        })) : [];

        // Transform vehicle type response to match expected format
        const vehicleTypesFormatted = vehicleTypesRes && Array.isArray(vehicleTypesRes) ? vehicleTypesRes.map((vt: any) => ({
          id: vt.id,
          name: vt.name
        })) : [];

        setReferenceData({
          customers: customersFormatted,
          services: servicesFormatted,
          vehicles: vehiclesFormatted,
          drivers: driversFormatted,
          contractors: contractorsFormatted,
          vehicle_types: vehicleTypesFormatted
        });
      } catch (error) {
        console.error('Error fetching reference data:', error);
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

    fetchReferenceData();
  }, [role]);

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      await uploadDownloadApi.downloadTemplate();
      toast.success('Template downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download template');
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    handleFileUpload(selectedFile);
  };

  // Upload and process file
  const handleFileUpload = async (selectedFile: File) => {
    setIsUploading(true);
    setUploadStep('upload');

    try {
      const apiData = await uploadDownloadApi.uploadFile(selectedFile);
      const data: PreviewData = {
        ...apiData,
        rows: apiData.rows.map(row => ({ ...row, is_rejected: false }))
      };
      
      setPreviewData(data);
      setUploadStep('preview');
      toast.success(`File processed: ${data.valid_count} valid, ${data.error_count} errors`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Categorize rows
  const getRowsByCategory = () => {
    if (!previewData) {
      return {
        valid: [],
        error: [],
        xls_duplicate: [],
        db_duplicate: []
      };
    }

    return {
      valid: previewData.rows.filter(row => row.is_valid && !row.is_rejected),
      error: previewData.rows.filter(row => !row.is_valid && !row.is_rejected && !row.error_message?.includes('Duplicate')),
      xls_duplicate: previewData.rows.filter(row => !row.is_valid && !row.is_rejected && row.error_message?.includes('Duplicate in file')),
      db_duplicate: previewData.rows.filter(row => !row.is_valid && !row.is_rejected && row.error_message?.includes('Duplicate in database'))
    };
  };

  // Upload handlers for each category
  const uploadValidRows = async (selectedRowNumbers: number[]) => {
    if (!previewData) return;
    
    setLoadingCategory('valid');
    try {
      const validRows = previewData.rows.filter(row => 
        selectedRowNumbers.includes(row.row_number) && row.is_valid && !row.is_rejected
      );
      
      if (validRows.length === 0) {
        toast.error('No valid rows selected to upload');
        setLoadingCategory(null);
        return;
      }
      
      const filteredData = { ...previewData, rows: validRows };
      
      const result = await uploadDownloadApi.confirmUpload(filteredData);
      
      if (result.processed_count > 0) {
        toast.success(`✓ ${result.processed_count} valid job(s) created successfully!`);
      } else if (result.skipped_count > 0) {
        toast(`No jobs created (${result.skipped_count} duplicates detected)`);
      }

      // Update rows with job_id from response - keep jobs in original sections
      const updatedRows = previewData.rows.map(row => {
        // Check if this row was successfully created
        const createdJob = result.created_jobs?.find(j => j.row_number === row.row_number);
        if (createdJob) {
          console.log(`Row ${row.row_number} was created with job_id: ${createdJob.job_id}`);
          // Only add job_id, keep original category/status
          return { ...row, job_id: createdJob.job_id };
        }
        return row;
      });
      
      console.log('Updated rows after mapping:', updatedRows);
      console.log('DB Duplicates should be:', updatedRows.filter(r => r.error_message?.includes('Duplicate in database')));
      
      setPreviewData({
        ...previewData,
        rows: updatedRows
      });
      
      // Force re-render by getting categories
      const newCategories = (() => {
        return {
          valid: updatedRows.filter(row => row.is_valid && !row.is_rejected),
          error: updatedRows.filter(row => !row.is_valid && !row.is_rejected && !row.error_message?.includes('Duplicate')),
          xls_duplicate: updatedRows.filter(row => !row.is_valid && !row.is_rejected && row.error_message?.includes('Duplicate in file')),
          db_duplicate: updatedRows.filter(row => !row.is_valid && !row.is_rejected && row.error_message?.includes('Duplicate in database'))
        };
      })();
      
      console.log('New categories after update:', newCategories);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setLoadingCategory(null);
    }
  };

  const uploadErrorRows = async (selectedRowNumbers: number[]) => {
    if (!previewData) return;
    
    setLoadingCategory('error');
    try {
      const errorRows = previewData.rows.filter(row => 
        selectedRowNumbers.includes(row.row_number) && !row.is_valid && !row.is_rejected
      );
      
      if (errorRows.length === 0) {
        toast.error('No error rows selected to upload');
        setLoadingCategory(null);
        return;
      }

      // Re-validate error rows before uploading
      const apiData = await uploadDownloadApi.revalidateData(
        previewData.column_mapping,
        errorRows
      );

      const revalidatedRows = apiData.rows.filter(row => row.is_valid);
      
      if (revalidatedRows.length === 0) {
        toast.error('No rows passed validation after fixes');
        setLoadingCategory(null);
        return;
      }

      const filteredData = { ...previewData, rows: revalidatedRows };
      const result = await uploadDownloadApi.confirmUpload(filteredData);
      
      if (result.processed_count > 0) {
        toast.success(`✓ ${result.processed_count} fixed job(s) created successfully!`);
      } else {
        toast(`No jobs were created (${result.skipped_count} skipped)`);
      }
      
      // Update preview data: add job_id to created rows - keep in original section
      const updatedRows = previewData.rows.map(row => {
        const createdJob = result.created_jobs?.find(j => j.row_number === row.row_number);
        if (createdJob) {
          // Only add job_id, keep original category/status
          return { ...row, job_id: createdJob.job_id };
        }
        return row;
      });
      
      setPreviewData({
        ...previewData,
        rows: updatedRows
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setLoadingCategory(null);
    }
  };

  const uploadXLSDuplicates = async (selectedRowNumbers: number[]) => {
    if (!previewData) return;
    
    setLoadingCategory('xls_duplicate');
    try {
      const xlsDuplicateRows = previewData.rows.filter(row => 
        selectedRowNumbers.includes(row.row_number) && !row.is_valid && !row.is_rejected && row.error_message?.includes('Duplicate in file')
      );

      if (xlsDuplicateRows.length === 0) {
        toast.error('No XLS duplicate rows selected to upload');
        setLoadingCategory(null);
        return;
      }

      // For XLS duplicates, keep only the first occurrence of each combination
      const seen = new Set<string>();
      const uniqueRows = xlsDuplicateRows.filter(row => {
        const key = `${row.customer}-${row.service}-${row.pickup_date}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

      if (uniqueRows.length === 0) {
        toast.error('All XLS duplicates were filtered out');
        setLoadingCategory(null);
        return;
      }

      // Mark as valid and upload
      const validatedRows = uniqueRows.map(row => ({
        ...row,
        is_valid: true,
        error_message: ''
      }));

      const filteredData = { ...previewData, rows: validatedRows };
      const result = await uploadDownloadApi.confirmUpload(filteredData);
      
      if (result.processed_count > 0) {
        toast.success(`✓ ${result.processed_count} XLS duplicate job(s) created successfully!`);
      } else {
        toast(`No jobs were created (${result.skipped_count} skipped)`);
      }
      
      // Update preview data: add job_id to created rows - keep in original section
      const updatedRows = previewData.rows.map(row => {
        const createdJob = result.created_jobs?.find(j => j.row_number === row.row_number);
        if (createdJob) {
          // Only add job_id, keep original category/status
          return { ...row, job_id: createdJob.job_id };
        }
        return row;
      });
      
      setPreviewData({
        ...previewData,
        rows: updatedRows
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setLoadingCategory(null);
    }
  };

  const uploadDBDuplicates = async (selectedRowNumbers: number[]) => {
    if (!previewData) return;
    
    setLoadingCategory('db_duplicate');
    try {
      const dbDuplicateRows = previewData.rows.filter(row => 
        selectedRowNumbers.includes(row.row_number) && !row.is_valid && !row.is_rejected && row.error_message?.includes('Duplicate in database')
      );

      if (dbDuplicateRows.length === 0) {
        toast.error('No database duplicate rows selected');
        setLoadingCategory(null);
        return;
      }

      // Ask user for confirmation to create duplicate jobs
      const confirmMessage = `Are you sure you want to create ${dbDuplicateRows.length} duplicate job(s)? These jobs already exist in the database.\n\nThis action cannot be undone.`;
      const isConfirmed = window.confirm(confirmMessage);

      if (!isConfirmed) {
        toast(`Cancelled: No duplicate jobs were created`);
        setLoadingCategory(null);
        return;
      }

      // Mark rows as valid and try to upload them (force create)
      const validatedRows = dbDuplicateRows.map(row => ({
        ...row,
        is_valid: true,
        error_message: ''
      }));

      const filteredData = { ...previewData, rows: validatedRows, force_create: true };
      const result = await uploadDownloadApi.confirmUpload(filteredData);
      
      if (result.processed_count > 0) {
        toast.success(`✓ ${result.processed_count} duplicate job(s) created successfully!`);
      } else {
        toast(`No jobs were created (${result.skipped_count} skipped)`);
      }
      
      // Update preview data: add job_id to created rows - keep in original section
      const updatedRows = previewData.rows.map(row => {
        const createdJob = result.created_jobs?.find(j => j.row_number === row.row_number);
        if (createdJob) {
          // Only add job_id, keep original category/status
          return { ...row, job_id: createdJob.job_id };
        }
        return row;
      });
      
      setPreviewData({
        ...previewData,
        rows: updatedRows
      });
      
      setLoadingCategory(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'Operation failed');
      setLoadingCategory(null);
    }
  };

  // Handle row updates (when user edits and saves changes)
  const handleUpdateRow = useCallback(async (rowNumber: number, updatedRow: any) => {
    if (!previewData) return;

    try {
      // Re-validate the updated row to check if it's now valid
      const revalidationResult = await uploadDownloadApi.revalidateData(
        previewData.column_mapping,
        [updatedRow] // Validate just this one row
      );

      // Get the re-validated row
      const revalidatedRow = revalidationResult.rows[0];

      // Update the row in previewData with the revalidated data
      // BUT: keep the original is_valid and error_message to keep row in its original section
      const updatedRows = previewData.rows.map(row => {
        if (row.row_number === rowNumber) {
          const currentRow = previewData.rows.find(r => r.row_number === rowNumber);
          return {
            ...row,
            ...updatedRow,
            // Keep original validation status - don't move rows between sections
            is_valid: currentRow?.is_valid ?? revalidatedRow.is_valid,
            error_message: currentRow?.error_message ?? revalidatedRow.error_message
          };
        }
        return row;
      });

      // Update preview data with the modified row
      setPreviewData({
        ...previewData,
        rows: updatedRows
      });

      // Show appropriate message
      if (revalidatedRow.is_valid) {
        toast.success('Row updated! (Fixed but staying in current section)');
      } else {
        toast(`Row updated but still has validation errors: ${revalidatedRow.error_message}`);
      }
    } catch (error) {
      console.error('Error updating row:', error);
      
      // Fallback: update without revalidation
      const updatedRows = previewData.rows.map(row => 
        row.row_number === rowNumber ? { ...row, ...updatedRow } : row
      );

      setPreviewData({
        ...previewData,
        rows: updatedRows
      });

      toast.success('Row updated successfully');
    }
  }, [previewData]);

  // Reset upload
  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setUploadStep('upload');
    setLoadingCategory(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (["driver"].includes(role)) {
    return <NotAuthorizedPage />;
  }

  const categories = getRowsByCategory();

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full flex flex-col gap-4 px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--color-text-main)' }}>
                  Bulk Job Upload
                </h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>
                  Categorized upload with separate validation and upload buttons
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
              Download Template
            </button>
          </div>
        </div>

        {/* Upload Section */}
        {uploadStep === 'upload' && (
          <div className="space-y-6">
            {/* Upload Card */}
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-bg-light)'
              }}
            >
              <CloudArrowUpIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-primary)' }} />
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-main)' }}>
                Select Excel File
              </h3>
              <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                Drag and drop or click to select
              </p>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="px-6 py-2 text-white rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {isUploading ? 'Processing...' : 'Select File'}
              </button>
              {file && (
                <p className="mt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Selected: <span className="font-semibold">{file.name}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Preview Section - Categorized */}
        {uploadStep === 'preview' && previewData && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-light)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Valid Jobs</p>
                <p className="text-3xl font-bold text-green-600">{categories.valid.length}</p>
              </div>
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-light)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Jobs with Issues</p>
                <p className="text-3xl font-bold text-red-600">{categories.error.length}</p>
              </div>
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-light)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>XLS Duplicates</p>
                <p className="text-3xl font-bold text-orange-600">{categories.xls_duplicate.length}</p>
              </div>
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-light)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>DB Duplicates</p>
                <p className="text-3xl font-bold text-yellow-600">{categories.db_duplicate.length}</p>
              </div>
            </div>

            {/* Category Sections with Individual Upload Buttons */}
            {categories.valid.length > 0 && (
              <JobCategorySection
                title="✓ Valid Jobs"
                category="valid"
                rows={categories.valid}
                onConfirmUpload={uploadValidRows}
                onUpdateRow={handleUpdateRow}
                isLoading={loadingCategory === 'valid'}
                referenceData={referenceData}
                user={user}
                isLoadingReferenceData={isLoadingReferenceData}
              />
            )}

            {categories.error.length > 0 && (
              <JobCategorySection
                title="✗ Jobs with Issues"
                category="error"
                rows={categories.error}
                onConfirmUpload={uploadErrorRows}                onUpdateRow={handleUpdateRow}                isLoading={loadingCategory === 'error'}
                referenceData={referenceData}
                user={user}
                isLoadingReferenceData={isLoadingReferenceData}
              />
            )}

            {categories.xls_duplicate.length > 0 && (
              <JobCategorySection
                title="! Duplicates in XLS"
                category="xls_duplicate"
                rows={categories.xls_duplicate}
                onConfirmUpload={uploadXLSDuplicates}                onUpdateRow={handleUpdateRow}                isLoading={loadingCategory === 'xls_duplicate'}
                referenceData={referenceData}
                user={user}
                isLoadingReferenceData={isLoadingReferenceData}
              />
            )}

            {categories.db_duplicate.length > 0 && (
              <JobCategorySection
                title="! Duplicates in Database"
                category="db_duplicate"
                rows={categories.db_duplicate}
                onConfirmUpload={uploadDBDuplicates}                onUpdateRow={handleUpdateRow}                isLoading={loadingCategory === 'db_duplicate'}
                referenceData={referenceData}
                user={user}
                isLoadingReferenceData={isLoadingReferenceData}
              />
            )}

            {/* Reset Button */}
            <div className="flex justify-center pt-6">
              <button
                onClick={handleReset}
                className="px-6 py-2 rounded-lg font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-light)',
                  color: 'var(--color-text-main)',
                  border: '1px solid var(--color-border)'
                }}
              >
                Upload Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
