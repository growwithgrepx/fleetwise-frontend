"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { EntityTable, EntityTableColumn } from "@/components/organisms/EntityTable";
import { Button } from "@/components/ui/button";
import { useGetAllDrivers } from "@/hooks/useDrivers";
import { Job } from "@/types/job";
import { EyeIcon, XIcon, DownloadIcon, SearchIcon, CalendarIcon } from "lucide-react";
import { Card } from '@/components/atoms/Card';
import { useRouter } from "next/navigation";

// CSV generation utility
const toCSV = (rows: Record<string, any>[]) => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) =>
    `"${String(v ?? "").replaceAll('"', '""').replaceAll("\n", " ")}"`;
  const head = headers.map(esc).join(",");
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
  return `${head}\n${body}`;
};

export default function DriverJobHistoryReport() {
  // Form state
  const [driverId, setDriverId] = useState<string>("");
  const [jobIds, setJobIds] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [contractorName, setContractorName] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);
  
  const router = useRouter();
  
  // Fetch drivers
  const { data: drivers = [], isLoading: driversLoading } = useGetAllDrivers();
  
  // Fetch job data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["driver-jobs", driverId, jobIds, customerName, contractorName, startDate, endDate, page, pageSize],
    queryFn: async () => {
      if (!driverId) return { items: [], total: 0 };
      
      const params: Record<string, string | number> = {
        driver_id: driverId,
        page,
        page_size: pageSize
      };
      
      // Add optional filters
      if (jobIds) params.job_ids = jobIds;
      if (customerName) params.customer_name = customerName;
      if (contractorName) params.contractor_name = contractorName;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const response = await axios.get("/api/reports/driver", { params });
      return response.data;
    },
    // Enable auto-fetch when driverId is set
    enabled: !!driverId
  });
  
  // Auto-select first driver when drivers load and trigger initial fetch
  useEffect(() => {
    if (drivers.length > 0 && !driverId) {
      const firstDriverId = String(drivers[0].id);
      setDriverId(firstDriverId);
    }
  }, [drivers, driverId]);
  
  // Handle filter changes
  const handleFilterChange = (column: string, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }));
  };
  
  // Apply filters
  const handleApplyFilters = () => {
    setPage(1); // Reset to first page when applying filters
    refetch();
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setJobIds("");
    setCustomerName("");
    setContractorName("");
    setStartDate("");
    setEndDate("");
    setFilters({});
    setPage(1);
    refetch();
  };
  
  // Handle row selection change
  const handleSelectionChange = (selectedIds: (string | number)[]) => {
    setSelectedRows(selectedIds);
  };
  
  // Columns for the entity table
  const columns: EntityTableColumn<Job>[] = [
    { label: "Job ID", accessor: "id" },
    { 
      label: "Customer Name", 
      accessor: "customer_name",
      filterable: false,
      stringLabel: "Customer Name"
    },
    { 
      label: "Contractor Name", 
      accessor: "contractor_name",
      render: (row: any) => row.contractor?.name || ""
    },
    { 
      label: "Driver Name", 
      accessor: "driver_name",
      render: (row: any) => row.driver?.name || ""
    },
    { label: "Pickup Location", accessor: "pickup_location" },
    { label: "Pickup Time", accessor: "pickup_time" },
    { label: "Pickup Date ", accessor: "pickup_date" },
  ];
  
  // Generate CSV report
  const handleGenerateReport = async () => {
    if (!driverId) return;
    
    try {
      let jobsToExport = [];
      
      // If rows are selected, export only selected rows
      if (selectedRows.length > 0) {
        // Filter the current data to only include selected rows
        jobsToExport = (data?.items || []).filter((job: Job) => 
          selectedRows.includes(job.id)
        );
      } else {
        // Otherwise, export all data for the current filters
        const params: Record<string, string | number> = {
          driver_id: driverId,
          page: 1,
          page_size: 1000 // Get all data for export
        };
        
        // Add optional filters
        if (jobIds) params.job_ids = jobIds;
        if (customerName) params.customer_name = customerName;
        if (contractorName) params.contractor_name = contractorName;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        
        const response = await axios.get("/api/reports/driver", { params });
        jobsToExport = response.data.items;
      }
      
      // Transform data for CSV to match the exact column structure
      const csvData = jobsToExport.map((job: any) => ({
        "Date": job.pickup_date || "",
        "Customer Ref. No.": job.booking_ref || "",
        "Time Start": job.pickup_time || "",
        "Time End": job.end_time || "",
        "Description (Line 1)": job.pickup_location || "",
        "Veh Type": job.vehicle_type_name || job.vehicle?.type || "",
        "Veh No.": job.vehicle_number || job.vehicle?.number || "",
        "Driver": job.driver?.name || "",
        "Contact": job.driver?.mobile || "",
        "Flt Land": job.flt_lan_time || "",
        "OTS": job.ots_time || "",
        "POB": job.pob_time || "",
        "JC": job.jc_time || "",
        "Remark": job.customer_remark || ""
      }));
      
      // Generate and download CSV
      const csvContent = toCSV(csvData);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `driver-job-history-${driverId}-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    }
  };
  
  // Calculate total pages
  const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0;
  
  return (
    <div className="w-full flex flex-col gap-4 px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Driver Job History</h1>
          <p className="text-muted-foreground text-sm">
            View and export detailed job history for drivers
          </p>
        </div>
        <Button 
          className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 hover:opacity-90 transition-all mt-4 md:mt-0 w-full md:w-auto"
          onClick={handleGenerateReport}
          disabled={!driverId || isLoading}
        >
          <DownloadIcon className="w-4 h-4" />
          Export Report
        </Button>
      </div>
      
      {/* Filter Card */}
      <Card>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
            {(jobIds || customerName || contractorName || startDate || endDate) && (
              <Button
                onClick={handleClearFilters}
                variant="outline"
                size="sm"
                className="mt-3 md:mt-0 border-red-300 text-red-700 hover:bg-red-50"
              >
                <XIcon className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <div className="space-y-2">
              <label htmlFor="driver" className="block text-sm font-medium">
                Driver
              </label>
              <select
                id="driver"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full bg-background-light border border-border-color text-text-main rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={driversLoading}
              >
                <option value="">Select a driver...</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={String(driver.id)}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="jobIds" className="block text-sm font-medium">
                Job ID (comma separated)
              </label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="jobIds"
                  type="text"
                  value={jobIds}
                  onChange={(e) => setJobIds(e.target.value)}
                  className="w-full bg-background-light border border-border-color text-text-main rounded-lg px-3 py-2 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Job IDs..."
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="customer" className="block text-sm font-medium">
                Customer Name
              </label>
              <input
                id="customer"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-background-light border border-border-color text-text-main rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Customer..."
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="contractor" className="block text-sm font-medium">
                Contractor Name
              </label>
              <input
                id="contractor"
                type="text"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                className="w-full bg-background-light border border-border-color text-text-main rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Contractor..."
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="fromDate" className="block text-sm font-medium">
                From
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="fromDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-background-light border border-border-color text-text-main rounded-lg px-3 py-2 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="toDate" className="block text-sm font-medium">
                To
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="toDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-background-light border border-border-color text-text-main rounded-lg px-3 py-2 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              onClick={handleApplyFilters}
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg px-4 py-2 hover:opacity-90 transition-all"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Results Card */}
      {driverId && (
        <Card>
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold">Job History</h2>
              <div className="flex items-center gap-2">
                <label htmlFor="pageSize" className="text-xs text-text-secondary">Rows per page:</label>
                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-background-light border-border-color text-text-main rounded px-2 py-1 text-xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
            
            <div className="text-sm text-text-secondary mb-4">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data?.total || 0)} of {data?.total || 0}
            </div>
            
            <EntityTable
              columns={columns}
              data={data?.items || []}
              isLoading={isLoading}
              page={page}
              pageSize={pageSize}
              total={data?.total || 0}
              onPageChange={setPage}
              filters={filters}
              onFilterChange={handleFilterChange}
              onSelectionChange={handleSelectionChange}
              disableRowExpansion={true}
            />
          </div>
        </Card>
      )}
      
      {!driverId && (
        <Card>
          <div className="p-8 sm:p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-lg sm:text-xl font-semibold text-text-main mb-2">Select a Driver to View Report</h3>
            <p className="text-text-secondary text-sm sm:text-base">
              Choose a driver from the filters above to view their job history within the selected date range.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}