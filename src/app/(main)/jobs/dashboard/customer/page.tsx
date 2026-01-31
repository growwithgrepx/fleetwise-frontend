"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useJobs } from "@/hooks/useJobs";
import { format, startOfMonth, endOfMonth, parseISO, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { convertUtcToDisplayTime } from "@/utils/timezoneUtils";

import { Badge } from "@/components/atoms/Badge";


import { 
  DownloadIcon, 
  EyeIcon, 
  CalendarIcon,
  ClockIcon,
  CarIcon,
  UserIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  FileTextIcon,
  DollarSignIcon
} from "lucide-react";
import axios, { AxiosError } from "axios";

// Import chart components
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

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
  
  const typedJobs = allJobs || []; // Properly typed by useJobs hook, with fallback to empty array
  
  // Get invoices via API call
  const [fetchedInvoices, setFetchedInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user?.customer_id) return;
      setInvoicesError(null);
      
      try {
        const response = await axios.get(`/api/invoices`, {
          params: { customer_id: user.customer_id }
        });
        // Transform invoice data to ensure total_amount is a proper number, not a string with leading zeros
        const transformedInvoices = response.data.map((invoice: any) => ({
          ...invoice,
          total_amount: typeof invoice.total_amount === 'string' ? parseFloat(invoice.total_amount) : Number(invoice.total_amount),
        }));
        setFetchedInvoices(transformedInvoices);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        setFetchedInvoices([]);
        setInvoicesError(
          (error instanceof AxiosError && error.response?.status === 403)
            ? 'Access denied to invoices'
            : 'Failed to load invoices. Please try again later.'
        );
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

  // Handle keyboard events for modal accessibility
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isJobDetailOpen) {
        setIsJobDetailOpen(false);
      }
    };
    
    if (isJobDetailOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isJobDetailOpen]);

  // Filter data by customer_id and date range
  const filteredJobs = useMemo(() => {
    if (!user?.customer_id) return [];

    return typedJobs
      .filter(job => job.customer_id === user.customer_id)
      .filter(job => {
        if (!job.pickup_date) return false;
        const jobDate = parseISO(job.pickup_date);
        if (!isValid(jobDate)) return false;
        return jobDate >= dateRange.from && jobDate <= dateRange.to;
      })
      .sort((a, b) => {
        if (!a.pickup_date || !b.pickup_date) return 0;
        const dateA = parseISO(a.pickup_date);
        const dateB = parseISO(b.pickup_date);
        if (!isValid(dateA) || !isValid(dateB)) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 10); // Last 10 jobs
  }, [typedJobs, user?.customer_id, dateRange]);

  const filteredInvoices = useMemo(() => {
    if (!user?.customer_id) return [];

    return fetchedInvoices
      .filter(invoice => invoice.customer_id === user.customer_id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10); // Last 10 invoices
  }, [fetchedInvoices, user?.customer_id]);

  // Calculate statistics
  const activeJobs = useMemo(() => {
    if (!user?.customer_id) return 0;

    return typedJobs.filter(job => 
      job.customer_id === user.customer_id && 
      job.status?.toLowerCase() === 'active'
    ).length;
  }, [typedJobs, user?.customer_id]);

  const pendingJobs = useMemo(() => {
    if (!user?.customer_id) return 0;

    return typedJobs.filter(job => 
      job.customer_id === user.customer_id && 
      job.status?.toLowerCase() === 'pending'
    ).length;
  }, [typedJobs, user?.customer_id]);

  const completedJobs = useMemo(() => {
    if (!user?.customer_id) return 0;
      
    const today = new Date();
    const startOfMonthDate = startOfMonth(today);
    const endOfMonthDate = endOfMonth(today);
  
    return typedJobs.filter(job => 
      job.customer_id === user.customer_id && 
      job.status?.toLowerCase() === "completed" &&
      job.pickup_date &&
      (() => {
        const jobDate = parseISO(job.pickup_date);
        return isValid(jobDate) && jobDate >= startOfMonthDate && jobDate <= endOfMonthDate;
      })()
    ).length;
  }, [typedJobs, user?.customer_id]);
  
  const totalJobs = useMemo(() => {
    if (!user?.customer_id) return 0;
  
    return typedJobs.filter(job => 
      job.customer_id === user.customer_id
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

  // Calculate additional metrics for the new cards
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  const completedToday = useMemo(() => {
    if (!user?.customer_id) return 0;

    return typedJobs.filter(job => 
      job.customer_id === user.customer_id && 
      job.status?.toLowerCase() === 'completed' &&
      job.pickup_date &&
      (() => {
        const pickupDate = parseISO(job.pickup_date);
        return isValid(pickupDate) &&
        pickupDate >= startOfToday &&
        pickupDate <= endOfToday;
      })()
    ).length;
  }, [typedJobs, user?.customer_id]);
  
  const upcomingBookings = useMemo(() => {
    if (!user?.customer_id) return 0;

    return typedJobs.filter(job => 
      job.customer_id === user.customer_id && 
      (job.status?.toLowerCase() === 'pending' || 
       (job.pickup_date && new Date(job.pickup_date) > today))
    ).length;
  }, [typedJobs, user?.customer_id]);
  
  // Calculate next booking date
  const nextBookingDate = useMemo(() => {
    if (!user?.customer_id) return null;
    
    const futureJobs = typedJobs
      .filter(job => 
        job.customer_id === user.customer_id && 
        job.pickup_date &&
        new Date(job.pickup_date) > today
      )
      .sort((a, b) => {
        if (!a.pickup_date || !b.pickup_date) return 0;
        return new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime();
      });
      
    return futureJobs.length > 0 ? futureJobs[0].pickup_date : null;
  }, [typedJobs, user?.customer_id]);
  
  // Calculate total spent this month
  const totalSpentThisMonth = useMemo(() => {
    if (!user?.customer_id) return 0;
    
    const startOfMonthDate = startOfMonth(today);
    const endOfMonthDate = endOfMonth(today);
    
    return typedJobs
      .filter(job => 
        job.customer_id === user.customer_id && 
        job.status?.toLowerCase() === 'completed' &&
        job.pickup_date &&
        (() => {
          const jobDate = parseISO(job.pickup_date);
          return isValid(jobDate) && jobDate >= startOfMonthDate && jobDate <= endOfMonthDate;
        })() &&
        job.final_price
      )
      .reduce((sum, job) => sum + (job.final_price || 0), 0);
  }, [typedJobs, user?.customer_id]);
  
  // Calculate total spent last month for comparison
  const totalSpentLastMonth = useMemo(() => {
    if (!user?.customer_id) return 0;
    
    const lastMonthStart = startOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    const lastMonthEnd = endOfMonth(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    
    return typedJobs
      .filter(job => 
        job.customer_id === user.customer_id && 
        job.status?.toLowerCase() === 'completed' &&
        job.pickup_date &&
        (() => {
          const jobDate = parseISO(job.pickup_date);
          return isValid(jobDate) && jobDate >= lastMonthStart && jobDate <= lastMonthEnd;
        })() &&
        job.final_price
      )
      .reduce((sum, job) => sum + (job.final_price || 0), 0);
  }, [typedJobs, user?.customer_id]);
  
  // Calculate pending invoices
  const pendingInvoices = useMemo(() => {
    if (!user?.customer_id) return 0;
    
    return fetchedInvoices.filter(invoice => 
      invoice.customer_id === user.customer_id && 
      (invoice.status?.toLowerCase() === 'pending' || invoice.status?.toLowerCase() === 'unpaid')
    ).length;
  }, [fetchedInvoices, user?.customer_id]);
  
  // Determine comparison text for total spent
  const comparisonText = () => {
    if (totalSpentLastMonth === 0) {
      return totalSpentThisMonth > 0 ? 'First month spending' : 'No spending last month';
    }
    
    const percentageChange = ((totalSpentThisMonth - totalSpentLastMonth) / totalSpentLastMonth) * 100;
    
    if (percentageChange > 0) {
      return `↑ ${Math.abs(percentageChange).toFixed(1)}% from last month`;
    } else if (percentageChange < 0) {
      return `↓ ${Math.abs(percentageChange).toFixed(1)}% from last month`;
    } else {
      return 'Same as last month';
    }
  };
  
  // Calculate revenue analytics data for charts
  const revenueByDay = useMemo(() => {
    if (!user?.customer_id) return [];
    
    const startOfMonthDate = startOfMonth(today);
    const endOfMonthDate = endOfMonth(today);
    
    // Group jobs by date and calculate revenue
    const dailyRevenue: { date: string; revenue: number; paid: number; pending: number }[] = [];
    
    const jobsForCustomer = typedJobs.filter(job => job.customer_id === user.customer_id);
    
    // Get all dates in the current month
    const currentDate = new Date(startOfMonthDate);
    while (currentDate <= endOfMonthDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const dayJobs = jobsForCustomer.filter(job => 
        job.pickup_date === dateStr && 
        job.status?.toLowerCase() === 'completed' &&
        job.final_price
      );
      
      const dailyTotal = dayJobs.reduce((sum, job) => sum + (job.final_price || 0), 0);
      
      dailyRevenue.push({
        date: dateStr,
        revenue: dailyTotal,
        paid: dailyTotal, // For simplicity, assuming completed jobs are paid
        pending: 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Return last 14 days of data
    return dailyRevenue.slice(-14);
  }, [typedJobs, user?.customer_id]);
  
  // Calculate invoice status data for pie chart
  const invoiceStatusData = useMemo(() => {
    if (!user?.customer_id) return [];
    
    const customerInvoices = fetchedInvoices.filter(inv => inv.customer_id === user.customer_id);
    
    const paidInvoices = customerInvoices.filter(inv => inv.status?.toLowerCase() === 'paid').length;
    const pendingInvoicesCount = customerInvoices.filter(inv => 
      inv.status?.toLowerCase() === 'pending' || inv.status?.toLowerCase() === 'unpaid'
    ).length;
    const overdueInvoices = customerInvoices.filter(inv => 
      inv.status?.toLowerCase() === 'overdue'
    ).length;
    
    return [
      { name: 'Paid', value: paidInvoices },
      { name: 'Pending', value: pendingInvoicesCount },
      { name: 'Overdue', value: overdueInvoices },
    ];
  }, [fetchedInvoices, user?.customer_id]);
  
  // Calculate total revenue metrics
  const totalRevenue = useMemo(() => {
    if (!user?.customer_id) return 0;
    
    return fetchedInvoices
      .filter(inv => inv.customer_id === user.customer_id)
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }, [fetchedInvoices, user?.customer_id]);
  
  const paidRevenue = useMemo(() => {
    if (!user?.customer_id) return 0;
    
    return fetchedInvoices
      .filter(inv => 
        inv.customer_id === user.customer_id && 
        inv.status?.toLowerCase() === 'paid'
      )
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }, [fetchedInvoices, user?.customer_id]);
  
  const pendingRevenue = useMemo(() => {
    if (!user?.customer_id) return 0;
    
    return fetchedInvoices
      .filter(inv => 
        inv.customer_id === user.customer_id && 
        (inv.status?.toLowerCase() === 'pending' || inv.status?.toLowerCase() === 'unpaid')
      )
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }, [fetchedInvoices, user?.customer_id]);
  
  const overdueRevenue = useMemo(() => {
    if (!user?.customer_id) return 0;
    
    return fetchedInvoices
      .filter(inv => 
        inv.customer_id === user.customer_id && 
        inv.status?.toLowerCase() === 'overdue'
      )
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  }, [fetchedInvoices, user?.customer_id]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <BriefcaseIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Customer Command Center</h1>
              </div>
              <div className="flex items-center ml-11">
                <div className="flex items-center text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  <span className="text-sm font-medium">Live data • Updated just now</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600 min-w-[200px]">
              <div className="text-center">
                <p className="text-white font-medium truncate">{user?.name || user?.email || 'Customer'}</p>
                <p className="text-gray-400 text-sm truncate">{user?.customer?.name || user?.customer_name || 'Organization'}</p>
                <div className="mt-2 flex items-center justify-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  <span className="text-xs text-green-400">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Active Jobs Card */}
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-lg p-4 border border-gray-600">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-medium mb-1">Active Jobs</div>
              <div className="text-2xl font-bold text-blue-400">{activeJobs}</div>
            </div>
            <div className="p-2 bg-gray-600 rounded-full">
              <BriefcaseIcon className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/jobs')}
            className="mt-3 w-full text-white border-gray-500 hover:bg-gray-600 hover:border-gray-400"
          >
            View All
          </Button>
        </div>

        {/* Pending Jobs Card */}
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-lg p-4 border border-gray-600">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-medium mb-1">Pending Jobs</div>
              <div className="text-2xl font-bold text-yellow-400">{pendingJobs}</div>
            </div>
            <div className="p-2 bg-gray-600 rounded-full">
              <ClockIcon className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/jobs')}
            className="mt-3 w-full text-white border-gray-500 hover:bg-gray-600 hover:border-gray-400"
          >
            View Details
          </Button>
        </div>

        {/* Total Jobs Card */}
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-lg p-4 border border-gray-600">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-medium mb-1">Total Jobs</div>
              <div className="text-2xl font-bold text-green-400">{totalJobs}</div>
            </div>
            <div className="p-2 bg-gray-600 rounded-full">
              <BriefcaseIcon className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">All jobs</p>
        </div>

        {/* Total Invoices Card */}
        <div className="bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-lg p-4 border border-gray-600">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-medium mb-1">Total Invoices</div>
              <div className="text-2xl font-bold text-purple-400">{totalInvoices}</div>
            </div>
            <div className="p-2 bg-gray-600 rounded-full">
              <FileTextIcon className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">{Math.min(totalInvoices, 10)} recent shown</p>
        </div>
      </div>
      
      {/* Revenue Intelligence Section */}
      <div className="mb-8 px-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-xl p-6 shadow-xl border border-gray-700">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Revenue Intelligence</h2>
          </div>
          
          {invoicesError && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
              {invoicesError}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-700 rounded-lg border border-gray-600">
              <div className="text-2xl font-bold text-green-400">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-sm text-gray-400">Total Revenue</div>
            </div>
            <div className="text-center p-4 bg-gray-700 rounded-lg border border-gray-600">
              <div className="text-2xl font-bold text-blue-400">${paidRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-sm text-gray-400">Paid</div>
            </div>
            <div className="text-center p-4 bg-gray-700 rounded-lg border border-gray-600">
              <div className="text-2xl font-bold text-orange-400">${pendingRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-sm text-gray-400">Pending</div>
            </div>
            <div className="text-center p-4 bg-gray-700 rounded-lg border border-gray-600">
              <div className="text-2xl font-bold text-red-400">${overdueRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-sm text-gray-400">Overdue</div>
            </div>
          </div>
        </div>
      </div>
      



      
      {/* Job Detail Modal */}
      {isJobDetailOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsJobDetailOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-detail-title"
        >
          <div 
            className="bg-gray-800 text-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 id="job-detail-title" className="text-xl font-semibold">Job Details</h2>
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
                            selectedJob.status?.toLowerCase() === 'completed' ? 'success' :
                            selectedJob.status?.toLowerCase() === 'active' ? 'default' :
                            selectedJob.status?.toLowerCase() === 'pending' ? 'secondary' :
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
                        {selectedJob.pickup_date ? (() => {
                          const jobDate = parseISO(selectedJob.pickup_date);
                          return isValid(jobDate) ? format(jobDate, 'MMM dd, yyyy') : 'Invalid Date';
                        })() : 'No Date'} at {convertUtcToDisplayTime(selectedJob.pickup_time, selectedJob.pickup_date)}
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