import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, closestCenter } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { getJobsCalendar, rescheduleJob, CalendarJob } from '@/services/api/jobsApi';
import { Card } from '@/components/atoms/Card';
import { Spinner } from '@/components/atoms/Spinner';
import { Button } from '@/components/atoms/Button';
import { convertUtcToDisplayTime } from '@/utils/timezoneUtils';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { 
  CalendarIcon, ClockIcon, UserIcon, MapPinIcon, TruckIcon, 
  UserGroupIcon, BriefcaseIcon,
  ChevronLeftIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon
} from '@heroicons/react/24/outline';

// Status colors - matching the dashboard
const STATUS_COLORS: { [key: string]: string } = {
  canceled: '#a1a1aa', // Gray
  completed: '#22c55e', // Green
  'on the scene': '#6366f1', // Indigo
  ots: '#6366f1', // Indigo
  'on the way': '#3b82f6', // Blue
  otw: '#3b82f6', // Blue
  pending: '#fbbf24', // Yellow
  confirmed: '#06b6d4', // Cyan
  pob: '#f59e42', // Orange
  jc: '#16a34a', // Emerald
  sd: '#f472b6', // Pink
  new: '#818cf8', // Violet
  other: '#64748b', // Slate
  default: '#64748b', // Slate
};

// Brighter border colors for job chips
const STATUS_BORDER_COLORS: { [key: string]: string } = {
    canceled: '#d4d4d8',
    completed: '#86efac',
    'on the scene': '#a5b4fc',
    ots: '#a5b4fc',
    'on the way': '#93c5fd',
    otw: '#93c5fd',
    pending: '#fcd34d',
    confirmed: '#67e8f9',
    pob: '#fdba74',
    jc: '#4ade80',
    sd: '#f9a8d4',
    new: '#c4b5fd',
    other: '#94a3b8',
    default: '#94a3b8',
};

// Status labels for better display
const STATUS_LABELS: { [key: string]: string } = {
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

// Time slots for the timeline (hours)
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours

// Helper to format time for display
const formatTime = (time: string): string => {
  try {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) {
    return time;
  }
};

// Helper to get position percentage for a time
const getTimePosition = (time: string): number => {
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    // Calculate position as percentage (0-24 hours = 1440 minutes)
    return (totalMinutes / 1440) * 100;
  } catch (e) {
    return 0;
  }
};

// Helper to calculate job block width based on duration
const calculateJobBlockWidth = (pickupTime: string, dropoffTime?: string): number => {
  try {
    // Business Rule: One calendar cell = 120 minutes
    // Default trip duration = 45 minutes (0.375 cells)
    // Minimum visible block = 45 minutes
    const CELL_TIME_SPAN = 120; // minutes per cell
    const MIN_VISIBLE_DURATION = 45; // minimum minutes for visibility
    
    let durationMinutes: number;
    
    if (dropoffTime) {
      // Calculate actual duration from pickup to dropoff
      const [pickupHours, pickupMinutes] = pickupTime.split(':').map(Number);
      const [dropoffHours, dropoffMinutes] = dropoffTime.split(':').map(Number);
      
      const pickupTotalMinutes = pickupHours * 60 + pickupMinutes;
      const dropoffTotalMinutes = dropoffHours * 60 + dropoffMinutes;
      
      // Handle same-day jobs (dropoff after pickup)
      durationMinutes = dropoffTotalMinutes - pickupTotalMinutes;
      
      // If negative or zero, use default 45 minutes
      if (durationMinutes <= 0) {
        durationMinutes = 45;
      }
    } else {
      // No dropoff time specified, use default 45 minutes
      durationMinutes = 45;
    }
    
    // Apply minimum visible duration
    const displayDurationMinutes = Math.max(MIN_VISIBLE_DURATION, durationMinutes);
    
    // Calculate width as percentage of cell time span
    const widthPercent = (displayDurationMinutes / CELL_TIME_SPAN) * 100;
    
    // Return minimum 3.75% (45min/120min) for visibility
    return Math.max(3.75, widthPercent);
  } catch (e) {
    // Fallback to default 45 minutes (3.75% of 120-minute cell)
    return 3.75;
  }
};

// Helper to get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

// Define ActionButton component locally
const ActionButton = ({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'default',
  icon,
  disabled = false
}: { 
  children: React.ReactNode; 
  onClick: () => void; 
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'default';
  icon?: React.ReactNode;
  disabled?: boolean;
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    className={`rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1
      ${size === 'small' ? 'px-2 py-1' : 'px-3 py-1.5'}
      ${variant === 'primary'
        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
        : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600 hover:border-gray-500'
      }
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    `}
  >
    {icon && <span className="w-3.5 h-3.5">{icon}</span>}
    {children}
  </Button>
);

interface DriverCalendarViewProps {
  days?: number;
  className?: string;
}

const DriverCalendarView: React.FC<DriverCalendarViewProps> = ({ days = 2, className = '' }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [hoveredJob, setHoveredJob] = useState<{ job: CalendarJob; date: string; position: { x: number; y: number } } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Set tomorrow as the default date
  const tomorrow = useMemo(() => {
    const date = new Date();
    return addDays(date, 1);
  }, []);
  
  const dayAfterTomorrow = useMemo(() => {
    return addDays(tomorrow, 1);
  }, [tomorrow]);
  
  // State for selected date and pagination
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const driversPerPage = 10;

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before activation
      },
    })
  );

  // Fetch calendar data - override the date range to be tomorrow and day after
  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobs', 'calendar', days],
    queryFn: async () => {
      const response = await getJobsCalendar(days);
      return response;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Format date range for display - override with tomorrow and day after tomorrow
  const dateRange = useMemo(() => {
    // Create our own date range regardless of what the API returns
    return [
      {
        full: format(tomorrow, 'yyyy-MM-dd'),
        display: format(tomorrow, 'EEE, MMM d'),
        shortDisplay: format(tomorrow, 'EEE'),
        date: tomorrow
      },
      {
        full: format(dayAfterTomorrow, 'yyyy-MM-dd'),
        display: format(dayAfterTomorrow, 'EEE, MMM d'),
        shortDisplay: format(dayAfterTomorrow, 'EEE'),
        date: dayAfterTomorrow
      }
    ];
  }, [tomorrow, dayAfterTomorrow]);

  // Set selected date to tomorrow by default
  useEffect(() => {
    if (dateRange.length > 0 && !selectedDate) {
      setSelectedDate(dateRange[0].full);
    }
  }, [dateRange, selectedDate]);

  // Mutation for rescheduling jobs
  const rescheduleMutation = useMutation({
    mutationFn: ({ jobId, newDate, newTime }: { jobId: number; newDate: string; newTime: string }) =>
      rescheduleJob(jobId, newDate, newTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'calendar'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  // Process driver data with jobs for all dates
  const driversWithJobs = useMemo(() => {
    if (!data || !data.drivers) return [];

    // Map all drivers, including those without jobs
    return data.drivers.map(driver => {
      const driverJobs: { [date: string]: CalendarJob[] } = {};
      
      // Get jobs for each date
      dateRange.forEach(date => {
        const dateJobs = data.calendar_data?.[date.full]?.[driver.id] || [];
        driverJobs[date.full] = dateJobs;
      });
      
      // Calculate total jobs
      const totalJobs = Object.values(driverJobs).reduce(
        (sum, jobs) => sum + jobs.length, 0
      );
      
      return {
        ...driver,
        jobs: driverJobs,
        totalJobs
      };
    });
  }, [data, dateRange]);

  // Pagination logic
  const paginatedDrivers = useMemo(() => {
    const startIndex = (currentPage - 1) * driversPerPage;
    const endIndex = startIndex + driversPerPage;
    return driversWithJobs.slice(startIndex, endIndex);
  }, [driversWithJobs, currentPage, driversPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(driversWithJobs.length / driversPerPage);
  }, [driversWithJobs.length, driversPerPage]);

  // Handle drag end event
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (!active || !over || !data) return;
    
    const draggableId = active.id;
    const droppableId = over.id;
    
    // Extract job ID, date and source info
    const [jobId, sourceDate, sourceDriverId] = draggableId.split('_');
    
    // Extract target date, driver and time
    const [targetDate, targetDriverId, targetHour, targetMinute] = droppableId.split('_');
    
    // Find the job in the calendar data
    const job = data.calendar_data?.[sourceDate]?.[sourceDriverId]?.find(
      j => j.id === parseInt(jobId)
    );
    
    if (!job) return;
    
    // Calculate new time
    const newTime = `${targetHour.padStart(2, '0')}:${targetMinute || '00'}`;
    
    // Update job schedule
    rescheduleMutation.mutate({
      jobId: parseInt(jobId),
      newDate: targetDate,
      newTime
    });
    
    // Reset active drag item
    setActiveId(null);
  };

  // Empty state component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center p-8 h-64 text-center">
      <CalendarIcon className="w-12 h-12 text-gray-400 mb-4" />
      <p className="text-gray-400 text-lg font-medium mb-2">No scheduled jobs</p>
      <p className="text-gray-500 text-sm mb-4">No jobs scheduled for the selected days</p>
      <ActionButton 
        onClick={() => router.push('/jobs/new')}
        icon={<BriefcaseIcon />}
      >
        Schedule a Job
      </ActionButton>
    </div>
  );

  // Loading state component
  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center p-8 h-64">
      <div className="w-8 h-8">
        <Spinner />
      </div>
      <p className="text-gray-400 mt-4">Loading driver data...</p>
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center p-8 h-64 text-center">
      <div className="text-red-500 mb-4">⚠️</div>
      <p className="text-red-500 text-lg font-medium mb-2">Failed to load data</p>
      <p className="text-gray-500 text-sm mb-4">There was an error loading the driver data</p>
      <ActionButton onClick={() => queryClient.invalidateQueries({ queryKey: ['jobs', 'calendar'] })}>
        Try Again
      </ActionButton>
    </div>
  );

  // Job tooltip component
  const JobTooltip = () => {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({
      opacity: 0, // Start hidden
      position: 'fixed',
      top: 0,
      left: 0,
    });

    useEffect(() => {
      if (!hoveredJob || !tooltipRef.current) return;

      const { position } = hoveredJob;
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let newX = position.x + 15;
      let newY = position.y + 15;

      // Adjust if it overflows right
      if (newX + tooltipRect.width > viewportWidth - 10) {
        newX = position.x - tooltipRect.width - 15;
      }
      // Adjust if it overflows left
      if (newX < 10) {
        newX = 10;
      }
      // Adjust if it overflows bottom
      if (newY + tooltipRect.height > viewportHeight - 10) {
        newY = position.y - tooltipRect.height - 15;
      }
      // Adjust if it overflows top
      if (newY < 10) {
        newY = 10;
      }

      setStyle({
        position: 'fixed',
        top: `${newY}px`,
        left: `${newX}px`,
        opacity: 1,
        transition: 'opacity 0.2s',
      });
    }, [hoveredJob]);

    if (!hoveredJob) return null;

    const { job, date, position } = hoveredJob;

    return (
      <div
        ref={tooltipRef}
        className="z-50 bg-gray-900 text-white rounded-lg shadow-xl border border-gray-700 p-3 w-64 pointer-events-none"
        style={style}
      >
        <div className="font-bold text-sm mb-1">Job #{job.id}</div>
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-1">
            <UserIcon className="w-3 h-3 text-blue-400" />
            <span>{job.customer_name || 'No customer'}</span>
          </div>
          <div className="flex items-center gap-1">
            <TruckIcon className="w-3 h-3 text-blue-400" />
            <span>{job.service_type}</span>
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3 text-blue-400" />
            <span>{convertUtcToDisplayTime(job.pickup_time, date)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPinIcon className="w-3 h-3 text-blue-400" />
            <span className="truncate">{job.pickup_location}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPinIcon className="w-3 h-3 text-red-400" />
            <span className="truncate">{job.dropoff_location}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700">
            <span className="inline-block px-2 py-1 text-xs rounded-full" style={{ backgroundColor: STATUS_COLORS[job.status] || STATUS_COLORS.default }}>
              {STATUS_LABELS[job.status] || job.status}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Job chip component - small, draggable job indicator positioned on timeline
  const JobChip = ({ job, date, driverId }: { job: CalendarJob; date: string; driverId: string | number }) => {
    const statusColor = STATUS_COLORS[job.status] || STATUS_COLORS.default;
    const borderColor = STATUS_BORDER_COLORS[job.status] || STATUS_BORDER_COLORS.default;
    const draggableId = `${job.id}_${date}_${driverId}`;
    // Position based on pickup_time (driver start time)
    const position = getTimePosition(job.pickup_time);
    
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: draggableId,
      data: { job, date, driverId }
    });
    
    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      backgroundColor: statusColor,
      borderColor: borderColor,
      opacity: isDragging ? 0.5 : 1,
      left: `${position}%`
    } : {
      backgroundColor: statusColor,
      borderColor: borderColor,
      left: `${position}%`
    };
    
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="absolute top-1/2 -translate-y-1/2 h-8 w-8 rounded-full cursor-grab active:cursor-grabbing shadow-lg border-2 transition-transform duration-200 hover:scale-125 flex items-center justify-center text-xs text-white font-bold z-10"
        style={style}
        onMouseEnter={(e) => setHoveredJob({ 
          job, 
          date,
          position: { x: e.clientX, y: e.clientY } 
        })}
        onMouseLeave={() => setHoveredJob(null)}
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/jobs/${job.id}`);
        }}
      >
        {job.id % 100}
      </div>
    );
  };

  // Droppable time slot on timeline
  const TimeSlot = ({ date, driverId, hour, minute = 0 }: { date: string; driverId: string | number; hour: number; minute?: number }) => {
    const droppableId = `${date}_${driverId}_${hour}_${minute}`;
    
    const { setNodeRef, isOver } = useDroppable({
      id: droppableId
    });
    
    return (
      <div
        ref={setNodeRef}
        className={`absolute h-full w-[2%] ${isOver ? 'bg-blue-900/20' : 'hover:bg-gray-800/20'} transition-colors duration-200`}
        style={{ 
          left: `${getTimePosition(`${hour}:${minute}`)}%`,
        }}
      />
    );
  };

  // Timeline component for a single day
  const DayTimeline = ({ date, driverId, jobs }: { date: string; driverId: string | number; jobs: CalendarJob[] }) => {
    return (
      <div className="relative h-12 bg-gray-800/50 rounded border border-gray-700 overflow-hidden">
        {/* Background hour markers */}
        {TIME_SLOTS.filter(hour => hour % 2 === 0).map(hour => (
          <div 
            key={hour} 
            className="absolute h-full border-l border-gray-700/50"
            style={{ left: `${getTimePosition(`${hour}:00`)}%` }}
          />
        ))}
        
        {/* Droppable time slots - every hour */}
        {TIME_SLOTS.map(hour => (
          <React.Fragment key={`drop-${hour}`}>
            <TimeSlot date={date} driverId={driverId} hour={hour} minute={0} />
            <TimeSlot date={date} driverId={driverId} hour={hour} minute={30} />
          </React.Fragment>
        ))}
        
        {/* Job chips */}
        {jobs.map(job => (
          <JobChip key={job.id} job={job} date={date} driverId={driverId} />
        ))}
      </div>
    );
  };

  // Driver row component with timeline for selected date
  const DriverRow = ({ driver }: { driver: any }) => {
    return (
      <div className="flex items-center gap-3 mb-3 p-2 bg-gray-900/30 rounded-lg border border-gray-800 hover:border-gray-700 transition-all duration-200">
        {/* Driver info */}
        <div className="flex items-center gap-2 w-48">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
            {getInitials(driver.name)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-white truncate">{driver.name}</h4>
            <div className="text-[10px] text-gray-400">
              {driver.jobs[selectedDate]?.length || 0} {driver.jobs[selectedDate]?.length === 1 ? 'job' : 'jobs'}
            </div>
          </div>
        </div>
        
        {/* Timeline for selected date only */}
        <div className="flex-1">
          <DayTimeline 
            date={selectedDate} 
            driverId={driver.id} 
            jobs={driver.jobs[selectedDate] || []} 
          />
        </div>
      </div>
    );
  };

  // Find active job for drag overlay
  const findActiveJob = () => {
    if (!activeId || !data) return null;
    
    const [jobId, date, driverId] = activeId.split('_');
    return data.calendar_data?.[date]?.[driverId]?.find(j => j.id === parseInt(jobId));
  };

  // Pagination controls
  const PaginationControls = () => (
    <div className="flex items-center justify-between mt-4 px-2">
      <div className="text-sm text-gray-400">
        Showing {paginatedDrivers.length} of {driversWithJobs.length} drivers
      </div>
      <div className="flex items-center gap-2">
        <ActionButton
          onClick={() => setCurrentPage(1)}
          variant="secondary"
          size="small"
          icon={<ChevronDoubleLeftIcon />}
          disabled={currentPage === 1}
        >
          First
        </ActionButton>
        <ActionButton
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          variant="secondary"
          size="small"
          icon={<ChevronLeftIcon />}
          disabled={currentPage === 1}
        >
          Prev
        </ActionButton>
        <span className="text-sm text-gray-300 mx-2">
          Page {currentPage} of {totalPages}
        </span>
        <ActionButton
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          variant="secondary"
          size="small"
          disabled={currentPage === totalPages}
        >
          Next
        </ActionButton>
        <ActionButton
          onClick={() => setCurrentPage(totalPages)}
          variant="secondary"
          size="small"
          icon={<ChevronDoubleRightIcon />}
          disabled={currentPage === totalPages}
        >
          Last
        </ActionButton>
      </div>
    </div>
  );

  // Main render
  return (
    <Card className={`p-6 shadow-xl border border-gray-700 bg-gradient-to-br from-background-light to-background-dark overflow-hidden ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Driver Calendar View</h2>
        <div className="flex items-center gap-2">
          <ActionButton 
            onClick={() => router.push('/drivers')} 
            variant="secondary"
            icon={<UserGroupIcon className="w-4 h-4" />}
          >
            View All Drivers
          </ActionButton>
        </div>
      </div>
      
      {/* Date tabs */}
      {dateRange.length > 0 && (
        <div className="flex border-b border-gray-700 mb-4">
          {dateRange.map(date => (
            <button
              key={date.full}
              className={`px-4 py-2 text-sm font-medium transition-colors duration-200 relative
                ${selectedDate === date.full 
                  ? 'text-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
                }`}
              onClick={() => setSelectedDate(date.full)}
            >
              {date.display}
              {selectedDate === date.full && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500"></div>
              )}
            </button>
          ))}
        </div>
      )}
      
      {/* Time header */}
      <div className="flex mb-4 pl-48 pr-20">
        <div className="flex-1 relative h-6 border-b border-gray-700/30">
          {/* Time markers - every 2 hours */}
          {TIME_SLOTS.filter(hour => hour % 2 === 0).map(hour => (
            <div 
              key={hour} 
              className="absolute text-[10px] text-white font-bold"
              style={{ left: `${getTimePosition(`${hour}:00`)}%` }}
            >
              {hour}:00
            </div>
          ))}
        </div>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState />}
      
      {!isLoading && !isError && data && (
        driversWithJobs.length === 0 ? (
          <EmptyState />
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => setActiveId(event.active.id as string)}
            onDragEnd={handleDragEnd}
          >
            <div className="max-h-[400px] overflow-y-auto pr-1">
              {paginatedDrivers.map(driver => (
                <DriverRow key={driver.id} driver={driver} />
              ))}
            </div>
            
            {totalPages > 1 && <PaginationControls />}
            
            <DragOverlay>
              {activeId && (() => {
                const activeJob = findActiveJob();
                if (!activeJob) return null;
                
                const statusColor = STATUS_COLORS[activeJob.status] || STATUS_COLORS.default;
                const borderColor = STATUS_BORDER_COLORS[activeJob.status] || STATUS_BORDER_COLORS.default;
                
                return (
                  <div 
                    className="h-8 w-8 rounded-full shadow-lg border-2 flex items-center justify-center text-xs text-white font-bold"
                    style={{
                      backgroundColor: statusColor,
                      borderColor: borderColor,
                    }}
                  >
                    {activeJob.id % 100}
                  </div>
                );
              })()}
            </DragOverlay>
          </DndContext>
        )
      )}

      {hoveredJob && <JobTooltip />}
    </Card>
  );
};

export default DriverCalendarView;
