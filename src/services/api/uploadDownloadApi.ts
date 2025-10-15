import { api } from '@/lib/api';

export interface ExcelRow {
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
}

export interface PreviewData {
  valid_count: number;
  error_count: number;
  rows: ExcelRow[];
  column_mapping: Record<string, string>;
  available_columns: string[];
}

export interface UploadResult {
  success: boolean;
  processed: number;
  message: string;
  errors: string[];
}

export const uploadDownloadApi = {
  // Download Excel template
  downloadTemplate: async (): Promise<void> => {
    try {
      const response = await api.get('/api/jobs/template', {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bulk_jobs_template_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download template error:', error);
      throw new Error('Failed to download template');
    }
  },

  // Upload Excel file
  uploadFile: async (file: File): Promise<PreviewData> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<PreviewData>('/api/jobs/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Upload file error:', error);
      throw new Error('Failed to upload file');
    }
  },

  // Revalidate data with new column mappings
  revalidateData: async (columnMapping: Record<string, string>, data: ExcelRow[]): Promise<PreviewData> => {
    try {
      const response = await api.post<{ success: boolean; preview_data: PreviewData }>('/api/jobs/revalidate', {
        column_mapping: columnMapping,
        data: data,
      });

      return response.data.preview_data;
    } catch (error) {
      console.error('Revalidate data error:', error);
      throw new Error('Failed to revalidate data');
    }
  },

  // Confirm upload and create jobs
  confirmUpload: async (previewData: PreviewData): Promise<UploadResult> => {
    try {
      const response = await api.post<UploadResult>('/api/jobs/confirm-upload', previewData);
      return response.data;
    } catch (error) {
      console.error('Confirm upload error:', error);
      throw new Error('Failed to confirm upload');
    }
  },

  // Validate single row
  validateRow: async (rowData: Partial<ExcelRow>): Promise<{ is_valid: boolean; error_message: string }> => {
    try {
      const response = await api.post<{ success: boolean; is_valid: boolean; error_message: string }>('/api/jobs/validate-row', {
        row_data: rowData
      });
      return {
        is_valid: response.data.is_valid,
        error_message: response.data.error_message
      };
    } catch (error) {
      console.error('Validate row error:', error);
      throw new Error('Failed to validate row');
    }
  },

  // Download selected rows as Excel
  downloadSelectedRows: async (selectedRows: ExcelRow[]): Promise<void> => {
    try {
      const response = await api.post('/api/jobs/download-selected', {
        selected_rows: selectedRows
      }, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `selected_jobs_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download selected rows error:', error);
      throw new Error('Failed to download selected rows');
    }
  },
}; 