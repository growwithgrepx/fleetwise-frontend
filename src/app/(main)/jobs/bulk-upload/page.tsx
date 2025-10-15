"use client";
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  CloudArrowUpIcon, 
  DocumentArrowDownIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon
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
  const [uploadStep, setUploadStep] = useState<'upload' | 'preview' | 'complete'>('upload');

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

  // Confirm upload
  const handleConfirmUpload = async () => {
    if (!previewData || previewData.valid_count === 0) return;

    setIsProcessing(true);
    try {
      // Filter out rejected rows before sending to API
      const filteredData = {
        ...previewData,
        rows: previewData.rows.filter(row => !row.is_rejected)
      };
      
      const result = await uploadDownloadApi.confirmUpload(filteredData);
      setUploadStep('complete');
      toast.success(result.message);
      
      // Reset after successful upload
      setTimeout(() => {
        setFile(null);
        setPreviewData(null);
        setUploadStep('upload');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);
    } catch (error) {
      console.error('Confirmation error:', error);
      toast.error(error instanceof Error ? error.message : 'Upload confirmation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset upload
  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setUploadStep('upload');
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
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg shadow-lg border" style={{ 
                backgroundColor: 'var(--color-bg-light)', 
                borderColor: 'var(--color-border)' 
              }}>
                <div className="flex items-center">
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Valid Rows</p>
                    <p className="text-2xl font-bold text-green-600">{previewData.valid_count}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg shadow-lg border" style={{ 
                backgroundColor: 'var(--color-bg-light)', 
                borderColor: 'var(--color-border)' 
              }}>
                <div className="flex items-center">
                  <XCircleIcon className="w-8 h-8 text-red-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Errors</p>
                    <p className="text-2xl font-bold text-red-600">{previewData.error_count}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-lg shadow-lg border" style={{ 
                backgroundColor: 'var(--color-bg-light)', 
                borderColor: 'var(--color-border)' 
              }}>
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-border)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>T</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Total Rows</p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-text-main)' }}>{previewData.rows.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Excel Upload Table */}
            <ExcelUploadTable
              data={previewData.rows}
              validCount={previewData.valid_count}
              errorCount={previewData.error_count}
              onConfirmUpload={handleConfirmUpload}
              onRevalidate={handleRevalidate}
              onDownloadTemplate={handleDownloadTemplate}
              onUpdateRow={handleUpdateRow}
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
                {previewData.valid_count > 0 && (
                  <button
                    onClick={handleConfirmUpload}
                    disabled={isProcessing}
                    className="px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
                    style={{ backgroundColor: '#10b981' }}
                  >
                    {isProcessing ? 'Processing...' : `Confirm Upload (${previewData.valid_count})`}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {uploadStep === 'complete' && (
          <div className="p-8 text-center rounded-lg shadow-lg border" style={{ 
            backgroundColor: 'var(--color-bg-light)', 
            borderColor: 'var(--color-border)' 
          }}>
            <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-2 text-sm font-medium" style={{ color: 'var(--color-text-main)' }}>Upload Complete!</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Your jobs have been successfully imported. You will be redirected shortly.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/jobs')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                View Jobs
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 