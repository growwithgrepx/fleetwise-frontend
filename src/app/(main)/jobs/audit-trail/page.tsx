"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { EntityTable, EntityTableColumn } from '@/components/organisms/EntityTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { SearchIcon, CalendarIcon, XIcon } from 'lucide-react';
import { format } from 'date-fns';
import * as jobsApi from '@/services/api/jobsApi';
import toast from 'react-hot-toast';
import JobAuditTrailModal from '@/components/organisms/JobAuditTrailModal';
import { Card } from '@/components/atoms/Card';

interface AuditTrailItem {
  id: number;
  job_id: number;
  customer_name: string;
  last_modified_date: string;
  last_change_made: string;
  changed_by: {
    id: number;
    name: string;
    email: string;
  };
}

interface AuditTrailResponse {
  items: AuditTrailItem[];
  total: number;
  page: number;
  page_size: number;
}

export default function JobsAuditTrailPage() {
  const searchParams = useSearchParams();
  
  const [auditData, setAuditData] = useState<AuditTrailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Modal state
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Load audit trail data
  const loadAuditTrail = async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        page_size: pageSize.toString()
      };
      
      if (searchTerm) {
        params.search = searchTerm;
      }
      
      if (startDate) {
        params.start_date = startDate;
      }
      
      if (endDate) {
        params.end_date = endDate;
      }
      
      const response = await jobsApi.getJobsAuditTrail(params);
      
      // Check if response has data property
      if (response && response.data) {
        const data: AuditTrailResponse = response.data;
        setAuditData(data.items);
        setTotalItems(data.total);
        setCurrentPage(data.page);
      } else {
        // Handle case where response doesn't have expected structure
        setAuditData([]);
        setTotalItems(0);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error loading audit trail:', error);
      toast.error('Failed to load audit trail data');
      setAuditData([]);
      setTotalItems(0);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    loadAuditTrail(1);
  }, [searchTerm, startDate, endDate, pageSize]);

  // Handle pagination
  const handlePageChange = (page: number) => {
    loadAuditTrail(page);
  };

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadAuditTrail(1);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  // Set date range presets
  const setDateRangePreset = (days: number | null) => {
    if (days === null) {
      // Custom - reset both dates to empty
      setStartDate('');
      setEndDate('');
      // Trigger search automatically
      setTimeout(() => loadAuditTrail(1), 0);
      return;
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    setStartDate(startDate.toISOString().split('T')[0]);
    setEndDate(endDate.toISOString().split('T')[0]);
    // Trigger search automatically when preset is selected
    setTimeout(() => loadAuditTrail(1), 0);
  };

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };

  // Table columns
  const columns: EntityTableColumn<AuditTrailItem>[] = [
    {
      label: 'Job ID',
      accessor: 'job_id',
      render: (item: AuditTrailItem) => (
        <span className="font-medium">JB-{String(item.job_id).padStart(6, '0')}</span>
      )
    },
    {
      label: 'Customer Name',
      accessor: 'customer_name',
      render: (item: AuditTrailItem) => item.customer_name
    },
    {
      label: 'Last Modified',
      accessor: 'last_modified_date',
      render: (item: AuditTrailItem) => formatDate(item.last_modified_date)
    },
    {
      label: 'Last Change Made',
      accessor: 'last_change_made',
      render: (item: AuditTrailItem) => (
        <span className="text-sm">{item.last_change_made}</span>
      )
    },
    {
      label: 'Changed By',
      accessor: 'changed_by',
      render: (item: AuditTrailItem) => (
        <div>
          <div className="font-medium">{item.changed_by.name}</div>
          <div className="text-xs text-gray-500">{item.changed_by.email}</div>
        </div>
      )
    },
    {
      label: 'Actions',
      accessor: 'actions',
      render: (item: AuditTrailItem) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedJobId(item.job_id);
            setIsModalOpen(true);
          }}
        >
          View Trail
        </Button>
      )
    }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs Audit Trail</h1>
          <p className="text-muted-foreground">
            Track all significant changes made to jobs over time
          </p>
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          
          {/* Quick Date Presets */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDateRangePreset(7)}
                className={startDate && endDate && 
                  new Date(startDate) >= new Date(new Date().setDate(new Date().getDate() - 7)) && 
                  new Date(endDate) >= new Date() ? 
                  "border-primary bg-primary/10" : ""}
              >
                Last 7 Days
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDateRangePreset(30)}
                className={startDate && endDate && 
                  new Date(startDate) >= new Date(new Date().setDate(new Date().getDate() - 30)) && 
                  new Date(endDate) >= new Date() ? 
                  "border-primary bg-primary/10" : ""}
              >
                Last 30 Days
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDateRangePreset(90)}
                className={startDate && endDate && 
                  new Date(startDate) >= new Date(new Date().setDate(new Date().getDate() - 90)) && 
                  new Date(endDate) >= new Date() ? 
                  "border-primary bg-primary/10" : ""}
              >
                Last 3 Months
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setDateRangePreset(null)}
                className={!startDate && !endDate ? "border-primary bg-primary/10" : ""}
              >
                Custom
              </Button>
              {getActiveFilterCount() > 0 && (
                <>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300 self-center">
                    {getActiveFilterCount()} Active
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetFilters}
                    className="border-red-300 text-red-700 hover:bg-red-50 self-center"
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 space-y-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Search</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by Job ID, Customer Name, or User Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            
            <div className="md:col-span-3 space-y-2">
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            
            <div className="md:col-span-3 space-y-2">
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
          </form>
        </div>
      </Card>
      
      {/* Audit Trail Table */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Audit Trail Summary</h2>
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-xs text-text-secondary">Rows per page:</label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => { 
                  setPageSize(Number(e.target.value)); 
                  setCurrentPage(1); // Reset to first page when changing page size
                }}
                className="bg-background-light border-border-color text-text-main rounded px-2 py-1 text-xs"
              >
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-sm text-text-secondary mb-2">
            Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems} records
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : auditData.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No audit records found</h3>
              <p className="text-gray-500">
                {searchTerm || startDate || endDate 
                  ? "No audit records match your current filters. Try adjusting your search criteria." 
                  : "There are no job audit records yet. Audit records are created when jobs are modified."}
              </p>
            </div>
          ) : (
            <EntityTable
              columns={columns}
              data={auditData}
              isLoading={loading}
              total={totalItems}
              page={currentPage}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              disableRowExpansion={true}
            />
          )}
        </div>
      </Card>
      
      {/* Detailed Audit Trail Modal */}
      {isModalOpen && selectedJobId && (
        <JobAuditTrailModal
          jobId={selectedJobId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}