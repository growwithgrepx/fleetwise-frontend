"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, useAnimation } from 'framer-motion';
import { useQuery } from "@tanstack/react-query";
import { getJobs } from "@/services/api/jobsApi";
import type { Job } from "@/types/job";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, Legend, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { HiPlus, HiOutlineDocumentAdd, HiOutlineDocumentReport, HiOutlineCalculator, HiOutlineBell, HiArrowUp, HiArrowDown, HiMinus } from 'react-icons/hi';
import Link from "next/link";
import { useMediaQuery } from 'react-responsive';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon, CalendarIcon, UserGroupIcon, CurrencyDollarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import { Card } from '@/components/atoms/Card';
import DriverCalendarView from '@/components/organisms/DriverCalendarView';
import PriorityDashboard, { PriorityAlert } from '@/components/organisms/PriorityDashboard';
import { useGetAllDrivers } from '@/hooks/useDrivers';
import { TooltipProps } from "@/types/types";

// Extended Job type for timeline visualization
type TimelineJob = Job & {
  startPercent: number;
  endPercent: number;
  width: number;
  statusColor: string;
  isStartingYesterday: boolean;
  isEndingTomorrow: boolean;
  pickupDateTime: Date;
  endDateTime: Date;
  customer: string;
};

// --- Reusable Components ---
const AnimatedKpiNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  React.useEffect(() => {
    const start = 0;
    const end = value;
    if (start === end) return;
    let current = start;
    const increment = end > 0 ? Math.ceil(end / 30) : 1;
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        current = end;
        clearInterval(timer);
      }
      setDisplay(current);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return (
    <span className="text-4xl font-extrabold text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse">
      {display}
    </span>
  );
};

const EmptyState = ({
  message,
  icon,
  action,
}: {
  message: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-start justify-center p-2 text-left">
    <div className="text-gray-400 mb-2">{icon}</div>
    <p className="text-gray-400 text-sm mb-1">{message}</p>
    {action && <div className="mt-1">{action}</div>}
  </div>
);


const ActionButton = ({ children, onClick, variant = 'primary' }: { children: React.ReactNode; onClick: () => void; variant?: 'primary' | 'secondary' }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
      variant === 'primary'
        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
        : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 hover:border-gray-500'
    }`}
  >
    {children}
  </button>
);

const KpiCard = ({
  title,
  value,
  trendData,
  previousValue,
  targetValue,
}: {
  title: string;
  value: number | string;
  trendData: { name: string; value: number }[];
  previousValue?: number;
  targetValue?: number;
}) => {
  const percentageChange =
    previousValue && previousValue > 0
      ? (((value as number) - previousValue) / previousValue) * 100
      : 0;

  const performanceVsTarget =
    targetValue && targetValue > 0 ? ((value as number / targetValue) * 100) : 0;

  return (
    <div className="flex flex-col items-start text-left gap-1">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
        {title}
      </h3>

      <div className="relative flex items-center">
        <span className="text-3xl font-extrabold text-white leading-none">
          <AnimatedKpiNumber value={value as number} />
        </span>

        {percentageChange !== 0 && (
          <div className="ml-2 flex items-center gap-1 max-w-[80px] overflow-hidden text-ellipsis">
            {percentageChange > 0 ? (
              <HiArrowUp className="w-3 h-3 text-green-400" />
            ) : percentageChange < 0 ? (
              <HiArrowDown className="w-3 h-3 text-red-400" />
            ) : (
              <HiMinus className="w-3 h-3 text-gray-400" />
            )}
            <span
              className={`text-xs font-medium ${
                percentageChange > 0
                  ? 'text-green-400'
                  : percentageChange < 0
                  ? 'text-red-400'
                  : 'text-gray-400'
              }`}
            >
              {Math.abs(percentageChange).toFixed(1)}%
            </span>
          </div>
        )}
      </div>


      
      {targetValue !== undefined && (
        <p className="text-xs text-gray-400">
          {performanceVsTarget >= 100
            ? 'Above'
            : performanceVsTarget > 80
            ? 'Near'
            : 'Below'}{' '}
          target {targetValue}
        </p>
      )}
    </div>
  );
};


const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: <HiOutlineDocumentAdd className="w-6 h-6" />, label: 'Create Job', href: '/jobs/create' },
    { icon: <HiOutlineDocumentReport className="w-6 h-6" />, label: 'Bulk Import', href: '/jobs/import' },
    { icon: <HiOutlineCalculator className="w-6 h-6" />, label: 'Generate Invoice', href: '/billing/generate' },
    { icon: <HiOutlineBell className="w-6 h-6" />, label: 'Send Notification', href: '/notifications/create' },
  ];

  return (
    <div className="fixed bottom-32 right-6">
      {isOpen && (
        <div className="flex flex-col items-center gap-4 mb-4">
          {actions.map((action, index) => (
            <Link href={action.href} key={index}>
              <div className="bg-primary hover:bg-primary-hover text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer" title={action.label}>
                {action.icon}
              </div>
            </Link>
          ))}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-accent hover:bg-accent-hover text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg focus:outline-none"
      >
        <HiPlus className={`w-8 h-8 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
      </button>
    </div>
  );
};

// --- Status/Service/Payment Mappings ---
const STATUS_LABELS = {
  new: 'New',
  pending: 'Pending',
  confirmed: 'Confirmed',
  otw: 'On The Way',
  ots: 'On The Scene',
  pob: 'Passenger On Board',
  jc: 'Completed',
  sd: 'Completed',
  canceled: 'Canceled',
};

const SERVICE_LABELS = {
  'Airport Transfer': 'Airport Transfer',
  'Corporate Charter': 'Corporate Charter',
  'VIP Charter': 'VIP Charter',
  'Staff Shuttle': 'Staff Shuttle',
  'Event Charter': 'Event Charter',
};

const PAYMENT_LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  overdue: 'Overdue',
};

const STATUS_COLORS: { [key: string]: string } = {
  canceled: '#a1a1aa',
  completed: '#22c55e',
  'on the scene': '#6366f1',
  'on the way': '#3b82f6',
  pending: '#fbbf24',
  confirmed: '#06b6d4',
  pob: '#f59e42',
  jc: '#16a34a',
  sd: '#f472b6',
  new: '#818cf8',
  other: '#64748b',
  default: '#64748b',
};

export default function DashboardPage() {
  const router = useRouter();

  // --- Data Fetching ---
  const { data: jobsResponse, isLoading: jobsLoading, isError: jobsError } = useQuery({
    queryKey: ["jobs", "dashboard"],
    queryFn: () => {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      return getJobs({ pickup_date_start: startDate.toISOString().split('T')[0] });
    },
    select: (data) => data ?? { items: [], total: 0 },
  });
  const jobs = useMemo(() => jobsResponse?.items ?? [], [jobsResponse]);

  const { data: driversData, isLoading: driversLoading } = useGetAllDrivers();

  // --- Data Processing for KPIs ---
  const kpiStats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(todayStart.getDate() + 1);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);
    
    const getStatsForDay = (dayStart: Date, dayEnd: Date) => {
      const dayJobs = jobs.filter(j => {
        const pickupDate = new Date(j.pickup_date + 'T00:00:00');
        return pickupDate >= dayStart && pickupDate < dayEnd;
      });
      const scheduled = dayJobs.filter(j => ['new', 'pending', 'confirmed'].includes((j.status || '').toLowerCase())).length;
      const completed = dayJobs.filter(j => ['jc', 'sd'].includes((j.status || '').toLowerCase())).length;
      const unassigned = dayJobs.filter(j => ['new', 'pending', 'confirmed'].includes((j.status || '').toLowerCase()) && !j.driver_id).length;
      return { scheduled, completed, unassigned };
    };
    
    const todayStats = getStatsForDay(todayStart, tomorrowStart);
    const yesterdayStats = getStatsForDay(yesterdayStart, todayStart);
    const inProgress = jobs.filter(j => ['otw', 'ots', 'pob'].includes((j.status || '').toLowerCase())).length;
    const pendingInvoices = jobs.filter(j => !j.invoice_id).length;
    
    return {
      todaysScheduled: { value: todayStats.scheduled, trendData: [{ name: 'Yesterday', value: yesterdayStats.scheduled }, { name: 'Today', value: todayStats.scheduled }] },
      inProgress: { value: inProgress, trendData: [{ name: 'Yesterday', value: inProgress }, { name: 'Today', value: inProgress }] },
      jobsCompleted: { value: todayStats.completed, trendData: [{ name: 'Yesterday', value: yesterdayStats.completed }, { name: 'Today', value: todayStats.completed }] },
      unassignedJobs: { value: todayStats.unassigned, trendData: [{ name: 'Yesterday', value: yesterdayStats.unassigned }, { name: 'Today', value: todayStats.unassigned }] },
      pendingInvoices: { value: pendingInvoices, trendData: [{ name: 'Yesterday', value: 0 }, { name: 'Today', value: pendingInvoices }] },
    };
  }, [jobs]);

  // --- Data Processing for Charts ---
  const jobStatusData = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    const statusCounts: Job = jobs.reduce((acc: any, job: any) => {
      const raw = (job.status || 'Unknown').toLowerCase();
      const label = (STATUS_LABELS as any)[raw] || raw.charAt(0).toUpperCase() + raw.slice(1);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    
    const entries = Object.entries(statusCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number));
    
    if (entries.length > 6) {
      const main = entries.slice(0, 5);
      const other = entries.slice(5).reduce((sum, e: any) => sum + e.value, 0);
      return [...main, { name: 'Other', value: other }];
    }
    return entries;
  }, [jobs]);

  const serviceTypeData = useMemo(() => {
    const KNOWN_SERVICE_TYPES = Object.keys(SERVICE_LABELS);
    if (!jobs || jobs.length === 0) return KNOWN_SERVICE_TYPES.map(name => ({ name: (SERVICE_LABELS as any)[name], value: 0 }));
    const serviceCounts: any = jobs.reduce((acc: any, job: any) => {
      const raw = job.service_type || 'Unknown';
      const label = (SERVICE_LABELS as any)[raw] || raw;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    return KNOWN_SERVICE_TYPES.map(name => ({ 
      name: (SERVICE_LABELS as any)[name], 
      value: serviceCounts[(SERVICE_LABELS as any)[name]] || 0 
    }));
  }, [jobs]);

  // --- Enhanced Exception Alerts for Priority Dashboard ---
  const priorityAlerts: PriorityAlert[] = useMemo(() => {
    const now = new Date();
    const soonThreshold = 30;
    const alerts: PriorityAlert[] = [];
    
    jobs.forEach(job => {
      const status = (job.status || '').toLowerCase();
      const pickupDateTime = new Date(`${job.pickup_date}T${job.pickup_time}`);
      const minutesToPickup = (pickupDateTime.getTime() - now.getTime()) / 60000;
      
      if (["new","pending","confirmed"].includes(status) && pickupDateTime < now) {
        alerts.push({
          text: `Job #${job.id} is overdue`,
          link: `/jobs/${job.id}`,
          severity: 'critical',
          driverName: undefined,
          driverId: job.driver_id,
        });
      }
      
      if (["new","pending","confirmed"].includes(status) && !job.driver_id && pickupDateTime < now) {
        alerts.push({
          text: `Job #${job.id} is overdue and unassigned`,
          link: `/jobs/${job.id}`,
          severity: 'critical',
          driverName: undefined,
          driverId: undefined,
        });
      }
      
      if (["new","pending","confirmed"].includes(status) && !job.driver_id && pickupDateTime >= now && minutesToPickup < soonThreshold && minutesToPickup > 0) {
        alerts.push({
          text: `Job #${job.id} starts in ${Math.round(minutesToPickup)} min and is unassigned`,
          link: `/jobs/${job.id}`,
          severity: 'warning',
          driverName: undefined,
          driverId: undefined,
        });
      }
    });
    return alerts;
  }, [jobs]);

  const UPCOMING_STATUSES = ['new', 'pending', 'confirmed', 'otw', 'ots', 'pob'];

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Process jobs for the horizontal timeline
  const todayJobsData = useMemo((): TimelineJob[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayJobs = jobs.filter(job => {
      if (!job.pickup_date || !job.pickup_time) return false;
      const pickupDate = new Date(job.pickup_date);
      return pickupDate >= today && pickupDate < tomorrow;
    });
    
    return todayJobs.map(job => {
      const pickupDateTime = new Date(`${job.pickup_date}T${job.pickup_time}`);
      const durationHours = job.estimated_duration ? parseFloat(job.estimated_duration) : 1;
      const endDateTime = new Date(pickupDateTime.getTime() + durationHours * 60 * 60 * 1000);
      
      const isStartingYesterday = pickupDateTime < today;
      const isEndingTomorrow = endDateTime >= tomorrow;
      
      const startPercent = isStartingYesterday ? 0 : 
        ((pickupDateTime.getHours() * 60 + pickupDateTime.getMinutes()) / (24 * 60)) * 100;
      
      const endPercent = isEndingTomorrow ? 100 :
        ((endDateTime.getHours() * 60 + endDateTime.getMinutes()) / (24 * 60)) * 100;
      
      const status = (job.status || '').toLowerCase();
      let statusColor;
      
      if (['jc', 'sd'].includes(status)) {
        statusColor = '#22c55e';
      } else if (['otw', 'ots', 'pob'].includes(status)) {
        statusColor = '#f59e42';
      } else if (pickupDateTime < now && !['jc', 'sd', 'canceled'].includes(status)) {
        statusColor = '#ef4444';
      } else {
        statusColor = '#3b82f6';
      }
      
      return {
        ...job,
        id: job.id,
        startPercent,
        endPercent,
        width: endPercent - startPercent,
        statusColor,
        isStartingYesterday,
        isEndingTomorrow,
        pickupDateTime,
        endDateTime,
        customer: job.customer?.name || job.passenger_name || 'Unknown',
      };
    });
  }, [jobs]);

  // Current time indicator position
  const currentTimePercent = useMemo(() => {
    const now = new Date();
    return ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;
  }, []);

  // Filtered jobs
  const filteredJobs = useMemo((): TimelineJob[] => {
    return todayJobsData.filter(job => {
      if (statusFilter === "scheduled" && !['new', 'pending', 'confirmed'].includes((job.status || '').toLowerCase())) return false;
      if (statusFilter === "in-progress" && !['otw', 'ots', 'pob'].includes((job.status || '').toLowerCase())) return false;
      if (statusFilter === "completed" && !['jc', 'sd'].includes((job.status || '').toLowerCase())) return false;
      if (statusFilter === "delayed" && (job.pickupDateTime >= new Date() || ['jc', 'sd', 'canceled'].includes((job.status || '').toLowerCase()))) return false;
      
      if (vehicleFilter !== "all" && job.vehicle_type !== vehicleFilter) return false;
      
      if (priorityFilter !== "all") {
        const isHighPriority = job.service_type?.includes("VIP") || false;
        if (priorityFilter === "high" && !isHighPriority) return false;
        if (priorityFilter === "normal" && isHighPriority) return false;
      }
      
      return true;
    });
  }, [todayJobsData, statusFilter, vehicleFilter, priorityFilter]);

  // Group jobs by their vertical position to prevent overlapping
  const jobRows = useMemo((): TimelineJob[][] => {
    const rows: TimelineJob[][] = [];
    const sortedJobs = [...filteredJobs].sort((a, b) => a.startPercent - b.startPercent);
    
    sortedJobs.forEach(job => {
      let placed = false;
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const lastJob = row[row.length - 1];
        
        if (job.startPercent >= lastJob.endPercent) {
          row.push(job);
          placed = true;
          break;
        }
      }
      
      if (!placed) {
        rows.push([job]);
      }
    });
    
    return rows;
  }, [filteredJobs]);

  // Average Trip Duration data
  const avgTripDurationData = useMemo(() => {
    const completedJobs = jobs.filter(j => ['jc', 'sd'].includes((j.status || '').toLowerCase()) && j.pickup_date && j.pickup_time && j.updated_at);
    if (completedJobs.length === 0) return { avg: 0, target: 45 };
    
    const totalDuration = completedJobs.reduce((acc, job) => {
      const startTime = new Date(`${job.pickup_date}T${job.pickup_time}`);
      const endTime = new Date(job.updated_at);
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      return acc + (durationMinutes > 0 ? durationMinutes : 0);
    }, 0);
    
    return {
      avg: totalDuration / completedJobs.length,
      target: 45,
    };
  }, [jobs]);

  // Revenue analytics data
  const revenueByDay = useMemo(() => {
    if (!jobs) return [];
    const map: Record<string, { date: string; revenue: number; paid: number; pending: number; overdue: number }> = {};
    
    jobs.forEach(job => {
      if (!job.pickup_date || !job.final_price) return;
      const date = job.pickup_date;
      if (!map[date]) map[date] = { date, revenue: 0, paid: 0, pending: 0, overdue: 0 };
      map[date].revenue += job.final_price;
      map[date].pending += job.final_price;
    });
    
    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
  }, [jobs]);

  // Revenue metrics
  const totalRevenue = useMemo(() => jobs ? jobs.reduce((sum, j) => sum + (j.final_price || 0), 0) : 0, [jobs]);
  const paidRevenue = 0;
  const pendingRevenue = totalRevenue;
  const overdueRevenue = 0;

  // Invoice status data for pie chart
  const invoiceStatusData = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    const completedJobs = jobs.filter(j => ['jc', 'sd'].includes((j.status || '').toLowerCase())).length;
    const activeJobs = jobs.filter(j => ['new', 'pending', 'confirmed', 'otw', 'ots', 'pob'].includes((j.status || '').toLowerCase())).length;
    const canceledJobs = jobs.filter(j => ['canceled'].includes((j.status || '').toLowerCase())).length;

    return [
      { name: 'Completed', value: completedJobs },
      { name: 'Active', value: activeJobs },
      { name: 'Canceled', value: canceledJobs },
    ];
  }, [jobs]);

  const [now, setNow] = useState<Date>(new Date());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const lastUpdatedRef = useRef<Date | null>(null);

  useEffect(() => {
    if (jobsResponse) {
      const updateTime = new Date();
      setLastUpdated(updateTime);
      lastUpdatedRef.current = updateTime;
    }
  }, [jobsResponse]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  function getTimeAgoString(date: Date | null) {
    if (!date) return '';
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `Updated just now`;
    if (diff < 3600) return `Updated ${Math.floor(diff / 60)} min ago`;
    return `Updated ${Math.floor(diff / 3600)} hr ago`;
  }

  const isMobile = useMediaQuery({ maxWidth: 640 });

  const filteredServiceTypeData = serviceTypeData.filter(item => item.value > 0);

  const filteredJobStatusData = (() => {
    if (!jobStatusData.length) return [];
    const main = jobStatusData.filter(s => (s.value as number) > 0);
    if (main.length > 6) {
      const top = main.slice(0, 5);
      const other = main.slice(5).reduce((sum, e) => sum + (e.value as number), 0);
      return [...top, { name: 'Other', value: other }];
    }
    return main;
  })();

  const showAvgTripDuration = avgTripDurationData.avg > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 text-white">
      <div className="w-full px-2 sm:px-4 lg:px-0 py-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-blue-400 text-center mb-10 drop-shadow-[0_0_16px_rgba(59,130,246,0.7)] shimmer-effect">
          FleetOps Command Center
        </h1>
        <style jsx global>{`
          .shimmer-effect {
            background: linear-gradient(90deg, #3b82f6 25%, #60a5fa 50%, #3b82f6 75%);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 2s infinite linear;
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>

        <div className="flex items-center gap-2 mb-4 pr-8 pl-8">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm text-gray-300 font-medium">{getTimeAgoString(lastUpdated)}</span>
        </div>

        {/* Top KPI Ribbon */}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8 px-8 w-full">
          {jobsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-background-light mx-2" />
            ))
          ) : jobsError ? (
            <Card className="col-span-5 text-center text-red-400 mx-2">Failed to load data.</Card>
          ) : (
            <>
              <div className="mx-2"><PriorityDashboard alerts={priorityAlerts} /></div>
              <Card className="flex flex-col justify-center p-5 md:p-6 min-h-[8rem] shadow-xl border border-gray-700 bg-gradient-to-br from-background-light to-background-dark hover:shadow-2xl transition-all duration-300 mx-2">
                {kpiStats.inProgress.value === 0 ? (
                  <EmptyState
                    message="No jobs in progress today"
                    icon={<CalendarIcon className="w-6 h-6" />}
                  />
                ) : (
                  <KpiCard title="Jobs In Progress" value={kpiStats.inProgress.value} trendData={kpiStats.inProgress.trendData} previousValue={kpiStats.inProgress.trendData[0]?.value} targetValue={0} />
                )}
              </Card>
              <Card className="flex flex-col items-center justify-center p-6 shadow-xl border border-gray-700 bg-gradient-to-br from-background-light to-background-dark hover:shadow-2xl transition-all duration-300 mx-2">
                {kpiStats.jobsCompleted.value === 0 ? (
                  <EmptyState
                    message="No jobs completed today"
                    icon={<CheckCircleIcon className="w-6 h-6" />}
                  />
                ) : (
                  <KpiCard title="Jobs Completed" value={kpiStats.jobsCompleted.value} trendData={kpiStats.jobsCompleted.trendData} previousValue={kpiStats.jobsCompleted.trendData[0]?.value} targetValue={kpiStats.todaysScheduled.value} />
                )}
              </Card>
              <Card className="flex flex-col items-center justify-center p-6 shadow-xl border border-gray-700 bg-gradient-to-br from-background-light to-background-dark hover:shadow-2xl transition-all duration-300 mx-2">
                {kpiStats.unassignedJobs.value === 0 ? (
                  <EmptyState
                    message="No unassigned jobs"
                    icon={<UserGroupIcon className="w-6 h-6" />}
                  />
                ) : (
                  <KpiCard title="Unassigned Jobs" value={kpiStats.unassignedJobs.value} trendData={kpiStats.unassignedJobs.trendData} previousValue={kpiStats.unassignedJobs.trendData[0]?.value} targetValue={0} />
                )}
              </Card>
              <Card className="flex flex-col items-center justify-center p-6 shadow-xl border border-gray-700 bg-gradient-to-br from-background-light to-background-dark hover:shadow-2xl transition-all duration-300 mx-2">
                {kpiStats.pendingInvoices.value === 0 ? (
                  <EmptyState
                    message="No pending invoices"
                    icon={<CurrencyDollarIcon className="w-6 h-6" />}
                  />
                ) : (
                  <KpiCard title="Pending Invoices" value={kpiStats.pendingInvoices.value} trendData={kpiStats.pendingInvoices.trendData} previousValue={kpiStats.pendingInvoices.trendData[0]?.value} targetValue={0} />
                )}
              </Card>
            </>
          )}
        </div>

        {/* TODAY'S JOBS TIMELINE (FULL WIDTH) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16 w-full"
        >
          <div className="lg:col-span-3 flex flex-col pr-8 pl-8">
            <Card className="p-8 shadow-2xl border border-gray-700 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm min-h-[32rem] flex flex-col overflow-visible">
              {/* Header with title and filters */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-1 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-white">Today&apos;s Jobs Timeline</h2>
                  <span className="px-3 py-1 bg-blue-600/20 text-blue-300 text-sm font-medium rounded-full border border-blue-600/30">
                    {filteredJobs.length} jobs
                  </span>
                </div>
                
                {/* Enhanced Filter buttons */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex gap-2">
                    {[
                      { key: 'all', label: 'All Status', count: todayJobsData.length },
                      { key: 'scheduled', label: 'Scheduled', count: todayJobsData.filter(j => ['new', 'pending', 'confirmed'].includes((j.status || '').toLowerCase())).length },
                      { key: 'in-progress', label: 'In Progress', count: todayJobsData.filter(j => ['otw', 'ots', 'pob'].includes((j.status || '').toLowerCase())).length },
                      { key: 'completed', label: 'Completed', count: todayJobsData.filter(j => ['jc', 'sd'].includes((j.status || '').toLowerCase())).length },
                      { key: 'delayed', label: 'Delayed', count: todayJobsData.filter(j => j.pickupDateTime < new Date() && !['jc', 'sd', 'canceled'].includes((j.status || '').toLowerCase())).length }
                    ].map(({ key, label, count }) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`px-4 py-2 text-sm font-medium rounded-xl border transition-all duration-300 ${
                          statusFilter === key
                            ? 'bg-blue-600/90 border-blue-500/60 text-white shadow-lg shadow-blue-600/25'
                            : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700/80 hover:border-slate-600/60'
                        }`}
                        onClick={() => setStatusFilter(key)}
                      >
                        {label}
                        {count > 0 && (
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                            statusFilter === key ? 'bg-white/20' : 'bg-slate-700/60'
                          }`}>
                            {count}
                          </span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Timeline container - Fixed height, no scrollbar with extra padding for tooltips */}
              <div className="flex-1 overflow-visible bg-slate-900/40 rounded-2xl border border-slate-700/50 backdrop-blur-sm mx-[-2rem] px-[2rem]">
                {todayJobsData.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-full text-slate-400"
                  >
                    <CalendarIcon className="w-20 h-20 mb-6 opacity-40" />
                    <p className="text-xl font-medium mb-2">No jobs scheduled today</p>
                    <p className="text-sm opacity-75">Schedule jobs to see them on the timeline</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                      onClick={() => router.push('/jobs/create')}
                    >
                      Schedule New Job
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="flex flex-col h-full p-6 pt-12">
                    {/* Timeline header with hours */}
                    <div className="relative h-12 border-b border-slate-700/60 mb-6">
                      {/* Hour markers */}
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="absolute top-0 flex flex-col items-center"
                          style={{ left: `${(i / 24) * 100}%` }}
                        >
                          <div className="h-3 w-px bg-slate-600"></div>
                          <span className="text-xs text-slate-300 font-semibold mt-2">
                            {i.toString().padStart(2, '0')}:00
                          </span>
                        </div>
                      ))}
                      
                      {/* Half-hour markers */}
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="absolute top-0 flex flex-col items-center"
                          style={{ left: `${((i + 0.5) / 24) * 100}%` }}
                        >
                          <div className="h-2 w-px bg-slate-700/60"></div>
                          <span className="text-[10px] text-slate-500 mt-2">30</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Timeline body with grid and jobs - Fixed height, no scroll, extra space for tooltips */}
                    <div className="relative flex-1 overflow-visible pb-20">
                      {/* Vertical grid lines */}
                      <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: 49 }).map((_, i) => (
                          <div 
                            key={i}
                            className="absolute top-0 bottom-0 w-px bg-slate-800/50"
                            style={{ left: `${(i / 48) * 100}%` }}
                          />
                        ))}
                      </div>
                      
                      {/* Current time indicator */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 shadow-lg shadow-red-500/50"
                        style={{ left: `${currentTimePercent}%` }}
                      >
                        <div className="absolute -top-1 -translate-x-1/2 w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50 animate-pulse"></div>
                        <div className="absolute top-4 -translate-x-1/2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded shadow-lg whitespace-nowrap">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </motion.div>
                      
                      {/* Job rows - Compact layout */}
                      <div className="relative pt-12 pb-6 h-full">
                        {jobRows.length > 0 ? (
                          jobRows.slice(0, Math.floor((300 - 120) / 64)).map((row, rowIndex) => (
                            <div key={rowIndex} className="relative h-16 mb-3">
                              {row.map((job, jobIndex) => {
                                // Calculate tooltip position based on job position
                                const jobLeft = job.startPercent;
                                const jobWidth = Math.max(job.width, 4);
                                const jobCenter = jobLeft + (jobWidth / 2);

                                return (
                                  <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: jobIndex * 0.1 }}
                                    whileHover={{ 
                                      scale: 1.05, 
                                      zIndex: 50,
                                      transition: { duration: 0.2 }
                                    }}
                                    className="absolute top-0 h-14 rounded-xl shadow-lg border border-gray-600/60 transition-all duration-300 hover:shadow-xl group cursor-pointer backdrop-blur-sm"
                                    style={{
                                      left: `${job.startPercent}%`,
                                      width: `${Math.max(job.width, 4)}%`,
                                      minWidth: '80px',
                                      background: `linear-gradient(135deg, ${job.statusColor}E6, ${job.statusColor}CC)`,
                                      borderColor: `${job.statusColor}80`,
                                    }}
                                    onClick={() => router.push(`/jobs/${job.id}`)}
                                  >
                                    {/* Left overflow indicator */}
                                    {job.isStartingYesterday && (
                                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-white/90">
                                        <ChevronLeftIcon className="h-4 w-4" />
                                      </div>
                                    )}
                                    
                                    {/* Right overflow indicator */}
                                    {job.isEndingTomorrow && (
                                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-white/90">
                                        <ChevronRightIcon className="h-4 w-4" />
                                      </div>
                                    )}
                                    
                                    {/* Job content */}
                                    <div className="px-3 py-2 h-full flex flex-col justify-center overflow-hidden">
                                      <div className="text-sm font-bold text-white truncate leading-tight">
                                        #{job.id} • {job.service_type}
                                      </div>
                                      <div className="text-xs text-white/90 truncate mt-0.5">
                                        {job.customer}
                                      </div>
                                    </div>
                                    
                                    {/* Enhanced Tooltip with smart positioning - Always visible */}
                                    <div className="absolute z-50 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:translate-y-0 translate-y-2">
                                      <div 
                                        className="bg-slate-900/95 backdrop-blur-md text-white text-sm p-4 rounded-xl shadow-2xl border border-slate-700/60 w-80"
                                        style={{
                                          position: 'absolute',
                                          top: '-16px',
                                          left: jobCenter < 30 ? '0px' : jobCenter > 70 ? '-320px' : '-160px',
                                          transform: 'translateY(-100%)',
                                        }}
                                      >
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="font-bold text-blue-300">Job #{job.id}</div>
                                          <div 
                                            className="px-2 py-1 rounded-lg text-xs font-medium"
                                            style={{ backgroundColor: `${job.statusColor}40`, color: job.statusColor }}
                                          >
                                            {(STATUS_LABELS as any)[job.status] || job.status}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                                          <div className="text-slate-400">Customer:</div>
                                          <div className="font-medium truncate">{job.customer}</div>
                                          <div className="text-slate-400">Service:</div>
                                          <div className="truncate">{job.service_type}</div>
                                          <div className="text-slate-400">Time:</div>
                                          <div className="font-mono">
                                            {job.pickupDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {' → '}
                                            {job.endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </div>
                                          <div className="text-slate-400">From:</div>
                                          <div className="truncate text-xs">{job.pickup_location || 'Not specified'}</div>
                                          <div className="text-slate-400">To:</div>
                                          <div className="truncate text-xs">{job.dropoff_location || 'Not specified'}</div>
                                          {job.driver_id && (
                                            <>
                                              <div className="text-slate-400">Driver:</div>
                                              <div className="truncate">Assigned</div>
                                            </>
                                          )}
                                        </div>
                                        <div className="mt-3 pt-2 border-t border-slate-700/60 text-xs text-slate-400">
                                          Click to view details
                                        </div>
                                        {/* Tooltip arrow */}
                                        <div 
                                          className="absolute top-full w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-700/60"
                                          style={{
                                            left: jobCenter < 30 ? '20px' : jobCenter > 70 ? '300px' : '50%',
                                            transform: jobCenter >= 30 && jobCenter <= 70 ? 'translateX(-50%)' : 'none',
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </div>
                          ))
                        ) : null}
                        
                        {/* Empty state for filtered results */}
                        {jobRows.length === 0 && filteredJobs.length === 0 && todayJobsData.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-40 text-slate-400"
                          >
                            <div className="w-12 h-12 mb-3 opacity-40">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                              </svg>
                            </div>
                            <p className="text-lg font-medium">No jobs match current filters</p>
                            <p className="text-sm opacity-75">Try adjusting your filter settings</p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    {/* Enhanced Timeline legend */}
                    <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-700/60">
                      {[
                        { color: '#3b82f6', label: 'Scheduled' },
                        { color: '#f59e42', label: 'In Progress' },
                        { color: '#22c55e', label: 'Completed' },
                        { color: '#ef4444', label: 'Delayed' }
                      ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm shadow-sm" style={{ backgroundColor: color }}></div>
                          <span className="text-xs text-slate-300 font-medium">{label}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-700/60">
                        <div className="w-px h-3 bg-red-500 shadow-sm"></div>
                        <span className="text-xs text-slate-300 font-medium">Current Time</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </motion.div>

        {/* DRIVER CALENDAR VIEW (FULL WIDTH) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 w-full"
        >
          <div className="lg:col-span-3 pr-8 pl-8">
            <DriverCalendarView days={2} />
          </div>
        </motion.div>

        {/* REVENUE INTELLIGENCE (FULL WIDTH) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 w-full"
        >
          <div className="lg:col-span-3 flex flex-col pr-8 pl-8">
            <Card className="p-6 shadow-xl border border-gray-700 bg-gradient-to-br from-background-light to-background-dark h-full flex flex-col justify-between">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Revenue Intelligence</h2>
                <ActionButton onClick={() => router.push('/jobs')} variant="secondary">View All</ActionButton>
              </div>
              <div className="flex flex-col h-full">
                {/* KPI Metrics */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="text-center p-3 bg-background-light rounded-lg border border-gray-600">
                    <div className="text-2xl font-bold text-green-400">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</div>
                    <div className="text-sm text-gray-400">Total Revenue</div>
                  </div>
                  <div className="text-center p-3 bg-background-light rounded-lg border border-gray-600">
                    <div className="text-2xl font-bold text-blue-400">${paidRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</div>
                    <div className="text-sm text-gray-400">Paid</div>
                  </div>
                  <div className="text-center p-3 bg-background-light rounded-lg border border-gray-600">
                    <div className="text-2xl font-bold text-orange-400">${pendingRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</div>
                    <div className="text-sm text-gray-400">Pending</div>
                  </div>
                  <div className="text-center p-3 bg-background-light rounded-lg border border-gray-600">
                    <div className="text-2xl font-bold text-red-400">${overdueRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</div>
                    <div className="text-sm text-gray-400">Overdue</div>
                  </div>
                </div>
                
                {/* Charts Row */}
                <div className="flex gap-4 flex-1">
                  {/* Revenue Trend Chart */}
                  <div className="flex-1 bg-background-light rounded-lg p-4 border border-gray-600">
                    <h4 className="text-sm font-semibold text-white mb-3">Revenue Trend (14d)</h4>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={revenueByDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#9CA3AF"
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('en-US', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: '2-digit' 
                            });
                          }}
                        />
                        <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 'dataMax + 100']} />
                        <Bar dataKey="revenue" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Payment Status Chart */}
                  <div className="w-48 bg-background-light rounded-lg p-4 border border-gray-600">
                    <h4 className="text-sm font-semibold text-white mb-3">Payment Status</h4>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={invoiceStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {invoiceStatusData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                entry.name === 'Completed' ? '#4ade80' :
                                entry.name === 'Active' ? '#93c5fd' :
                                entry.name === 'Canceled' ? '#fca5a5' :
                                '#d1d5db'
                              } 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1f2937', 
                            border: '1px solid #374151',
                            borderRadius: '8px',
                            color: '#f9fafb'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1 mt-2">
                      {invoiceStatusData.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div 
                            className="w-3 h-3 rounded-sm" 
                            style={{ 
                              backgroundColor: 
                                item.name === 'Completed' ? '#4ade80' :
                                item.name === 'Active' ? '#93c5fd' :
                                item.name === 'Canceled' ? '#fca5a5' :
                                '#d1d5db'
                            }}
                          />
                          <span className="text-gray-300">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* Floating Quick Actions */}
        <FloatingActionButton />
      </div>
    </div>
  );
}
