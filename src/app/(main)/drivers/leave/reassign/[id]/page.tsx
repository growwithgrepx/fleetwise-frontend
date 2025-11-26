'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDriverLeave, getAffectedJobs, reassignJobs } from '@/services/api/driverLeaveApi';
import { DriverLeave, AffectedJobsResponse, JobReassignmentRequest } from '@/types/driverLeave';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useGetAllDrivers } from '@/hooks/useDrivers';
import { useGetAllVehicles } from '@/hooks/useVehicles';
import { useGetAllContractors } from '@/hooks/useContractors';

const JobReassignPage: React.FC = () => {
  const { id } = useParams();
  const router = useRouter();
  const leaveId = parseInt(id as string);
  
  const [leave, setLeave] = useState<DriverLeave | null>(null);
  const [affectedJobs, setAffectedJobs] = useState<AffectedJobsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reassigning, setReassigning] = useState(false);
  const [reassignments, setReassignments] = useState<Record<number, JobReassignmentRequest>>({});
  const isSubmittingRef = useRef(false);
  
  // Add hooks for drivers, vehicles, and contractors
  const { data: drivers = [] } = useGetAllDrivers();
  const { data: vehicles = [] } = useGetAllVehicles();
  const { data: contractors = [] } = useGetAllContractors();
  
  useEffect(() => {
    const fetchData = async () => {
      const results = await Promise.allSettled([
        getDriverLeave(leaveId),
        getAffectedJobs(leaveId)
      ]);
      
      if (results[0].status === 'fulfilled') {
        setLeave(results[0].value);
      } else {
        console.error('Leave fetch failed:', results[0].reason);
        toast.error('Failed to load leave details');
      }
      
      if (results[1].status === 'fulfilled') {
        setAffectedJobs(results[1].value);
        
        // Initialize reassignments with default values
        const initialReassignments: Record<number, JobReassignmentRequest> = {};
        results[1].value.affected_jobs.forEach((job: any) => {
          initialReassignments[job.id] = {
            job_id: job.id,
            new_driver_id: undefined,
            new_vehicle_id: undefined,
            new_contractor_id: undefined,
            notes: '',
            isDirty: false
          };
        });
        setReassignments(initialReassignments);
      } else {
        console.error('Jobs fetch failed:', results[1].reason);
        toast.error('Failed to load affected jobs');
      }
      
      setLoading(false);
    };
    
    if (leaveId) {
      fetchData();
    }
  }, [leaveId]);
  
  const handleReassignmentChange = (jobId: number, field: keyof JobReassignmentRequest, value: any) => {
    setReassignments(prev => ({
      ...prev,
      [jobId]: {
        ...prev[jobId],
        [field]: value,
        isDirty: true
      }
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setReassigning(true);
    
    try {
      // Filter out reassignments with no changes
      const reassignmentsArray = Object.values(reassignments)
        .filter(reassignment => reassignment.isDirty)
        .map(({ isDirty, ...rest }) => rest); // Strip isDirty before API call
      
      if (reassignmentsArray.length === 0) {
        toast.error('Please make at least one reassignment');
        return;
      }
      
      const response = await reassignJobs(leaveId, reassignmentsArray);
      
      toast.success(response.message);
      
      // Show detailed feedback for each job
      response.successful_jobs?.forEach((item: any) => {
        toast.success(`Job ${item.job_id} successfully reassigned`);
      });
      response.failed_jobs?.forEach((item: any) => {
        toast.error(`Failed to reassign job ${item.job_id}: ${item.error || 'Unknown error'}`);
      });
      response.skipped_jobs?.forEach((item: any) => {
        toast(`Job ${item.job_id} skipped: ${item.reason || 'In-progress status'}`, { icon: '⚠️' });
      });

      // Navigate back after short delay to allow user to see final toast
      setTimeout(() => {
        router.push(`/drivers/leave/details/${leaveId}`);
      }, 2000);
    } catch (error: any) {
      console.error('Error reassigning jobs:', error);
      toast.error(error.response?.data?.message || 'Failed to reassign jobs');
    } finally {
      setReassigning(false);
      isSubmittingRef.current = false;
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading leave details and affected jobs...</p>
        </div>
      </div>
    );
  }
  
  // Show error state only if both leave and affectedJobs failed to load
  if (!leave && !affectedJobs) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Failed to load leave details and affected jobs</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reassign Jobs</h1>
        {leave ? (
          <p className="text-gray-600 dark:text-gray-400">
            Leave for {leave.driver?.name || 'Unknown Driver'} from {format(new Date(leave.start_date), 'dd/MM/yyyy')} to {format(new Date(leave.end_date), 'dd/MM/yyyy')}
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">Leave details unavailable</p>
        )}
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Affected Jobs ({affectedJobs?.count || 0})
          </h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {affectedJobs ? (
              affectedJobs.affected_jobs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Job ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pickup Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pickup Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reassign To</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {affectedJobs.affected_jobs.map((job: any) => (
                        <tr key={job.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{job.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {job.pickup_date ? format(new Date(job.pickup_date), 'dd/MM/yyyy') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{job.pickup_time || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {job.status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {job.customer?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="space-y-2">
                              <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Driver</label>
                                <select
                                  value={reassignments[job.id]?.new_driver_id || ''}
                                  onChange={(e) => handleReassignmentChange(job.id, 'new_driver_id', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select Driver</option>
                                  {drivers
                                    .filter(d => d.id !== leave?.driver_id)
                                    .map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Vehicle</label>
                                <select
                                  value={reassignments[job.id]?.new_vehicle_id || ''}
                                  onChange={(e) => handleReassignmentChange(job.id, 'new_vehicle_id', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select Vehicle</option>
                                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.number}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Contractor</label>
                                <select
                                  value={reassignments[job.id]?.new_contractor_id || ''}
                                  onChange={(e) => handleReassignmentChange(job.id, 'new_contractor_id', e.target.value ? parseInt(e.target.value) : undefined)}
                                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Select Contractor</option>
                                  {contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <textarea
                              value={reassignments[job.id]?.notes || ''}
                              onChange={(e) => handleReassignmentChange(job.id, 'notes', e.target.value)}
                              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Notes"
                              rows={3}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                  No affected jobs found for this leave period.
                </div>
              )
            ) : (
              <div className="text-gray-600 dark:text-gray-400 text-center py-4">
                Failed to load affected jobs data.
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <AnimatedButton
                  type="submit"
                  disabled={reassigning || !affectedJobs || affectedJobs.affected_jobs.length === 0}
                  className="bg-gradient-to-r from-blue-500 to-blue-700 hover:opacity-90 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {reassigning ? 'Reassigning...' : 'Reassign Jobs'}
                </AnimatedButton>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobReassignPage;