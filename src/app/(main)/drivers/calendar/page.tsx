"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { Card } from '@/components/atoms/Card';
import { Button } from '@/components/atoms/Button';
import { format, addDays, subDays, parseISO, differenceInHours, isSameDay, isToday, isYesterday } from 'date-fns';
import { 
  TruckIcon, 
  UserIcon, 
  ClockIcon, 
  MapPinIcon, 
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BriefcaseIcon,
  DollarSignIcon,
  UsersIcon,
  XCircleIcon,
  CheckCircleIcon
} from 'lucide-react';
import { useGetAllDrivers } from '@/hooks/useDrivers';
import * as jobsApi from '@/services/api/jobsApi';
import { useGetDriverLeaves } from '@/hooks/useDriverLeave';
import { Job, ApiJob } from '@/types/job';
import type { Driver } from '@/lib/types';
import { DriverLeave } from '@/types/driverLeave';

interface CalendarBlock {
  type: 'job' | 'leave' | 'available' | 'unavailable';
  startTime: string;
  endTime: string;
  job?: Job;
  leave?: DriverLeave;
  driverId: number;
  date: string; // Added date field to track which date this block belongs to
}

interface DriverWithAvailability {
  driver: Driver;
  availabilityBlocks: CalendarBlock[];
  todayStats: {
    totalJobs: number;
    totalHours: number;
    totalEarnings: number;
    jobsByStatus: Record<string, number>;
  };
  yesterdayStats: {
    totalJobs: number;
    totalHours: number;
    totalEarnings: number;
    jobsByStatus: Record<string, number>;
  };
}

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours
const DAYS_TO_SHOW = 5;

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'new': 'bg-blue-500',
    'confirmed': 'bg-blue-500',
    'otw': 'bg-purple-500',
    'ots': 'bg-yellow-500',
    'pob': 'bg-orange-500',
    'jc': 'bg-green-500',
    'sd': 'bg-gray-500',
    'canceled': 'bg-red-500'
  };
  return colors[status?.toLowerCase()] || 'bg-gray-400';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'new': 'New',
    'confirmed': 'Confirmed',
    'otw': 'On the Way',
    'ots': 'On the Spot',
    'pob': 'Person On Board',
    'jc': 'Job Completed',
    'sd': 'Stand Down',
    'canceled': 'Canceled'
  };
  return labels[status?.toLowerCase()] || status;
};

const getLeaveTypeColor = (leaveType: string) => {
  const colors: Record<string, string> = {
    'sick_leave': 'bg-orange-500',
    'vacation': 'bg-purple-500',
    'personal': 'bg-yellow-500',
    'emergency': 'bg-red-500'
  };
  return colors[leaveType] || 'bg-gray-500';
};

const getLeaveTypeLabel = (leaveType: string) => {
  return leaveType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function DriverCalendarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [driverStatusFilter, setDriverStatusFilter] = useState<string>('all');
  const [hoveredBlock, setHoveredBlock] = useState<{ block: CalendarBlock; position: { x: number; y: number } } | null>(null);

  // State for job detail modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // Get current user context to determine if they're a driver
  const { user } = useUser();
  
  // Fetch data
  const { data: drivers = [], isLoading: driversLoading } = useGetAllDrivers();
  
  // Fetch calendar data
  const { data: calendarData, isLoading: calendarLoading } = useQuery({
    queryKey: ['jobs', 'calendar', DAYS_TO_SHOW],
    queryFn: async () => {
      console.log('Fetching calendar data for', DAYS_TO_SHOW, 'days');
      const response = await jobsApi.getJobsCalendar(DAYS_TO_SHOW);
      console.log('Calendar API response:', response);
      return response;
    },
    refetchInterval: 30000,
  });
  
  const { data: leaves = [], isLoading: leavesLoading } = useGetDriverLeaves({});
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Leaves data loaded:', leaves);
      if (leaves.length > 0) {
        console.log('Sample leave record:', leaves[0]);
      }
    }
  }, [leaves]);

  // Generate date range (5 days starting from selected date)
  const dateRange = useMemo(() => {
    const dates = [];
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      dates.push(addDays(selectedDate, i));
    }
    return dates;
  }, [selectedDate]);

  // Process driver availability data
  const driversWithAvailability = useMemo<DriverWithAvailability[]>(() => {
    if (driversLoading || calendarLoading || leavesLoading) return [];
    
    // Debug logging for calendar data
    if (process.env.NODE_ENV === 'development') {
      console.log('Calendar data received:', calendarData);
      console.log('Drivers data:', drivers);
    }
    
    // Check if current user is a driver
    const isDriver = user?.response?.user?.roles?.some((role: any) => role.name === 'driver');
    const currentDriverId = user?.response?.user?.driver_id;
    
    // Filter drivers based on user role
    const filteredDrivers = drivers.filter(driver => {
      // If current user is a driver, only show their own data
      if (isDriver && currentDriverId) {
        return driver.id === currentDriverId;
      }
      // Otherwise, apply the status filter
      return driverStatusFilter === 'all' || driver.status?.toLowerCase() === driverStatusFilter;
    });

    return filteredDrivers
      .map(driver => {
        const allAvailabilityBlocks: Record<string, CalendarBlock[]> = {};
        const today = new Date();
        const yesterday = subDays(today, 1);
        
        // Generate 24-hour blocks for each day
        dateRange.forEach(date => {
          const dateString = format(date, 'yyyy-MM-dd');
          
          // Get the day's data from calendar API response
          const dayData = calendarData?.calendar_data?.[dateString]?.[driver.id] || [];
          
          // Extract jobs from the day data
          // Jobs have customer_name property
          const driverJobs: Job[] = dayData.filter(item => {
            // Check if this item has job properties
            return item.hasOwnProperty('customer_name') && item.hasOwnProperty('id') && item.hasOwnProperty('status');
          }).map(item => item as unknown as Job);
          
          // Check for leaves from the separate leaves data for this specific date
          // Find all relevant leaves for this driver (approved and pending)
          const allDriverLeaves = (leaves || []).filter((leave: any) => 
            leave.driver_id === driver.id && (leave.status === 'approved' || leave.status === 'pending')
          ) as DriverLeave[];
          
          // Then check which leaves apply to the current date
          const driverLeaves: DriverLeave[] = allDriverLeaves.filter(leave => {
            if (process.env.NODE_ENV === 'development') {
              // Parse dates without time zones affecting the date
              const startDate = new Date(leave.start_date.split('T')[0] + 'T00:00:00');
              const endDate = new Date(leave.end_date.split('T')[0] + 'T00:00:00');
              const currentDate = new Date(date);
              
              // Normalize dates to compare only the date part (ignore time)
              const normStartDate = new Date(startDate);
              const normEndDate = new Date(endDate);
              const normCurrentDate = new Date(currentDate);
              normStartDate.setHours(0, 0, 0, 0);
              normEndDate.setHours(0, 0, 0, 0);
              normCurrentDate.setHours(0, 0, 0, 0);
              
              console.log(`Checking leave:`, {
                driverId: leave.driver_id,
                leaveId: leave.id,
                leaveType: leave.leave_type,
                rawStartDate: leave.start_date,
                rawEndDate: leave.end_date,
                startDate: startDate,
                endDate: endDate,
                currentDate: date,
                normStartDate: normStartDate,
                normEndDate: normEndDate,
                normCurrentDate: normCurrentDate,
                isInRange: normCurrentDate >= normStartDate && normCurrentDate <= normEndDate
              });
            }
            
            // Parse dates without time zones affecting the date
            const startDate = new Date(leave.start_date.split('T')[0] + 'T00:00:00');
            const endDate = new Date(leave.end_date.split('T')[0] + 'T00:00:00');
            const currentDate = new Date(date);
            
            // Normalize dates to compare only the date part (ignore time)
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            currentDate.setHours(0, 0, 0, 0);
            
            return currentDate >= startDate && currentDate <= endDate;
          });
          
          // Enhanced debug logging
          if (process.env.NODE_ENV === 'development') {
            console.log(`=== CALENDAR DATA SUMMARY ===`);
            console.log(`Driver ${driver.id} (${driver.name}):`);
            console.log(`  ${dateString}: ${driverJobs.length} jobs, ${driverLeaves.length} leaves, 0 unavailable`);
            
            driverJobs.forEach((job, index) => {
              console.log(`    Job ${job.id}: ${job.pickup_date || 'N/A'} ${job.pickup_time || 'N/A'} | ${job.pickup_location || 'N/A'} → ${job.dropoff_location || 'N/A'} | Status: ${job.status || 'N/A'}`);
            });
            
            driverLeaves.forEach((leave, index) => {
              console.log(`    Leave ${leave.id}: ${leave.leave_type || 'N/A'} | ${leave.start_date || 'N/A'} to ${leave.end_date || 'N/A'} | Status: ${leave.status || 'N/A'}`);
            });
            
            if (driverJobs.length === 0 && driverLeaves.length === 0) {
              console.log(`    No jobs or leaves found for this date`);
            }
            
            console.log(`Calendar data keys:`, Object.keys(calendarData?.calendar_data || {}));
            console.log(`All data for this date:`, calendarData?.calendar_data?.[dateString]);
          }

          // Initialize array for this date
          allAvailabilityBlocks[dateString] = allAvailabilityBlocks[dateString] || [];
          const availabilityBlocksForDate = allAvailabilityBlocks[dateString];
          
          // Process leaves first - if driver is on leave for this specific date
          if (driverLeaves.length > 0) {
            const leaveStartTime = '00:00';
            const leaveEndTime = '24:00';
            
            // Create full-day leave block
            const leaveBlock = {
              type: 'leave' as const,
              startTime: leaveStartTime,
              endTime: leaveEndTime,
              leave: driverLeaves[0],
              driverId: driver.id,
              date: dateString
            };
            
            availabilityBlocksForDate.push(leaveBlock);
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`Created FULL-DAY LEAVE block for ${driver.name}: ${leaveStartTime} to ${leaveEndTime}`);
              console.log(`Leave block duration: 1440 minutes = 100% of timeline`);
            }
            
            // Clear any existing job blocks for this day since driver is on leave
            // This prevents overlapping/conflicting blocks
            return; // Skip job processing for this date
          } 
          
          // Process jobs only if driver is not on leave
          if (driverLeaves.length === 0) {
            driverJobs.forEach(job => {
              if (!job.pickup_time) return;
              
              // Parse pickup time
              const [pickupHour, pickupMinute] = job.pickup_time.split(':').map(Number);
              const startTime = `${pickupHour.toString().padStart(2, '0')}:${pickupMinute.toString().padStart(2, '0')}`;
              
              // Calculate job duration - use service type to estimate duration
              let durationHours = 1; // Default fallback
              
              // Try to get duration from service type patterns
              if (job.service_type) {
                // Look for duration patterns like "4Hrs", "2 Hours", etc.
                const durationMatch = job.service_type.match(/(\d+)\s*(?:Hrs?|Hours?|H)/i);
                if (durationMatch) {
                  durationHours = parseInt(durationMatch[1]);
                } 
                // Handle common service types
                else if (job.service_type.includes('Tour Package')) {
                  // Tour packages typically 4-8 hours
                  durationHours = 4;
                }
                else if (job.service_type.includes('Airport Transfer')) {
                  // Airport transfers typically 2-3 hours
                  durationHours = 2;
                }
                else if (job.service_type.includes('Hourly')) {
                  // Look for numeric prefix in hourly services
                  const hourlyMatch = job.service_type.match(/^([0-9]+)\s*Hour/i);
                  if (hourlyMatch) {
                    durationHours = parseInt(hourlyMatch[1]);
                  }
                }
              }
              
              // Calculate end time
              const totalMinutes = (pickupHour * 60 + pickupMinute) + (durationHours * 60);
              const endHour = Math.floor(totalMinutes / 60);
              const endMinute = totalMinutes % 60;
              const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
              
              // Validate times
              if (endHour >= 24) {
                console.warn(`Job ${job.id} ends after midnight (${endHour}:${endMinute}), clamping to 24:00`);
                // For jobs extending past midnight, clamp to end of day
                // In a real implementation, you might want to split these across days
              }
              
              // Create job block
              availabilityBlocksForDate.push({
                type: 'job',
                startTime,
                endTime: endHour >= 24 ? '24:00' : endTime,
                job,
                driverId: driver.id,
                date: dateString
              });
              
              if (process.env.NODE_ENV === 'development') {
                console.log(`Job ${job.id}: ${startTime} to ${endHour >= 24 ? '24:00' : endTime} (${durationHours} hours) | Service: ${job.service_type}`);
              }
            });
            
            // Fill remaining hours with available blocks
            for (let hour = 0; hour < 24; hour++) {
              const startTime = `${hour.toString().padStart(2, '0')}:00`;
              const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
              
              // Check if there's already a block for this time slot
              const hasExistingBlock = availabilityBlocksForDate.some(block => {
                const blockStartHour = parseInt(block.startTime.split(':')[0]);
                const blockEndHour = parseInt(block.endTime.split(':')[0]);
                return (blockStartHour <= hour && hour < blockEndHour);
              });
              
              if (!hasExistingBlock) {
                availabilityBlocksForDate.push({
                  type: 'available',
                  startTime,
                  endTime,
                  driverId: driver.id,
                  date: dateString
                });
              }
            }
          }
          
          // Log all blocks created for this driver/date
          if (process.env.NODE_ENV === 'development') {
            console.log(`  Created ${availabilityBlocksForDate.length} blocks for ${driver.name} on ${dateString}:`);
            availabilityBlocksForDate.forEach((block, idx) => {
              console.log(`    Block ${idx + 1}: ${block.type} ${block.startTime}-${block.endTime}${block.job ? ` (Job ${block.job.id})` : ''}${block.leave ? ` (Leave ${block.leave.id})` : ''}`);
            });
          }
          
          // Sort blocks by start time and type to ensure proper rendering order
          // Order: leave blocks first (so they appear underneath), then job blocks, then available/unavailable
          availabilityBlocksForDate.sort((a, b) => {
            // First sort by start time
            const aHour = parseInt(a.startTime.split(':')[0]);
            const bHour = parseInt(b.startTime.split(':')[0]);
            
            if (aHour !== bHour) {
              return aHour - bHour;
            }
            
            // If same start time, prioritize by type
            const getTypePriority = (type: string) => {
              switch(type) {
                case 'leave': return 1; // Leave at bottom
                case 'job': return 2;   // Job in middle
                default: return 3;      // Available/unavailable at top
              }
            };
            
            return getTypePriority(a.type) - getTypePriority(b.type);
          });
        });

        // Calculate today's stats - use the selected date as "today" for consistency with UI
        const selectedTodayDateString = format(selectedDate, 'yyyy-MM-dd');
        const todayJobs = (calendarData?.calendar_data?.[selectedTodayDateString]?.[driver.id] || []) as Job[];
        const todayStats = {
          totalJobs: todayJobs.length,
          totalHours: todayJobs.reduce((sum, job) => sum + 1, 0), // Simplified
          totalEarnings: todayJobs.reduce((sum, job) => sum + (parseFloat(job.base_price?.toString() || '0') || 0), 0),
          jobsByStatus: todayJobs.reduce((acc, job) => {
            acc[job.status || 'unknown'] = (acc[job.status || 'unknown'] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        };

        // Calculate yesterday's stats - use the day before the selected date
        const selectedYesterday = subDays(selectedDate, 1);
        const yesterdayDateString = format(selectedYesterday, 'yyyy-MM-dd');
        const yesterdayJobs = (calendarData?.calendar_data?.[yesterdayDateString]?.[driver.id] || []) as Job[];
        const yesterdayStats = {
          totalJobs: yesterdayJobs.length,
          totalHours: yesterdayJobs.reduce((sum, job) => sum + 1, 0), // Simplified
          totalEarnings: yesterdayJobs.reduce((sum, job) => sum + (parseFloat(job.base_price?.toString() || '0') || 0), 0),
          jobsByStatus: yesterdayJobs.reduce((acc, job) => {
            acc[job.status || 'unknown'] = (acc[job.status || 'unknown'] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        };

        // Combine all date-specific blocks into a single array
        const combinedAvailabilityBlocks: CalendarBlock[] = [];
        Object.values(allAvailabilityBlocks).forEach(blocks => {
          combinedAvailabilityBlocks.push(...blocks);
        });
        
        return {
          driver,
          availabilityBlocks: combinedAvailabilityBlocks,
          todayStats,
          yesterdayStats
        };
      });
  }, [drivers, calendarData, leaves, dateRange, driverStatusFilter, driversLoading, calendarLoading, leavesLoading]);

  const isLoading = driversLoading || calendarLoading || leavesLoading;

  // Navigation handlers
  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Tooltip component
  const BlockTooltip = () => {
    if (!hoveredBlock) return null;

    const { block, position } = hoveredBlock;
    const tooltipRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!tooltipRef.current) return;

      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x + 10;
      let newY = position.y + 10;

      if (newX + rect.width > viewportWidth) {
        newX = position.x - rect.width - 10;
      }
      if (newY + rect.height > viewportHeight) {
        newY = position.y - rect.height - 10;
      }

      tooltip.style.left = `${newX}px`;
      tooltip.style.top = `${newY}px`;
    }, [position]);

    return (
      <div
        ref={tooltipRef}
        className="fixed z-50 bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700 p-3 w-64 pointer-events-none"
      >
        {block.type === 'job' && block.job && (
          <>
            <div className="font-bold text-sm mb-2">Job #{block.job.id}</div>
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <UserIcon className="w-3 h-3 text-blue-400" />
                <span>{block.job.customer_name || 'No customer'}</span>
              </div>
              <div className="flex items-center gap-2">
                <TruckIcon className="w-3 h-3 text-blue-400" />
                <span>{block.job.service_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="w-3 h-3 text-blue-400" />
                <span>{block.startTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-3 h-3 text-blue-400" />
                <span className="truncate">{block.job.pickup_location}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-3 h-3 text-red-400" />
                <span className="truncate">{block.job.dropoff_location}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-700">
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(block.job.status || '')}`}>
                  {getStatusLabel(block.job.status || '')}
                </span>
              </div>
            </div>
          </>
        )}

        {block.type === 'leave' && block.leave && (
          <>
            <div className="font-bold text-sm mb-2">On Leave</div>
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3 h-3 text-orange-400" />
                <span>{getLeaveTypeLabel(block.leave.leave_type)}</span>
              </div>
              <div className="text-gray-300 text-xs">
                {format(new Date(block.leave.start_date), 'MMM d')} - {format(new Date(block.leave.end_date), 'MMM d')}
              </div>
              <div className="mt-1 pt-1 border-t border-gray-700">
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  block.leave.status === 'approved' ? 'bg-green-500/20 text-green-400' : 
                  block.leave.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {block.leave.status?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>
              {block.leave.reason && (
                <div className="text-gray-400 text-xs italic mt-1">
                  "{block.leave.reason}"
                </div>
              )}
            </div>
          </>
        )}

        {block.type === 'available' && (
          <div className="text-xs">
            <div className="font-bold mb-1">Available</div>
            <div className="text-gray-300">{block.startTime} - {block.endTime}</div>
          </div>
        )}
      </div>
    );
  };

  // Stats Card Component
  const StatsCard = ({ title, stats, isToday }: { title: string; stats: any; isToday: boolean }) => (
    <Card className="p-4 bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700">
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        {isToday ? (
          <CheckCircleIcon className="w-5 h-5 text-green-400" />
        ) : (
          <ClockIcon className="w-5 h-5 text-blue-400" />
        )}
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.totalJobs}</div>
          <div className="text-xs text-gray-400">Total Jobs</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">{stats.totalHours.toFixed(1)}</div>
          <div className="text-xs text-gray-400">Hours</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">${stats.totalEarnings.toFixed(2)}</div>
          <div className="text-xs text-gray-400">Total Earnings</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {Object.keys(stats.jobsByStatus).length}
          </div>
          <div className="text-xs text-gray-400">Status Types</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-1">Jobs by Status:</div>
        <div className="flex flex-wrap gap-1">
          {Object.entries(stats.jobsByStatus).length > 0 ? (
            Object.entries(stats.jobsByStatus).map(([status, count]) => (
              <span 
                key={status}
                className={`px-2 py-1 text-xs rounded-full ${getStatusColor(status as string)}`}
              >
                {getStatusLabel(status as string)}: {String(count)}
              </span>
            ))
          ) : (
            <span className="text-xs text-gray-500 italic">No jobs</span>
          )}
        </div>
      </div>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Handler for job block click
  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
  };
  
  // Close modal handler
  const closeModal = () => {
    setSelectedJob(null);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Driver Calendar</h1>
            <p className="text-gray-400">View driver schedules, availability, and performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push('/drivers')}
              variant="secondary"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <UsersIcon className="w-4 h-4 mr-2" />
              View All Drivers
            </Button>
          </div>
        </div>

        {/* Controls */}
        <Card className="p-4 mb-6 bg-gray-800/50 border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={goToPreviousDay}
                  variant="secondary"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </Button>
                <Button
                  onClick={goToToday}
                  variant="secondary"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Today
                </Button>
                <Button
                  onClick={goToNextDay}
                  variant="secondary"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-lg font-semibold text-white">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-300">Driver Status:</label>
              <select
                value={driverStatusFilter}
                onChange={(e) => setDriverStatusFilter(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Drivers</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Date Tabs Navigation */}
        <div className="mb-4">
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {dateRange.map((date, index) => {
              const isSelected = isSameDay(date, selectedDate);
              return (
                <button
                  key={index}
                  className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  onClick={() => setSelectedDate(date)}
                >
                  {format(date, 'EEE, MMM d')}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Timeline View */}
        <div className="overflow-x-auto bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="min-w-max w-full">
            {/* Timeline Header */}
            <div className="flex bg-gray-900/50">
              <div className="w-40 min-w-[10rem] flex-shrink-0"></div> {/* Space for driver info */}
              <div className="flex-1 grid grid-cols-12 gap-0">
                {Array.from({ length: 12 }, (_, i) => i * 2).map(hour => (
                  <div 
                    key={hour} 
                    className="text-center text-xs text-gray-400 py-2 border-r border-gray-600 last:border-r-0"
                  >
                    {hour}:00
                  </div>
                ))}
              </div>
            </div>
            
            {/* Driver Rows */}
            {driversWithAvailability.map(({ driver, availabilityBlocks, todayStats, yesterdayStats }) => {
              const dateString = format(selectedDate, 'yyyy-MM-dd');
              const driverBlocks = availabilityBlocks.filter(block => 
                block.date === dateString && block.driverId === driver.id
              );
              
              // Check if the driver has any leave for the entire day
              const hasAnyLeave = driverBlocks.some(block => block.type === 'leave');
              
              return (
                <div key={driver.id} className="flex border-b border-gray-700 last:border-b-0">
                  {/* Driver Info */}
                  <div className="w-48 min-w-[12rem] flex-shrink-0 py-3 pr-4 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                        {driver.name?.charAt(0).toUpperCase() || 'D'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-white text-sm truncate">{driver.name}</div>
                        <div className="text-xs text-gray-400 flex gap-2">
                          <span>Today: {todayStats.totalJobs} jobs, {todayStats.totalHours.toFixed(1)} hrs</span>
                          <span className="text-gray-600">|</span>
                          <span>Y'day: {yesterdayStats.totalJobs} jobs, {yesterdayStats.totalHours.toFixed(1)} hrs</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Timeline Grid */}
                  <div className="flex-1 grid grid-cols-12 gap-0 min-h-16">
                    {Array.from({ length: 12 }, (_, i) => i * 2).map(hour => {
                      const hourStart = `${hour.toString().padStart(2, '0')}:00`;
                      
                      // Find blocks that fall within this hour range (excluding 'available' blocks as they're handled by base availability)
                      const hourBlocks = driverBlocks.filter(block => {
                        const blockStartHour = parseInt(block.startTime.split(':')[0]);
                        return (blockStartHour === hour || blockStartHour === hour + 1) && block.type !== 'available';
                      });
                      
                      // If driver has any leave for the day, all time slots should be marked as unavailable
                      // unless there's a specific job block for that time slot
                      const hasLeaveForDay = hasAnyLeave;
                      
                      // Determine if this specific time slot should show as unavailable due to leave
                      // If the driver has any leave for the day, then all time slots should be unavailable
                      // unless there's a specific job in that time slot
                      const showAsUnavailableDueToLeave = hasLeaveForDay && hourBlocks.every(block => block.type !== 'job');
                      
                      return (
                        <div 
                          key={hour}
                          className="relative border-r border-gray-700 last:border-r-0 flex items-center justify-center min-h-16 bg-gray-800/30"
                        >
                          {/* Show base availability only if there are no blocks for this hour */}
                          {!hourBlocks.length && (
                            <>
                              {/* If driver has any leave for the day, show as unavailable */}
                              {hasLeaveForDay && (
                                <div className="w-full h-full bg-gray-700/50"></div>
                              )}
                              {/* If driver doesn't have leave, show as available - now with subtle styling */}
                              {!hasLeaveForDay && (
                                <div className="w-full h-full bg-gray-800/30 border border-gray-700/50"></div>
                              )}
                            </>
                          )}
                          
                          {hourBlocks.map((block, idx) => {
                            let bgColor = 'bg-gray-700/50';
                            let borderClass = 'border border-gray-500/30';
                            let textColor = 'text-gray-400';
                            let displayText = '';
                            
                            if (block.type === 'job') {
                              bgColor = 'bg-blue-500';
                              borderClass = 'border border-blue-400';
                              textColor = 'text-white';
                              displayText = `#${block.job?.id || 'Job'}`;
                              // Optionally, we can add more descriptive text like customer name or location
                              if (block.job?.customer_name) {
                                displayText += ` (${block.job.customer_name})`;
                              }
                            }
                            else if (block.type === 'leave') {
                              bgColor = 'bg-orange-500';
                              borderClass = 'border border-orange-400';
                              textColor = 'text-white';
                              displayText = 'Leave';
                            }
                            else if (block.type === 'unavailable') {
                              bgColor = 'bg-gray-700';
                              borderClass = 'border border-gray-600';
                              textColor = 'text-white';
                              displayText = '';
                            }
                            
                            // Calculate position based on start time
                            const startHour = parseInt(block.startTime.split(':')[0]);
                            const startMinute = parseInt(block.startTime.split(':')[1]);
                            const blockStartOffset = ((startHour * 60 + startMinute) / (24 * 60)) * 100; // Percentage of day
                            
                            // Calculate width based on duration
                            const [endHour, endMinute] = block.endTime.split(':').map(Number);
                            const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
                            
                            // Calculate percentage of 24-hour day (1440 minutes)
                            const durationPercentage = (durationMinutes / 1440) * 100;
                            
                            // Set minimum width for visibility (at least 2% for very short jobs)
                            // But make sure longer jobs get appropriately wider
                            const minPercentage = Math.max(2, Math.min(5, durationPercentage * 0.5));
                            const widthPercent = Math.max(minPercentage, durationPercentage);
                            
                            if (process.env.NODE_ENV === 'development') {
                              console.log(`Block ${block.type} (${block.job?.id || block.leave?.id || 'N/A'}): ${durationMinutes} mins = ${durationPercentage.toFixed(1)}%, final width: ${widthPercent.toFixed(1)}%`);
                              if (block.type === 'leave') {
                                console.log(`LEAVE BLOCK DEBUG: startTime=${block.startTime}, endTime=${block.endTime}, duration=${durationMinutes}mins, width=${widthPercent}%`);
                              }
                            }
                            
                            return (
                              <div
                                key={`${block.driverId}-${block.startTime}-${idx}`}
                                className={`absolute h-full ${bgColor} ${borderClass} cursor-pointer transition-all duration-200 hover:opacity-90 flex items-center text-sm ${textColor} overflow-hidden`}
                                style={{
                                  left: `${blockStartOffset}%`,
                                  width: `${widthPercent}%`,
                                  top: `${idx * 25}px`, // Fixed pixel height for consistent spacing
                                  minHeight: '24px',
                                  maxHeight: '24px',
                                  maxWidth: '100%'
                                }}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredBlock({
                                    block,
                                    position: { x: rect.left, y: rect.bottom + 10 }
                                  });
                                }}
                                onMouseLeave={() => setHoveredBlock(null)}
                                onClick={() => {
                                  if (block.type === 'job' && block.job) {
                                    handleJobClick(block.job);
                                  }
                                }}
                              >
                                <span className="truncate px-1 font-medium">{displayText}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        
        {driversWithAvailability.length === 0 && (
          <Card className="p-12 text-center bg-gray-800/30 border-gray-700">
            <CalendarIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No drivers found</h3>
            <p className="text-gray-500 mb-6">
              {driverStatusFilter === 'all' 
                ? 'No drivers in the system.' 
                : `No ${driverStatusFilter} drivers found.`}
            </p>
            <Button
              onClick={() => router.push('/drivers/new')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserIcon className="w-4 h-4 mr-2" />
              Add Driver
            </Button>
          </Card>
        )}
      </div>

      {hoveredBlock && <BlockTooltip />}
      
      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-white">Job Details</h2>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-lg"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <h3 className="font-semibold text-gray-300 mb-2">Job Information</h3>
                  <div className="space-y-2">
                    <div className="flex">
                      <span className="text-gray-400 w-32">Job ID:</span>
                      <span className="text-white">#{selectedJob.id}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-400 w-32">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedJob.status || '')}`}>
                        {getStatusLabel(selectedJob.status || '')}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-400 w-32">Service Type:</span>
                      <span className="text-white">{selectedJob.service_type}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-400 w-32">Base Price:</span>
                      <span className="text-white">${selectedJob.base_price}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <h3 className="font-semibold text-gray-300 mb-2">Customer Information</h3>
                  <div className="space-y-2">
                    <div className="flex">
                      <span className="text-gray-400 w-32">Name:</span>
                      <span className="text-white">{selectedJob.customer_name}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-400 w-32">Phone:</span>
                      <span className="text-white">{selectedJob.customer_mobile}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-400 w-32">Email:</span>
                      <span className="text-white">{selectedJob.passenger_email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <h3 className="font-semibold text-gray-300 mb-2">Pickup Information</h3>
                  <div className="space-y-2">
                    <div className="flex">
                      <span className="text-gray-400 w-32">Date:</span>
                      <span className="text-white">{selectedJob.pickup_date}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-400 w-32">Time:</span>
                      <span className="text-white">{selectedJob.pickup_time}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-400 w-32">Location:</span>
                      <span className="text-white">{selectedJob.pickup_location}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-gray-700/50 rounded-lg">
                  <h3 className="font-semibold text-gray-300 mb-2">Dropoff Information</h3>
                  <div className="space-y-2">
                    <div className="flex">
                      <span className="text-gray-400 w-32">Location:</span>
                      <span className="text-white">{selectedJob.dropoff_location}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-400 w-32">Passenger:</span>
                      <span className="text-white">{selectedJob.passenger_name}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-400 w-32">Contact:</span>
                      <span className="text-white">{selectedJob.passenger_mobile}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={closeModal}
                  className="border border-gray-600 text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}