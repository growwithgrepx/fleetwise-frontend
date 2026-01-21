import React, { useEffect, useState } from 'react';
import { getJobById } from '@/services/api/jobsApi';
import JobDetailCard from './JobDetailCard';
import { Spinner } from '@/components/atoms/Spinner';

interface JobDetailsModalProps {
  isOpen: boolean;
  jobId: number | null;
  onClose: () => void;
  jobData?: any; // Optional job data to use instead of fetching
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ isOpen, jobId, onClose, jobData }) => {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const jobData = await getJobById(jobId!);
      setJob(jobData);
    } catch (err) {
      console.error('Error loading job details:', err);
      setError('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // If jobData is provided, use it directly and skip API call
      if (jobData) {
        setJob(jobData);
        setLoading(false);
        setError(null);
      } else if (jobId) {
        // Otherwise, fetch from API
        loadJobDetails();
      } else {
        setJob(null);
        setError(null);
      }
    } else {
      setJob(null);
      setError(null);
    }
  }, [isOpen, jobId, jobData]); // Removed loadJobDetails to prevent unnecessary re-fetching when jobData is provided

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-6xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {job ? `Job Details - ${job.id}` : 'Job Details'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xl leading-none flex items-center justify-center transition-colors"
              aria-label="Close"
              title="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Spinner className="w-8 h-8" />
            </div>
          ) : error ? (
            <div className="p-6 text-red-500">
              <p>Error: {error}</p>
              <button
                onClick={loadJobDetails}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                Retry
              </button>
            </div>
          ) : job ? (
            <div className="p-6">
              <JobDetailCard job={job} />
            </div>
          ) : (
            <div className="p-6 text-gray-400">
              <p>No job data available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-900 flex items-center justify-end">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsModal;