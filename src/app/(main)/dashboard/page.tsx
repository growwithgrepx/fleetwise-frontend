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
import { CheckCircleIcon, CalendarIcon, UserGroupIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

import { Card } from '@/components/atoms/Card';

import PriorityDashboard, { PriorityAlert } from '@/components/organisms/PriorityDashboard';
import JobMonitoringAlertsPanel from '@/components/organisms/JobMonitoringAlertsPanel';
import { useGetAllDrivers } from '@/hooks/useDrivers';
import { TooltipProps } from "@/types/types";
import { getDisplayTimezone } from "@/utils/timezoneUtils";
import { useJobMonitoring } from "@/hooks/useJobMonitoring";
import { getAlertSettings } from "@/services/api/settingsApi";
import { getDriverLeaves } from '@/services/api/driverLeaveApi';
import type { DriverLeave } from '@/types/driverLeave';

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
  verticalOffset: number;
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
    { icon: <HiOutlineDocumentAdd className="w-6 h-6" />, label: 'Create Job', href: '/jobs/new' },
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
      // Get current date in user's display timezone
      const userTimezone = getDisplayTimezone();
      const nowInUserTz = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
      const dateStr = nowInUserTz.toISOString().split('T')[0];
      
      console.log('[Dashboard] Current UTC time:', new Date().toISOString());
      console.log('[Dashboard] User timezone:', userTimezone);
      console.log('[Dashboard] Current date in user timezone:', dateStr);
      
      return getJobs({ pickup_date: dateStr });
    },
    select: (data) => {
      console.log('[Dashboard] Jobs response received:', data);
      console.log('[Dashboard] Jobs response items:', data?.items);
      console.log('[Dashboard] Jobs response total:', data?.total);
      return data ?? { items: [], total: 0 };
    },
  });
  const jobs = useMemo(() => {
    const result = jobsResponse?.items ?? [];
    console.log('[Dashboard] Jobs loaded:', result.length, 'jobs');
    console.log('[Dashboard] Jobs data:', result);
    return result;
  }, [jobsResponse]);

  // --- Alert System Integration ---
  const { alerts: monitoringAlerts, isLoading: alertsLoading, error: alertsError } = useJobMonitoring();
  const { data: alertSettingsData } = useQuery({
    queryKey: ['alert-settings'],
    queryFn: getAlertSettings,
  });
  
  // Debug logging for alerts
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Dashboard] monitoringAlerts:', monitoringAlerts);
      console.log('[Dashboard] alertsLoading:', alertsLoading);
      console.log('[Dashboard] alertsError:', alertsError);
      if (monitoringAlerts) {
        console.log('[Dashboard] Alert count:', monitoringAlerts.length);
        console.log('[Dashboard] Dismissed alerts:', monitoringAlerts.filter(a => a.dismissed).length);
        console.log('[Dashboard] Active alerts:', monitoringAlerts.filter(a => !a.dismissed).length);
      }
    }
  }, [monitoringAlerts, alertsLoading, alertsError]);

  const pickupThreshold = alertSettingsData?.alert_settings?.pickup_threshold_minutes ?? 15;

  // Convert server-side alerts to priority alerts format
  const priorityAlerts: PriorityAlert[] = useMemo(() => {
    if (!monitoringAlerts || monitoringAlerts.length === 0) return [];
    return monitoringAlerts
      .filter(alert => !alert.dismissed)
      .map(alert => ({
        text: `Job #${alert.jobId}`,
        link: `/jobs/${alert.jobId}`,
        severity: alert.elapsedTime > 0 ? 'critical' : 'warning',
        driverName: alert.driverName && alert.driverName !== 'Unassigned'
          ? alert.driverName
          : (alert.jobData?.driver?.name || 'Unassigned'),
        driverId: alert.jobData?.driver?.id,
      }));
  }, [monitoringAlerts]);
  
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
      const inProgress = dayJobs.filter(j => ['otw', 'ots', 'pob'].includes((j.status || '').toLowerCase())).length;
      return { scheduled, completed, unassigned, inProgress };
    };
    
    const todayStats = getStatsForDay(todayStart, tomorrowStart);
    const yesterdayStats = getStatsForDay(yesterdayStart, todayStart);
    
    // For in-progress jobs, include jobs that are actively in progress regardless of pickup date
    // (a job that started yesterday but still in progress should count)
    const allInProgress = jobs.filter(j => ['otw', 'ots', 'pob'].includes((j.status || '').toLowerCase())).length;
    
    // Pending invoices should only count COMPLETED jobs that don't have an invoice yet
    // Jobs that are new/pending/in-progress shouldn't have invoices yet, so they shouldn't count
    const pendingInvoices = jobs.filter(j => 
      ['jc', 'sd'].includes((j.status || '').toLowerCase()) && !j.invoice_id
    ).length;
    
    return {
      todaysScheduled: { value: todayStats.scheduled, trendData: [{ name: 'Yesterday', value: yesterdayStats.scheduled }, { name: 'Today', value: todayStats.scheduled }] },
      inProgress: { value: allInProgress, trendData: [{ name: 'Yesterday', value: allInProgress }, { name: 'Today', value: allInProgress }] },
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

  // DEPRECATED: Old client-side alert logic removed to prevent duplicate priorityAlerts definition
  // Server-side alerts are now used for both Priority Dashboard and Active Monitoring Alerts

  const UPCOMING_STATUSES = ['new', 'pending', 'confirmed', 'otw', 'ots', 'pob'];

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Process jobs for the horizontal timeline
  const todayJobsData = useMemo((): TimelineJob[] => {
    const userTimezone = getDisplayTimezone();
    
    // Get selected date in user's timezone
    const selectedDateInUserTz = new Date(selectedDate.toLocaleString('en-US', {
      timeZone: userTimezone
    }));
    const today = new Date(selectedDateInUserTz.getFullYear(), selectedDateInUserTz.getMonth(), selectedDateInUserTz.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Debug: Log current timezone info
    if (process.env.NODE_ENV === 'development') {
      console.log('=== TIMELINE DATE FILTERING DEBUG ===');
      console.log(`System time: ${new Date().toISOString()}`);
      console.log(`User timezone: ${userTimezone}`);
      console.log(`Today in user timezone: ${today.toISOString()}`);
      console.log(`Tomorrow in user timezone: ${tomorrow.toISOString()}`);
      console.log(`Total jobs from API: ${jobs.length}`);
    }
    
    const todayJobs = jobs.filter(job => {
      if (!job.pickup_date || !job.pickup_time) return false;
      
      // Parse job pickup date in user's timezone context
      const pickupDateStr = job.pickup_date;
      const [year, month, day] = pickupDateStr.split('-').map(Number);
      
      // Create date object in user's timezone
      const jobDateInUserTz = new Date(year, month - 1, day);
      
      const isToday = jobDateInUserTz >= today && jobDateInUserTz < tomorrow;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Job ${job.id}: pickup_date=${pickupDateStr}, jobDate=${jobDateInUserTz.toISOString()}, isToday=${isToday}`);
      }
      
      return isToday;
    });
    
    console.log(`[Dashboard] Filtered to ${todayJobs.length} jobs for today`);
    
    // Debug: Log all today's jobs for analysis
    if (process.env.NODE_ENV === 'development') {
      console.log('=== TODAY\'S JOBS DEBUG ===');
      todayJobs.forEach(job => {
        console.log(`Job ${job.id}: pickup_date=${job.pickup_date}, pickup_time=${job.pickup_time}, status=${job.status}`);
      });
    }
    
    return todayJobs.map(job => {
      // Create Date object respecting company timezone setting
      // job.pickup_time is stored in the database as UTC but needs to be displayed in company's configured timezone (SGT)
      // We need to convert the UTC time to display timezone for proper positioning
      
      // Convert pickup_time to display timezone for consistent positioning
      const displayPickupTime = job.pickup_time;
      const [pickupHour, pickupMinute] = displayPickupTime.split(':').map(Number);
      
      // Get the company timezone for reference
      const companyTimezone = getDisplayTimezone();
      
      // Create Date object with the actual job pickup date and time
      // Parse the pickup date
      const [pickupYear, pickupMonth, pickupDay] = job.pickup_date.split('-').map(Number);
      
      // Create date object with actual pickup date and time
      const pickupDateTime = new Date(pickupYear, pickupMonth - 1, pickupDay, pickupHour, pickupMinute);
      
      // Create local now variable for time comparisons - must be in display timezone
      // to match pickupDateTime which is also in display timezone
      const systemNow = new Date();
      const nowInDisplayTzString = systemNow.toLocaleString('en-US', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      // Parse "MM/DD/YYYY, HH:MM:SS" format
      const [dateStr, timeStr] = nowInDisplayTzString.split(', ');
      const [nowMonth, nowDay, nowYear] = dateStr.split('/').map(Number);
      const [nowHour, nowMinute, nowSecond] = timeStr.split(':').map(Number);
      const now = new Date(nowYear, nowMonth - 1, nowDay, nowHour, nowMinute, nowSecond);
      
      // Debug timezone info
      if (process.env.NODE_ENV === 'development') {
        console.log(`Job ${job.id}: Company timezone = ${companyTimezone}`);
        console.log(`Job ${job.id}: Raw pickup_time=${job.pickup_time}`);
        console.log(`Job ${job.id}: Display pickup_time=${displayPickupTime} (in ${companyTimezone})`);
        console.log(`Job ${job.id}: Job pickup_date=${job.pickup_date}`);
        console.log(`Job ${job.id}: Parsed hours=${pickupHour}, minutes=${pickupMinute}`);
        console.log(`Job ${job.id}: Created Date object with ${pickupYear}-${pickupMonth}-${pickupDay} ${pickupHour}:${pickupMinute}`);
        console.log(`Job ${job.id}: Full pickupDateTime=${pickupDateTime.toISOString()}`);
      }
      const durationHours = job.estimated_duration ? parseFloat(job.estimated_duration) : 1;
      const endDateTime = new Date(pickupDateTime.getTime() + durationHours * 60 * 60 * 1000);
      
      // Debug logging for timezone issues
      if (process.env.NODE_ENV === 'development') {
        console.log(`Job ${job.id}: displayPickupTime=${displayPickupTime}, parsed hour=${pickupHour}, position using converted time`);
        console.log(`Job ${job.id}: status=${job.status}, pickupDateTime=${pickupDateTime}`);
      }
      
      const isStartingYesterday = pickupDateTime < today;
      const isEndingTomorrow = endDateTime >= tomorrow;
      
      // Parse time from converted display time to respect company timezone
      // Job pickup_time comes from database in UTC, but we use the converted display time for positioning
      // Use higher precision to minimize visual positioning errors
      const startPercent = isStartingYesterday ? 0 : 
        parseFloat(((pickupHour * 60 + pickupMinute) / (24 * 60) * 100).toFixed(6));
      
      // Debug position calculation with enhanced precision
      if (process.env.NODE_ENV === 'development') {
        const rawCalc = ((pickupHour * 60 + pickupMinute) / (24 * 60)) * 100;
        const preciseCalc = parseFloat(rawCalc.toFixed(6));
        console.log(`Job ${job.id}: Position calculation = ((${pickupHour} * 60 + ${pickupMinute}) / 1440) * 100`);
        console.log(`Job ${job.id}: Raw = ${rawCalc}%, Precise = ${preciseCalc}%`);
        console.log(`Job ${job.id}: Expected timeline position ~${Math.round((pickupHour / 24) * 100)}%`);
        console.log(`Job ${job.id}: Visual position (24h scale) = ${(preciseCalc / 100) * 24} hours`);
      }
      
      // Enhanced debugging for timezone issues
      if (process.env.NODE_ENV === 'development') {
        console.log(`Job ${job.id}: Local pickup_time=${job.pickup_time}, parsed hour=${pickupHour}, position=${startPercent}%`);
        console.log(`Job ${job.id}: status=${job.status}, pickupDateTime=${pickupDateTime}`);
        
        // Debug specific jobs
        if ([215, 216, 217, 214, 238].includes(job.id)) {
          console.log(`=== JOB #${job.id} DETAILED DEBUG ===`);
          console.log(`Raw pickup_time string: ${job.pickup_time}`);
          console.log(`Converted display time: ${displayPickupTime}`);
          console.log(`pickupDateTime object: ${pickupDateTime}`);
          console.log(`pickupDateTime.getHours(): ${pickupDateTime.getHours()}`);
          console.log(`Parsed hour/minute: ${pickupHour}:${pickupMinute}`);
          console.log(`Position calculation: ((${pickupHour} * 60 + ${pickupMinute}) / 1440) * 100 = ${startPercent}%`);
          console.log(`Expected timeline position: ~${Math.round((pickupHour / 24) * 100)}%`);
        }
      }
      
      // --- Proper collision detection using interval scheduling ---
      // Sort jobs by startPercent for greedy lane assignment
      const sortedJobs = [...todayJobs].sort((a, b) => {
        const aHour = parseInt(a.pickup_time.split(':')[0]);
        const aMin  = parseInt(a.pickup_time.split(':')[1]);
        const bHour = parseInt(b.pickup_time.split(':')[0]);
        const bMin  = parseInt(b.pickup_time.split(':')[1]);
        return (aHour * 60 + aMin) - (bHour * 60 + bMin);
      });

      // For each job, compute its start/end percent on the fly for collision checking
      const getJobPercents = (j: Job) => {
        const [h, m] = j.pickup_time.split(':').map(Number);
        const start = parseFloat(((h * 60 + m) / 1440 * 100).toFixed(6));
        // estimated_duration not on base Job type, default to 1hr for overlap detection
        const durHrs = (j as any).estimated_duration ? parseFloat((j as any).estimated_duration) : 1;
        const endMinutes = h * 60 + m + durHrs * 60;
        const end = Math.min(parseFloat((endMinutes / 1440 * 100).toFixed(6)), 100);
        // Treat each card as at least 4% wide for overlap detection
        return { start, end: Math.max(end, start + 4) };
      };

      // Greedy lane assignment: assign each job to the first lane where it doesn't overlap
      const CARD_HEIGHT = 40;  // px — card height (32px) + gap (8px)
      const laneEndAt: number[] = []; // tracks the end% of the last job in each lane
      const jobLaneMap: Record<number, number> = {};

      sortedJobs.forEach(j => {
        const { start, end } = getJobPercents(j);
        let assignedLane = -1;
        for (let lane = 0; lane < laneEndAt.length; lane++) {
          if (start >= laneEndAt[lane]) {
            assignedLane = lane;
            laneEndAt[lane] = end;
            break;
          }
        }
        if (assignedLane === -1) {
          // No free lane found — open a new one
          assignedLane = laneEndAt.length;
          laneEndAt.push(end);
        }
        jobLaneMap[j.id] = assignedLane;
      });

      // verticalOffset = lane index × card height
      const verticalOffset = (jobLaneMap[job.id] ?? 0) * CARD_HEIGHT;
      
      // Calculate end percent using the converted display time
      const displayDropoffTime = job.dropoff_time ? job.dropoff_time : null;
      const endPercent = isEndingTomorrow ? 100 :
        displayDropoffTime ?
          ((parseInt(displayDropoffTime.split(':')[0]) * 60 + parseInt(displayDropoffTime.split(':')[1])) / (24 * 60)) * 100 :
          ((endDateTime.getHours() * 60 + endDateTime.getMinutes()) / (24 * 60)) * 100;
      
      const status = (job.status || '').toLowerCase();
      let statusColor;
      
      // Enhanced status logic: Handle completed vs delayed jobs correctly
      if (['jc', 'sd'].includes(status)) {
        // Explicitly completed jobs - always green
        statusColor = '#22c55e';
      } else if (['otw', 'ots', 'pob'].includes(status)) {
        // In-progress jobs - orange
        statusColor = '#f59e42';
      } else if (pickupDateTime < now && !['jc', 'sd', 'canceled'].includes(status)) {
        // Jobs past pickup time but NOT explicitly completed/canceled
        // These should be considered Unresolved or Completed in practice
        statusColor = '#ef4444'; // Still red for now, but this is the issue
      } else {
        // Scheduled jobs (future pickup time) - blue
        statusColor = '#3b82f6';
      }
      
      // Debug logging for status classification
      if (process.env.NODE_ENV === 'development') {
        const statusName = statusColor === '#22c55e' ? 'Completed' : statusColor === '#ef4444' ? 'Delayed' : statusColor === '#f59e42' ? 'In Progress' : 'Scheduled';
        console.log(`Job ${job.id} (${job.status}): pickup=${pickupDateTime.toISOString()}, now=${now.toISOString()} (${userTimezone}), classified as ${statusName}`);
        if (pickupDateTime < now && !['jc', 'sd', 'canceled'].includes(status)) {
          const delayMinutes = Math.floor((now.getTime() - pickupDateTime.getTime()) / (1000 * 60));
          const delayHours = Math.floor(delayMinutes / 60);
          const remainingMinutes = delayMinutes % 60;
          console.log(`⚠️ Job ${job.id} is ${delayHours}h ${remainingMinutes}m overdue (status="${status}" should be updated)`);
        }
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
        verticalOffset,
        customer: job.customer?.name || job.passenger_name || 'Unknown',
      };
    });
  }, [jobs]);

  // Current time indicator position - using user's timezone
  const currentTimePercent = useMemo(() => {
    const userTimezone = getDisplayTimezone();
    const now = new Date();
    const localNow = new Date(now.toLocaleString('en-US', {
      timeZone: userTimezone
    }));
    
    // Debug: Log current time calculation
    if (process.env.NODE_ENV === 'development') {
      console.log('=== CURRENT TIME INDICATOR DEBUG ===');
      console.log(`System time: ${now.toISOString()}`);
      console.log(`Local time in ${userTimezone}: ${localNow.toISOString()}`);
      console.log(`Hours: ${localNow.getHours()}, Minutes: ${localNow.getMinutes()}`);
      console.log(`Position percentage: ${((localNow.getHours() * 60 + localNow.getMinutes()) / (24 * 60)) * 100}%`);
    }
    
    return ((localNow.getHours() * 60 + localNow.getMinutes()) / (24 * 60)) * 100;
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

  // Compute total lanes needed for dynamic height
  const totalLanes = useMemo(() => {
    if (filteredJobs.length === 0) return 1;
    return Math.max(...filteredJobs.map(j => (j.verticalOffset / 40) + 1));
  }, [filteredJobs]);

  // Display all jobs on a single timeline row without grouping
  const jobRows = useMemo((): TimelineJob[][] => {
    // Return all jobs in a single row to show individual pickup times
    return [filteredJobs];
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

  // Next 5-hour jobs (Excel table)
  const next5HrJobs = useMemo(() => {
    const userTimezone = getDisplayTimezone();
    const now = new Date();
    const nowInUserTz = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const fiveHoursLater = new Date(nowInUserTz.getTime() + 5 * 60 * 60 * 1000);

    return jobs
      .filter(job => {
        if (!job.pickup_date || !job.pickup_time) return false;
        const [y, mo, d] = job.pickup_date.split('-').map(Number);
        const [h, min] = job.pickup_time.split(':').map(Number);
        const pickupDt = new Date(y, mo - 1, d, h, min);
        return pickupDt >= nowInUserTz && pickupDt <= fiveHoursLater;
      })
      .sort((a, b) => {
        const dtA = new Date(`${a.pickup_date}T${a.pickup_time}`);
        const dtB = new Date(`${b.pickup_date}T${b.pickup_time}`);
        return dtA.getTime() - dtB.getTime();
      });
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
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `Updated just now`;
    if (diff < 3600) return `Updated ${Math.floor(diff / 60)} min ago`;
    return `Updated ${Math.floor(diff / 3600)} hr ago`;
  }

  const isMobile = useMediaQuery({ maxWidth: 640 });

  // --- Driver Holidays next 7 days ---
  const { data: upcomingLeaves, isLoading: leavesLoading } = useQuery({
    queryKey: ['driver-leaves', 'next-7-days'],
    queryFn: () => {
      const userTimezone = getDisplayTimezone();
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      return getDriverLeaves({ start_date: fmt(today), end_date: fmt(nextWeek), active_only: true });
    },
    select: (data) => (Array.isArray(data) ? data : []),
  });

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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 px-4 sm:px-6 lg:px-8 w-full">
          {jobsLoading || leavesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-32 animate-pulse bg-background-light mx-2" />
            ))
          ) : jobsError ? (
            <Card className="col-span-full text-center text-red-400">Failed to load data.</Card>
          ) : (
            <>
              {/* Card 1: Priority Alerts */}
              <div><PriorityDashboard alerts={priorityAlerts} /></div>

              {/* Card 2: Today's Job Status + Pending Invoices */}
              <Card className="flex flex-col justify-center p-4 sm:p-5 md:p-6 shadow-xl border border-gray-700 bg-gradient-to-br from-background-light to-background-dark hover:shadow-2xl transition-all duration-300 gap-4 h-full">
                {/* Row 1: Today's Job Status */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Today's Job Status</span>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-gray-700">
                    {/* In Progress */}
                    <div className="flex flex-col items-center gap-1 pr-4">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">
                        {kpiStats.inProgress.value}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-400 text-center leading-tight">In Progress</span>
                      {kpiStats.inProgress.trendData[0]?.value !== undefined && kpiStats.inProgress.value !== kpiStats.inProgress.trendData[0]?.value && (
                        <div className="flex items-center gap-0.5">
                          {kpiStats.inProgress.value > kpiStats.inProgress.trendData[0].value
                            ? <HiArrowUp className="w-2.5 h-2.5 text-green-400" />
                            : <HiArrowDown className="w-2.5 h-2.5 text-red-400" />}
                          <span className={`text-[10px] font-medium ${kpiStats.inProgress.value > kpiStats.inProgress.trendData[0].value ? 'text-green-400' : 'text-red-400'}`}>
                            {Math.abs(((kpiStats.inProgress.value - kpiStats.inProgress.trendData[0].value) / Math.max(kpiStats.inProgress.trendData[0].value, 1)) * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                    {/* Completed */}
                    <div className="flex flex-col items-center gap-1 px-4">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]">
                        {kpiStats.jobsCompleted.value}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-400 text-center leading-tight">Completed</span>
                      {kpiStats.todaysScheduled.value > 0 && (
                        <span className="text-[10px] text-gray-500">
                          of {kpiStats.todaysScheduled.value}
                        </span>
                      )}
                    </div>
                    {/* Unassigned */}
                    <div className="flex flex-col items-center gap-1 pl-4">
                      <span className={`text-2xl sm:text-3xl font-extrabold drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] ${
                        kpiStats.unassignedJobs.value > 0 ? 'text-yellow-400' : 'text-white'
                      }`}>
                        {kpiStats.unassignedJobs.value}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-400 text-center leading-tight">Unassigned</span>
                      {kpiStats.unassignedJobs.value > 0 && (
                        <span className="text-[10px] text-yellow-500 font-medium">Needs attention</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700" />

                {/* Row 2: Pending Invoices */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pending Invoices</span>
                  </div>
                  {kpiStats.pendingInvoices.value === 0 ? (
                    <p className="text-sm text-gray-500">No pending invoices</p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">
                        {kpiStats.pendingInvoices.value}
                      </span>
                      {kpiStats.pendingInvoices.trendData[0]?.value !== undefined && kpiStats.pendingInvoices.value !== kpiStats.pendingInvoices.trendData[0]?.value && (
                        <div className="flex items-center gap-0.5">
                          {kpiStats.pendingInvoices.value > kpiStats.pendingInvoices.trendData[0].value
                            ? <HiArrowUp className="w-3 h-3 text-red-400" />
                            : <HiArrowDown className="w-3 h-3 text-green-400" />}
                          <span className={`text-xs font-medium ${kpiStats.pendingInvoices.value > kpiStats.pendingInvoices.trendData[0].value ? 'text-red-400' : 'text-green-400'}`}>
                            {Math.abs(((kpiStats.pendingInvoices.value - kpiStats.pendingInvoices.trendData[0].value) / Math.max(kpiStats.pendingInvoices.trendData[0].value, 1)) * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Card 4: Drivers on Holiday — next 7 days */}
              <Card className="flex flex-col p-4 sm:p-5 md:p-6 shadow-xl border border-gray-700 bg-gradient-to-br from-background-light to-background-dark hover:shadow-2xl transition-all duration-300 h-full">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Driver on Holiday</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded-full border border-purple-600/30 font-medium">
                    Next 7 days
                  </span>
                </div>

                {!upcomingLeaves || upcomingLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 text-slate-400 py-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-2 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs font-medium text-center">All drivers available</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 overflow-y-auto max-h-36 pr-0.5">
                    {(upcomingLeaves ?? []).map((leave: DriverLeave) => {
                      const LEAVE_TYPE_COLORS: Record<string, { dot: string; text: string }> = {
                        sick_leave: { dot: 'bg-red-400',    text: 'text-red-300' },
                        vacation:   { dot: 'bg-blue-400',   text: 'text-blue-300' },
                        personal:   { dot: 'bg-purple-400', text: 'text-purple-300' },
                        emergency:  { dot: 'bg-orange-400', text: 'text-orange-300' },
                      };
                      const LEAVE_TYPE_LABELS: Record<string, string> = {
                        sick_leave: 'Sick', vacation: 'Vacation', personal: 'Personal', emergency: 'Emergency',
                      };
                      const colors = LEAVE_TYPE_COLORS[leave.leave_type] ?? { dot: 'bg-slate-400', text: 'text-slate-300' };
                      const driverName = (leave as any).driver?.name ?? `Driver #${leave.driver_id}`;
                      const startFmt = new Date(leave.start_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const endFmt   = new Date(leave.end_date   + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      const isSameDay = leave.start_date === leave.end_date;
                      return (
                        <div
                          key={leave.id}
                          className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer transition-colors"
                          onClick={() => router.push('/drivers/leave/history')}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
                            <span className="text-white text-xs font-medium truncate">{driverName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`text-[10px] font-medium ${colors.text}`}>
                              {LEAVE_TYPE_LABELS[leave.leave_type] ?? leave.leave_type}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {isSameDay ? startFmt : `${startFmt}–${endFmt}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={() => router.push('/drivers/leave/history')}
                  className="mt-3 text-[10px] text-purple-400 hover:text-purple-300 transition-colors text-center w-full"
                >
                  Manage Leaves →
                </button>
              </Card>
            </>
          )}
        </div>

        {/* Job Monitoring Alerts Panel - Positioned above Today's Jobs Timeline */}
        <div className="mb-4">
          <div className="grid grid-cols-1 w-full">
            <div className="flex flex-col px-4 sm:px-6 lg:px-8">
              <JobMonitoringAlertsPanel />
            </div>
          </div>
        </div>

        {/* TODAY'S JOBS TIMELINE (FULL WIDTH) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 gap-6 sm:gap-8 mb-6 w-full"
        >
          <div className="flex flex-col px-4 sm:px-6 lg:px-8">
            <Card className="p-4 sm:p-6 lg:p-8 shadow-2xl border border-gray-700 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm min-h-[32rem] flex flex-col overflow-visible">
              {/* Header with title and filters */}
              <div className="flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="w-1 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {(() => {
                      const userTimezone = getDisplayTimezone();
                      const selectedDateInUserTz = new Date(selectedDate.toLocaleString('en-US', {
                        timeZone: userTimezone
                      }));
                      return selectedDateInUserTz.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: userTimezone
                      });
                    })()}'s Jobs Timeline
                  </h2>
                  <span className="px-3 py-1 bg-blue-600/20 text-blue-300 text-xs sm:text-sm font-medium rounded-full border border-blue-600/30 w-fit">
                    {filteredJobs.length} jobs
                  </span>
                  {/* Date Navigation Controls */}
                  <div className="ml-auto">
                    <button 
                      onClick={() => setSelectedDate(new Date())}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      Today
                    </button>
                  </div>
                </div>
                
                {/* Enhanced Filter buttons */}
                <div className="flex flex-wrap gap-2 overflow-x-auto">
                  {
                    [
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
                      className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-all duration-300 whitespace-nowrap ${
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
                    ))
                  }
                  </div>
                </div>
              
              {/* Timeline container - Fixed height with horizontal scroll on mobile */}
              <div className="flex-1 overflow-x-auto overflow-y-hidden bg-slate-900/40 rounded-2xl border border-slate-700/50 backdrop-blur-sm mx-[-1rem] sm:mx-[-2rem] px-[1rem] sm:px-[2rem]">
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
                      onClick={() => router.push('/jobs/new')}
                    >
                      Schedule New Job
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="flex flex-col h-full p-4 sm:p-6 pt-8 sm:pt-12 min-w-full sm:min-w-fit">
                    {/* Timeline header with hours - responsive font size */}
                    <div className="relative h-10 sm:h-12 border-b border-slate-700/60 mb-6">
                      {/* Hour markers */}
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="absolute top-0 flex flex-col items-start"
                          style={{ left: `${(i / 24) * 100}%` }}
                        >
                          <div className="h-2 sm:h-3 w-px bg-slate-600"></div>
                          <span className="text-[10px] sm:text-xs text-slate-300 font-semibold mt-1 sm:mt-2 pl-1">
                            {i.toString().padStart(2, '0')}:00
                          </span>
                        </div>
                      ))}
                      
                      {/* Half-hour markers - tick lines only */}
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div 
                          key={i} 
                          className="absolute top-0 flex flex-col items-center"
                          style={{ left: `${((i + 0.5) / 24) * 100}%` }}
                        >
                          <div className="h-2 w-px bg-slate-700/40"></div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Timeline body - height grows with number of lanes */}
                    <div className="relative pb-6" style={{ height: `${Math.max(totalLanes * 40 + 48, 80)}px` }}>
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
                          {new Date().toLocaleTimeString('en-US', { 
                            timeZone: getDisplayTimezone(),
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false
                          })}
                        </div>
                      </motion.div>
                      
                      {/* All jobs rendered in a single absolute container, lanes via verticalOffset */}
                      <div className="relative w-full h-full">
                        {filteredJobs.length > 0 ? filteredJobs.map((job, jobIndex) => {
                                const jobLeft = job.startPercent;
                                const jobWidth = Math.max(job.width, 4);
                                const jobCenter = jobLeft + (jobWidth / 2);

                                return (
                                  <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: jobIndex * 0.05 }}
                                    whileHover={{ 
                                      scale: 1.05, 
                                      zIndex: 50,
                                      transition: { duration: 0.2 }
                                    }}
                                    className="absolute h-8 rounded-lg shadow-lg border border-gray-600/60 transition-all duration-300 hover:shadow-xl group cursor-pointer backdrop-blur-sm"
                                    style={{
                                      left: `${job.startPercent}%`,
                                      top: `${job.verticalOffset}px`,
                                      width: `${Math.max(job.width, 4)}%`,
                                      minWidth: '80px',
                                      background: `linear-gradient(135deg, ${job.statusColor}E6, ${job.statusColor}CC)`,
                                      borderColor: `${job.statusColor}80`,
                                    }}
                                    onClick={() => router.push(`/jobs/${job.id}`)}
                                  >
                                    {job.isStartingYesterday && (
                                      <div className="absolute -left-2 top-1/2 -translate-y-1/2">
                                        <div className="h-2 w-2 rounded-full bg-white/70" />
                                      </div>
                                    )}
                                    {job.isEndingTomorrow && (
                                      <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                                        <div className="h-2 w-2 rounded-full bg-white/70" />
                                      </div>
                                    )}
                                    <div className="px-2 h-full flex items-center overflow-hidden">
                                      <div className="text-xs font-bold text-white truncate leading-tight">
                                        #{job.id}
                                      </div>
                                    </div>
                                    {/* Tooltip */}
                                    <div className="absolute z-50 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                                      <div 
                                        className="bg-slate-900/95 backdrop-blur-md text-white text-sm p-4 rounded-xl shadow-2xl border border-slate-700/60 w-80"
                                        style={{
                                          position: 'absolute',
                                          top: job.verticalOffset > 80 ? '-16px' : '110%',
                                          left: jobCenter < 30 ? '0px' : jobCenter > 70 ? '-320px' : '-160px',
                                          transform: job.verticalOffset > 80 ? 'translateY(-100%)' : 'none',
                                        }}
                                      >
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="font-bold text-blue-300">Job #{job.id}</div>
                                          <div className="px-2 py-1 rounded-lg text-xs font-medium" style={{ backgroundColor: `${job.statusColor}40`, color: job.statusColor }}>
                                            {(STATUS_LABELS as any)[job.status] || job.status}
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                                          <div className="text-slate-400">Customer:</div>
                                          <div className="font-medium truncate">{job.customer}</div>
                                          <div className="text-slate-400">Service:</div>
                                          <div className="truncate">{job.service_type}</div>
                                          <div className="text-slate-400">Time:</div>
                                          <div className="font-mono">{job.pickup_time || 'N/A'} → {job.dropoff_time || 'N/A'}</div>
                                          <div className="text-slate-400">From:</div>
                                          <div className="truncate text-xs">{job.pickup_location || 'N/A'}</div>
                                          <div className="text-slate-400">To:</div>
                                          <div className="truncate text-xs">{job.dropoff_location || 'N/A'}</div>
                                        </div>
                                        <div className="mt-3 pt-2 border-t border-slate-700/60 text-xs text-slate-400">Click to view details</div>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              }) : (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full text-slate-400 pt-8"
                          >
                            <p className="text-lg font-medium">No jobs match current filters</p>
                            <p className="text-sm opacity-75">Try adjusting your filter settings</p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                    
                    {/* Enhanced Timeline legend - responsive for mobile */}
                    <div className="flex items-center justify-center flex-wrap gap-3 sm:gap-6 mt-4 pt-4 border-t border-slate-700/60">
                      {[
                        { color: '#3b82f6', label: 'Scheduled' },
                        { color: '#f59e42', label: 'In Progress' },
                        { color: '#22c55e', label: 'Completed' },
                        { color: '#ef4444', label: 'Delayed' }
                      ].map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-2">
                          <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-sm shadow-sm" style={{ backgroundColor: color }}></div>
                          <span className="text-[10px] sm:text-xs text-slate-300 font-medium">{label}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-slate-700/60">
                        <div className="w-px h-2 sm:h-3 bg-red-500 shadow-sm"></div>
                        <span className="text-[10px] sm:text-xs text-slate-300 font-medium">Current Time</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </motion.div>

        {/* DRIVER CALENDAR VIEW (FULL WIDTH) */}
        

        {/* NEXT 5 HR JOBS — EXCEL TABLE VIEW */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 gap-6 sm:gap-8 mb-4 w-full"
        >
          <div className="flex flex-col px-4 sm:px-6 lg:px-8">
            <Card className="p-4 sm:p-6 shadow-xl border border-gray-700 bg-gradient-to-br from-background-light to-background-dark h-full flex flex-col">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-7 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Next 5-Hour Jobs</h2>
                  <span className="px-2.5 py-1 bg-amber-600/20 text-amber-300 text-xs font-semibold rounded-full border border-amber-600/30">
                    {next5HrJobs.length} upcoming
                  </span>
                </div>
                <ActionButton onClick={() => router.push('/jobs')} variant="secondary">View All Jobs</ActionButton>
              </div>

              {/* Excel-style table */}
              {next5HrJobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                  <CalendarIcon className="w-12 h-12 mb-3 opacity-40" />
                  <p className="text-base font-medium">No jobs in the next 5 hours</p>
                  <p className="text-sm opacity-60 mt-1">Upcoming pickups will appear here</p>
                </div>
              ) : (
                <div className="overflow-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50 rounded-lg border border-slate-700" style={{ maxHeight: '320px' }}>
                  <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed', minWidth: '1200px' }}>
                    <thead>
                      <tr className="bg-slate-800 text-slate-300 uppercase text-xs tracking-wider sticky top-0 z-10">
                        {['#', 'Pickup Time', 'ETA', 'Customer / Passenger', 'Service', 'Driver', 'From', 'To', 'Status'].map((col, idx) => {
                          const widths = ['60px', '90px', '100px', '160px', '110px', '120px', '180px', '180px', '100px'];
                          return (
                            <th
                              key={col}
                              className="px-3 py-3 text-left font-semibold border-b border-r border-slate-700 last:border-r-0"
                              style={{ width: widths[idx] || 'auto' }}
                            >
                              {col}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {next5HrJobs.map((job, idx) => {
                        // Countdown
                        const userTimezone = getDisplayTimezone();
                        const nowTz = new Date(new Date().toLocaleString('en-US', { timeZone: userTimezone }));
                        const [jy, jmo, jd] = job.pickup_date.split('-').map(Number);
                        const [jh, jmin] = job.pickup_time.split(':').map(Number);
                        const pickupDt = new Date(jy, jmo - 1, jd, jh, jmin);
                        const diffMs = pickupDt.getTime() - nowTz.getTime();
                        const diffMin = Math.max(0, Math.floor(diffMs / 60000));
                        const etaHours = Math.floor(diffMin / 60);
                        const etaMins = diffMin % 60;
                        const etaLabel = etaHours > 0 ? `${etaHours}h ${etaMins}m` : `${etaMins}m`;
                        const isUrgent = diffMin <= 30;

                        // Row status colour
                        const statusRaw = (job.status || '').toLowerCase();
                        const statusLabel = (STATUS_LABELS as any)[statusRaw] || statusRaw;
                        const statusPill: Record<string, string> = {
                          new: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
                          pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
                          confirmed: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                          otw: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
                          ots: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                          pob: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
                        };
                        const pillClass = statusPill[statusRaw] || 'bg-slate-500/20 text-slate-300 border-slate-500/40';

                        return (
                          <tr
                            key={job.id}
                            className={`border-b border-slate-700/60 transition-colors cursor-pointer ${
                              idx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-800/40'
                            } hover:bg-blue-900/30`}
                            onClick={() => router.push(`/jobs/${job.id}`)}
                          >
                            {/* Job # */}
                            <td className="px-3 py-2.5 border-r border-slate-700/50 font-mono font-bold text-blue-400 whitespace-nowrap">
                              #{job.id}
                            </td>

                            {/* Pickup Time */}
                            <td className="px-3 py-2.5 border-r border-slate-700/50 font-mono text-white whitespace-nowrap">
                              {job.pickup_time?.slice(0, 5)}
                            </td>

                            {/* ETA countdown */}
                            <td className="px-3 py-2.5 border-r border-slate-700/50 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                                  isUrgent
                                    ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                {isUrgent ? '⚡' : '⏱'} {etaLabel}
                              </span>
                            </td>

                            {/* Customer / Passenger */}
                            <td className="px-3 py-2.5 border-r border-slate-700/50">
                              <div className="truncate font-medium text-white">
                                {job.customer?.name || job.passenger_name || '—'}
                              </div>
                              {job.customer?.name && job.passenger_name && job.customer.name !== job.passenger_name && (
                                <div className="truncate text-xs text-slate-400">{job.passenger_name}</div>
                              )}
                            </td>

                            {/* Service */}
                            <td className="px-3 py-2.5 border-r border-slate-700/50 text-slate-200 truncate">
                              {job.service_type || '—'}
                            </td>

                            {/* Driver */}
                            <td className="px-3 py-2.5 border-r border-slate-700/50 truncate">
                              {job.driver_id ? (
                                <span className="text-green-400 font-medium">
                                  {(job as any).driver?.name || `Driver #${job.driver_id}`}
                                </span>
                              ) : (
                                <span className="text-red-400 text-xs font-semibold">Unassigned</span>
                              )}
                            </td>

                            {/* From */}
                            <td className="px-3 py-2.5 border-r border-slate-700/50">
                              <div className="truncate text-slate-300 text-xs">{job.pickup_location || '—'}</div>
                            </td>

                            {/* To */}
                            <td className="px-3 py-2.5 border-r border-slate-700/50">
                              <div className="truncate text-slate-300 text-xs">{job.dropoff_location || '—'}</div>
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${pillClass}`}>
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        </motion.div>

        {/* Floating Quick Actions */}
        <FloatingActionButton />
      </div>
    </div>
  );
}
