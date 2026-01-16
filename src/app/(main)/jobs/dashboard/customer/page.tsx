"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useJobs } from "@/hooks/useJobs";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
// Removed imports that don't exist
// import { 
//   Table, 
//   TableBody, 
//   TableCell, 
//   TableHead, 
//   TableHeader, 
//   TableRow 
// } from "@/components/molecules/EntityTable";
// import { 
//   Dialog, 
//   DialogContent, 
//   DialogHeader, 
//   DialogTitle 
// } from "@/components/molecules/Dialog";

// Using standard HTML elements with Tailwind CSS instead
import { Badge } from "@/components/atoms/Badge";


import { 
  DownloadIcon, 
  EyeIcon, 
  CalendarIcon,
  ClockIcon,
  CarIcon,
  UserIcon
} from "lucide-react";
import axios from "axios";

// Define types
type ApiJob = {
  id: number;
  customer_id: number;
  service_type: string;
  status: string;
  pickup_date: string;
  pickup_time: string;
  pickup_location: string;
  dropoff_location: string;
  driver_name?: string;
  vehicle_number?: string;
  final_price?: number;
};

type Invoice = {
  id: number;
  customer_id: number;
  date: string;
  total_amount: number;
  status: string;
  remaining_amount_invoice?: number;
};

type JobStatus = 'Active' | 'Pending' | 'Completed' | 'Cancelled';

const CustomerDashboardPage = () => {
  const router = useRouter();
  const { user } = useUser();
  const { jobs: allJobs = [], isLoading: jobsLoading } = useJobs();
  
  // Type assertion to handle type mismatch
  const typedJobs = allJobs as unknown as ApiJob[];
  
  // Get invoices via API call
  const [fetchedInvoices, setFetchedInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user?.customer_id) return;
      
      try {
        const response = await axios.get(`/api/invoices`, {
          params: { customer_id: user.customer_id }
        });
        setFetchedInvoices(response.data);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        setFetchedInvoices([]);
      } finally {
        setInvoicesLoading(false);
      }
    };
    
    fetchInvoices();
  }, [user?.customer_id]);

  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const [selectedJob, setSelectedJob] = useState<ApiJob | null>(null);
  const [isJobDetailOpen, setIsJobDetailOpen] = useState(false);

  // Filter data by customer_id and date range
  const filteredJobs = useMemo(() => {
    if (!user?.customer_id) return [];

    return typedJobs
      .filter(job => job.customer_id === user.customer_id)
      .filter(job => {
        const jobDate = parseISO(job.pickup_date);
        return jobDate >= dateRange.from && jobDate <= dateRange.to;
      })
      .sort((a, b) => new Date(b.pickup_date).getTime() - new Date(a.pickup_date).getTime())
      .slice(0, 10); // Last 10 jobs
  }, [typedJobs, user?.customer_id, dateRange]);

  const filteredInvoices = useMemo(() => {
    if (!user?.customer_id) return [];

    return fetchedInvoices
      .filter(invoice => invoice.customer_id === user.customer_id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Last 5 invoices
  }, [fetchedInvoices, user?.customer_id]);

  // Calculate statistics
  const activeJobs = useMemo(() => {
    if (!user?.customer_id) return 0;

    return typedJobs.filter(job => 
      job.customer_id === user.customer_id && 
      job.status.toLowerCase() === 'active'
    ).length;
  }, [typedJobs, user?.customer_id]);

  const pendingJobs = useMemo(() => {
    if (!user?.customer_id) return 0;

    return typedJobs.filter(job => 
      job.customer_id === user.customer_id && 
      job.status.toLowerCase() === 'pending'
    ).length;
  }, [typedJobs, user?.customer_id]);

  const completedJobs = useMemo(() => {
    if (!user?.customer_id) return 0;

    return typedJobs.filter(job => 
      job.customer_id === user.customer_id && 
      job.status.toLowerCase() === 'completed'
    ).length;
  }, [typedJobs, user?.customer_id]);

  const totalInvoices = useMemo(() => {
    if (!user?.customer_id) return 0;

    return fetchedInvoices.filter(invoice => invoice.customer_id === user.customer_id).length;
  }, [fetchedInvoices, user?.customer_id]);

  // Handle job click to open detail view
  const handleJobClick = (job: ApiJob) => {
    setSelectedJob(job);
    setIsJobDetailOpen(true);
  };

  // Handle invoice download
  const handleInvoiceDownload = (invoiceId: number) => {
    // In a real implementation, this would download the invoice PDF
    console.log(`Downloading invoice ${invoiceId}`);
    window.open(`/api/invoices/${invoiceId}/download`, '_blank');
  };

  // Handle date range change
  const handleDateRangeChange = (from: Date, to: Date) => {
    setDateRange({ from, to });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Customer Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg p-4">
          <div className="pb-2">
            <div className="text-sm font-medium">Active Jobs</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{activeJobs}</div>
            <p className="text-xs opacity-80">Currently active jobs</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 text-white rounded-lg p-4">
          <div className="pb-2">
            <div className="text-sm font-medium">Pending Jobs</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{pendingJobs}</div>
            <p className="text-xs opacity-80">Waiting for confirmation</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-lg p-4">
          <div className="pb-2">
            <div className="text-sm font-medium">Completed This Month</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{completedJobs}</div>
            <p className="text-xs opacity-80">Jobs completed this month</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-lg p-4">
          <div className="pb-2">
            <div className="text-sm font-medium">Total Invoices</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs opacity-80">Total invoices issued</p>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Date Range
          </label>
          <div className="flex gap-2">
            <div className="relative">
              <input
                type="date"
                value={format(dateRange.from, 'yyyy-MM-dd')}
                onChange={(e) => handleDateRangeChange(new Date(e.target.value), dateRange.to)}
                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white"
              />
              <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <span className="flex items-center text-gray-400">to</span>
            <div className="relative">
              <input
                type="date"
                value={format(dateRange.to, 'yyyy-MM-dd')}
                onChange={(e) => handleDateRangeChange(dateRange.from, new Date(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white"
              />
              <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Jobs Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Jobs</h2>
          <Button 
            variant="outline" 
            onClick={() => router.push('/jobs')}
            className="text-white border-white hover:bg-white hover:text-gray-900"
          >
            View All Jobs
          </Button>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {jobsLoading ? (
            <div className="p-6 text-center text-gray-400">Loading jobs...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No jobs found in the selected date range</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Job ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Pickup</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Dropoff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredJobs.map((job) => (
                  <tr 
                    key={job.id} 
                    className="hover:bg-gray-750 cursor-pointer"
                    onClick={() => handleJobClick(job)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium">#{job.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={
                          job.status.toLowerCase() === 'completed' ? 'success' :
                          job.status.toLowerCase() === 'active' ? 'default' :
                          job.status.toLowerCase() === 'pending' ? 'secondary' :
                          'destructive'
                        }
                      >
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {format(parseISO(job.pickup_date), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {job.pickup_time}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      <div className="flex items-center gap-1">
                        <UserIcon className="h-4 w-4" />
                        {job.driver_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                      <div className="flex items-center gap-1">
                        <CarIcon className="h-4 w-4" />
                        {job.vehicle_number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{job.pickup_location}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{job.dropoff_location}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJobClick(job);
                        }}
                        className="text-primary hover:bg-primary/10"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invoice Summary Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Invoices</h2>
          <Button 
            variant="outline" 
            onClick={() => router.push('/billing')}
            className="text-white border-white hover:bg-white hover:text-gray-900"
          >
            View All Invoices
          </Button>
        </div>

        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {invoicesLoading ? (
            <div className="p-6 text-center text-gray-400">Loading invoices...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-6 text-center text-gray-400">No invoices found</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Invoice ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium">INV-{String(invoice.id).padStart(6, '0')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">{format(parseISO(invoice.date), 'MMM dd, yyyy')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300">${invoice.total_amount?.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={
                          invoice.status.toLowerCase() === 'paid' ? 'success' :
                          invoice.status.toLowerCase() === 'partially paid' ? 'warning' :
                          'destructive'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleInvoiceDownload(invoice.id)}
                        className="text-primary hover:bg-primary/10"
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Job Detail Modal */}
      {isJobDetailOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 text-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Job Details</h2>
                <button 
                  onClick={() => setIsJobDetailOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              {selectedJob && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">Job ID</h3>
                      <p className="text-white">#{selectedJob.id}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">Status</h3>
                      <div>
                        <Badge 
                          variant={
                            selectedJob.status.toLowerCase() === 'completed' ? 'success' :
                            selectedJob.status.toLowerCase() === 'active' ? 'default' :
                            selectedJob.status.toLowerCase() === 'pending' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {selectedJob.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">Service Type</h3>
                      <p className="text-white">{selectedJob.service_type}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">Date & Time</h3>
                      <p className="text-white">
                        {format(parseISO(selectedJob.pickup_date), 'MMM dd, yyyy')} at {selectedJob.pickup_time}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Locations</h3>
                    <p className="text-white">From: {selectedJob.pickup_location}</p>
                    <p className="text-white">To: {selectedJob.dropoff_location}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">Driver</h3>
                      <p className="text-white">{selectedJob.driver_name || 'N/A'}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">Vehicle</h3>
                      <p className="text-white">{selectedJob.vehicle_number || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {selectedJob.final_price && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400">Final Price</h3>
                      <p className="text-white">${selectedJob.final_price.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboardPage;