"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { EntityTable, EntityTableColumn } from "@/components/organisms/EntityTable";
import { Button } from "@/components/ui/button";
import { useGetAllDrivers } from "@/hooks/useDrivers";
import { Job } from "@/types/job";
import { EyeIcon, XIcon, DownloadIcon } from "lucide-react";
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
  const [driverName, setDriverName] = useState<string>("");
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
    queryKey: ["driver-jobs", driverId, jobIds, customerName, contractorName, driverName, startDate, endDate, page, pageSize],
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
      if (driverName) params.driver_name = driverName;
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
    setDriverName("");
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
    { label: "Drop-off Location", accessor: "dropoff_location" },
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
        if (driverName) params.driver_name = driverName;
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
        "Flt Land": job.status === 'otw' ? 'Yes' : 'No',
        "OTS": job.status === 'ots' ? 'Yes' : 'No',
        "POB": job.status === 'pob' ? 'Yes' : 'No',
        "JC": job.status === 'jc' ? 'Yes' : 'No',
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
    <div className="min-h-screen bg-[#0E1621] p-6 font-['Inter']">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
          <Button 
            className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 hover:opacity-90 transition-all"
            onClick={handleGenerateReport}
            disabled={!driverId || isLoading}
          >
            <DownloadIcon className="w-4 h-4" />
            Driver Report
          </Button>
        </div>
        
        {/* Filter Bar */}
        <div className="bg-[#1a2436] rounded-xl p-6 border border-[#2a3a5a] shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Job ID (comma separated)
              </label>
              <input
                type="text"
                value={jobIds}
                onChange={(e) => setJobIds(e.target.value)}
                className="w-full bg-[#0E1621] border border-[#2a3a5a] text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Job IDs..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Customer name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-[#0E1621] border border-[#2a3a5a] text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Customer name..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contractor name
              </label>
              <input
                type="text"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                className="w-full bg-[#0E1621] border border-[#2a3a5a] text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Contractor name..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Driver name
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full bg-[#0E1621] border border-[#2a3a5a] text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Driver name..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#0E1621] border border-[#2a3a5a] text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#0E1621] border border-[#2a3a5a] text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-4">
            <Button
              onClick={handleClearFilters}
              variant="outline"
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 hover:opacity-90 transition-all border-none"
            >
              <XIcon className="w-4 h-4" />
              Clear All
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 hover:opacity-90 transition-all"
            >
              Apply Filters
            </Button>
          </div>
        </div>
        
        {/* Results */}
        {driverId && (
          <div className="bg-[#1a2436] rounded-xl p-6 border border-[#2a3a5a] shadow-lg">
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
              className="bg-[#0E1621] border border-[#2a3a5a]"
              containerClassName="rounded-lg"
              headerClassName="bg-[#1a2436]"
            />
            
            {/* Pagination Controls - Always visible when data is available */}
            <div className="flex justify-between items-center mt-4 px-4 py-3 bg-[#0E1621] rounded-lg border border-[#2a3a5a]">
              <div className="text-sm text-gray-400">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data?.total || 0)} of {data?.total || 0}
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">Rows per page</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1); // Reset to first page when changing page size
                    }}
                    className="bg-[#1a2436] border border-[#2a3a5a] text-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                
                <Button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  variant="outline"
                  className="border-gray-500 text-gray-300 hover:bg-gray-700"
                >
                  ‹ Prev
                </Button>
                
                <div className="text-sm text-gray-400">
                  {page} / {Math.max(1, totalPages)}
                </div>
                
                <Button
                  onClick={() => setPage(prev => Math.min(Math.max(1, totalPages), prev + 1))}
                  disabled={page === Math.max(1, totalPages)}
                  variant="outline"
                  className="border-gray-500 text-gray-300 hover:bg-gray-700"
                >
                  Next ›
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {!driverId && (
          <div className="bg-[#1a2436] rounded-xl p-12 border border-[#2a3a5a] shadow-lg text-center">
            <div className="text-5xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-white mb-2">Select a Driver to View Report</h3>
            <p className="text-gray-400">
              Choose a driver from the dropdown above to view their job history within the selected date range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}