import React, { useEffect, useState } from 'react';
import * as jobsApi from '@/services/api/jobsApi';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';

interface AuditRecord {
  id: number;
  job_id: number;
  changed_at: string;
  changed_by: number;
  changed_by_email: string;
  old_status: string;
  new_status: string;
  reason: string;
  description: string;
}

interface DriverInfo {
  id: number;
  name: string;
  license_number: string;
}

interface JobAuditTrailModalProps {
  jobId: number;
  isOpen: boolean;
  onClose: () => void;
}

const JobAuditTrailModal: React.FC<JobAuditTrailModalProps> = ({ jobId, isOpen, onClose }) => {
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && jobId) {
      loadAuditTrail();
    }
  }, [isOpen, jobId]);

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      const response = await jobsApi.getJobAuditTrail(jobId);
      setAuditRecords(response.audit_records || []);
      setDriverInfo(response.driver_info || null);
    } catch (error) {
      console.error('Error loading audit trail:', error);
      toast.error('Failed to load audit trail data');
      setAuditRecords([]);
      setDriverInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6">
      <div className="w-full max-w-4xl bg-background-light rounded-2xl overflow-hidden shadow-2xl border border-border-color">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-br from-primary to-primary/80 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Job Audit Trail - JB-{String(jobId).padStart(6, '0')}
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xl leading-none flex items-center justify-center"
              aria-label="Close"
              title="Close"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-hidden flex flex-col">
          {/* Driver Information */}
          {driverInfo && (
            <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center">
                  <span className="font-medium text-blue-800">Driver:</span>
                  <span className="ml-2 text-blue-600">{driverInfo.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-blue-800">ID:</span>
                  <span className="ml-2 text-blue-600">#{driverInfo.id}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-blue-800">License:</span>
                  <span className="ml-2 text-blue-600">{driverInfo.license_number || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Audit Records */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-3 text-text-main">Audit History</h3>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : auditRecords.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No audit records found</h3>
                  <p className="text-gray-500">There are no audit records for this job yet.</p>
                </div>
              ) : (
                <div className="bg-background-light/50 border border-border-color rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-background-light/80 border-b border-border-color text-sm font-semibold text-text-secondary">
                    <div className="col-span-3">Date & Time</div>
                    <div className="col-span-3">Changed By</div>
                    <div className="col-span-4">Change Description</div>
                    <div className="col-span-2">Reason</div>
                  </div>
                  <div className="divide-y divide-border-color">
                    {auditRecords.map((record) => (
                      <div key={record.id} className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-background-light/30">
                        <div className="col-span-3">
                          <div className="text-sm font-medium text-text-main">
                            {formatDate(record.changed_at)}
                          </div>
                        </div>
                        <div className="col-span-3">
                          <div className="text-sm text-text-main">
                            {record.changed_by_email || 'System'}
                          </div>
                        </div>
                        <div className="col-span-4">
                          <div className="text-sm">
                            {record.description || 'Job modified'}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-sm text-text-secondary">
                            {record.reason || '-'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-color bg-background-light/50 flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobAuditTrailModal;