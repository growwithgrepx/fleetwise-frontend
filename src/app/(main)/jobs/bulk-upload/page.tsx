"use client";
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import ExcelUploadTable from '@/components/organisms/ExcelUploadTable';

import { uploadDownloadApi, type PreviewData as ApiPreviewData, type ExcelRow as ApiExcelRow } from '@/services/api/uploadDownloadApi';

// Extend the API ExcelRow interface to include is_rejected property
interface ExcelRow extends ApiExcelRow {
  is_rejected?: boolean;
}

// Extend the API PreviewData interface to use our extended ExcelRow
interface PreviewData extends Omit<ApiPreviewData, 'rows'> {
  rows: ExcelRow[];
}

export default function BulkUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStep, setUploadStep] = useState<'upload' | 'preview'>('upload');
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<number[]>([]);
  const [selectedValidCount, setSelectedValidCount] = useState(0);
  const [uploadRequestId, setUploadRequestId] = useState<string | null>(null);

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

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    // Validate file size (10MB limit)
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
      

      
      // Convert API data to our extended interface
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

  // Revalidate data
  const handleRevalidate = async () => {
    if (!previewData) return;

    setIsProcessing(true);
    try {
      const apiData = await uploadDownloadApi.revalidateData(
        previewData.column_mapping,
        previewData.rows
      );
      

      
      // Convert API data to our extended interface, preserving existing is_rejected state
      const data: PreviewData = {
        ...apiData,
        rows: apiData.rows.map(row => {
          const existingRow = previewData.rows.find(r => r.row_number === row.row_number);
          return { ...row, is_rejected: existingRow?.is_rejected || false };
        })
      };
      setPreviewData(data);
      toast.success(`Data revalidated: ${data.valid_count} valid, ${data.error_count} errors`);
    } catch (error) {
      console.error('Revalidation error:', error);
      toast.error('Failed to revalidate data');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle row updates
  const handleUpdateRow = (rowNumber: number, updatedRow: ExcelRow) => {
    if (!previewData) return;

    const updatedRows = previewData.rows.map(row =>
      row.row_number === rowNumber ? updatedRow : row
    );

    // Recalculate valid/error counts (excluding rejected rows)
    const validCount = updatedRows.filter(row => row.is_valid && !row.is_rejected).length;
    const errorCount = updatedRows.filter(row => !row.is_valid && !row.is_rejected).length;

    setPreviewData({
      ...previewData,
      rows: updatedRows,
      valid_count: validCount,
      error_count: errorCount
    });

    toast.success('Row updated successfully');
  };

  // Handle selection changes from ExcelUploadTable
  const handleSelectionChange = React.useCallback((rowNumbers: number[], validCount: number) => {
    setSelectedRowNumbers(rowNumbers);
    setSelectedValidCount(validCount);
  }, []);

  // Confirm upload with improved selection handling and race condition guard
  const handleConfirmUpload = async () => {
    // Guard at function entry - prevent duplicate submissions
    if (isProcessing || uploadRequestId !== null) return;
    if (!previewData || (selectedValidCount === 0 && previewData.valid_count === 0)) return;

    // Generate unique request ID for deduplication
    const requestId = crypto.randomUUID();
    setUploadRequestId(requestId);
    setIsProcessing(true);

    try {
      let rowsToUpload: ExcelRow[];

      if (selectedRowNumbers.length > 0) {
        // User selected specific rows - upload ONLY selected valid rows
        rowsToUpload = previewData.rows.filter(row =>
          selectedRowNumbers.includes(row.row_number) &&
          row.is_valid &&
          !row.is_rejected
        );
      } else {
        // No selection - upload ALL valid rows (default behavior)
        rowsToUpload = previewData.rows.filter(row =>
          row.is_valid &&
          !row.is_rejected
        );
      }

      const filteredData = {
        ...previewData,
        rows: rowsToUpload
      };

      const result = await uploadDownloadApi.confirmUpload(filteredData);

      // Handle different response scenarios
      if (result.processed_count > 0) {
        // Update rows with job IDs if available
        if (result.created_jobs && result.created_jobs.length > 0) {
          try {
            // Update the preview data rows with job IDs
            const updatedRows = previewData.rows.map(row => {
              const createdJob = result.created_jobs?.find(
                job => job.row_number === row.row_number
              );
              return createdJob ? { ...row, job_id: createdJob.job_id } : row;
            });

            setPreviewData({
              ...previewData,
              rows: updatedRows
            });

            // Persist job IDs in sessionStorage for reference across refreshes
            try {
              sessionStorage.setItem('last_upload_jobs', JSON.stringify(result.created_jobs));
              sessionStorage.setItem('last_upload_timestamp', new Date().toISOString());
            } catch (storageError) {
              console.error('Failed to persist job IDs to sessionStorage:', storageError);
              // Don't fail the upload, but log for debugging
            }
          } catch (error) {
            console.error('Failed to update preview with job IDs:', error);
            // Don't fail the upload, but log for debugging
            toast.error('Jobs created successfully, but failed to update UI with job IDs. Please refresh to see updated data.');
          }
        }

        // Some jobs were processed successfully
        if (result.skipped_count > 0) {
          // Some were processed, some were skipped
          toast.success(`${result.processed_count} job(s) created successfully. ${result.skipped_count} duplicate(s) skipped.`);
        } else {
          // All were processed
          toast.success(`${result.processed_count} job(s) created successfully!`);
        }

        // Stay on preview page instead of going to complete step
      } else if (result.skipped_count > 0) {
        // No jobs processed, all were skipped
        const skipReasons = result.skipped_rows
          .map(s => `Row ${s.row_number}: ${s.reason}`)
          .join('\n');
        toast.error(`No jobs created. All ${result.skipped_count} row(s) were skipped:\n${skipReasons}`);
      } else if (result.errors && result.errors.length > 0) {
        // Errors occurred
        toast.error(`Upload failed: ${result.errors.join(', ')}`);
      } else {
        // Unknown error
        toast.error('No jobs were created. Please try again.');
      }
    } catch (error) {
      console.error('Confirmation error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload confirmation failed');
    } finally {
      setIsProcessing(false);
      setUploadRequestId(null);
    }
  };

  // Reset upload
  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setUploadStep('upload');
    setSelectedRowNumbers([]);
    setSelectedValidCount(0);
    setUploadRequestId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-main)' }}>Bulk Job Upload</h1>
                <p style={{ color: 'var(--color-text-secondary)' }}>Upload Excel files to create multiple jobs at once</p>
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

        {/* Upload Step */}
        {uploadStep === 'upload' && (
          <div className="space-y-6">
            {/* Instructions Card */}
            <div className="p-6 rounded-lg shadow-lg border" style={{ 
              backgroundColor: 'var(--color-bg-light)', 
              borderColor: 'var(--color-border)' 
            }}>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <span className="text-white text-sm font-medium">?</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-main)' }}>
                    How to Use Bulk Upload
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">1</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-main)' }}>Download Template</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Click Download Template to get the correct Excel format with sample data
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">2</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-main)' }}>Fill Your Data</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Replace sample data with your actual job information
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">3</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-main)' }}>Upload & Preview</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Upload your Excel file to see validation results and preview data
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-xs font-medium">4</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-main)' }}>Review & Edit</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          Edit invalid rows, reject unwanted ones, then confirm upload
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Card */}
            <div className="p-8 rounded-lg shadow-lg border" style={{ 
              backgroundColor: 'var(--color-bg-light)', 
              borderColor: 'var(--color-border)' 
            }}>
              <div className="text-center">
                <CloudArrowUpIcon className="mx-auto h-12 w-12" style={{ color: 'var(--color-text-secondary)' }} />
                <h3 className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-main)' }}>Upload Excel File</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Upload your Excel file to preview and validate the data before importing.
                </p>
                <div className="mt-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {isUploading ? 'Uploading...' : 'Choose File'}
                  </button>
                  <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Supports .xlsx and .xls files up to 10MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {uploadStep === 'preview' && previewData && (
          <div className="space-y-6">
            {/* Excel Upload Table */}
            <ExcelUploadTable
              data={previewData.rows}
              validCount={previewData.valid_count}
              errorCount={previewData.error_count}
              onConfirmUpload={handleConfirmUpload}
              onRevalidate={handleRevalidate}
              onDownloadTemplate={handleDownloadTemplate}
              onUpdateRow={handleUpdateRow}
              onSelectionChange={handleSelectionChange}
              isLoading={isProcessing}
            />

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  color: 'var(--color-text-main)',
                  backgroundColor: 'var(--color-bg-light)',
                  borderColor: 'var(--color-border)'
                }}
              >
                Upload Another File
              </button>
              <div className="flex flex-col items-end space-y-2">
                {/* Persistent upload scope indicator */}
                {(previewData.valid_count > 0 || selectedValidCount > 0) && (
                  <div className="text-sm text-right" style={{ color: 'var(--color-text-secondary)' }}>
                    {selectedRowNumbers.length > 0 ? (
                      <>
                        Ready to upload <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{selectedValidCount}</span> selected valid row(s)
                        {selectedValidCount < selectedRowNumbers.length && (
                          <span className="text-yellow-600 ml-1">
                            ({selectedRowNumbers.length - selectedValidCount} selected rows are invalid)
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        Ready to upload <span className="font-bold" style={{ color: 'var(--color-primary)' }}>{previewData.valid_count}</span> valid row(s)
                      </>
                    )}
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleRevalidate}
                    disabled={isProcessing}
                    className="px-4 py-2 text-sm font-medium border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
                    style={{
                      color: '#f97316',
                      backgroundColor: 'rgba(249, 115, 22, 0.1)',
                      borderColor: '#f97316'
                    }}
                  >
                    Revalidate
                  </button>
                  {(previewData.valid_count > 0 || selectedValidCount > 0) && (
                    <button
                      onClick={handleConfirmUpload}
                      disabled={isProcessing || uploadRequestId !== null || (selectedRowNumbers.length > 0 && selectedValidCount === 0)}
                      className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: (selectedRowNumbers.length > 0 && selectedValidCount === 0)
                          ? '#9ca3af' // gray for invalid selection
                          : '#10b981'  // green for valid selection
                      }}
                    >
                      {isProcessing
                        ? 'Processing...'
                        : 'Confirm Upload'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
} 