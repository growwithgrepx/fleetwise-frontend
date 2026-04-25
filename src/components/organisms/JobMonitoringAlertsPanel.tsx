import React, { useState, useMemo, useEffect } from "react";
import { useJobMonitoring } from "@/hooks/useJobMonitoring";
import { useUser } from '@/context/UserContext';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import JobDetailsModal from './JobDetailsModal';
import { getDisplayTimezone } from '@/utils/timezoneUtils';

// Helper function to format pickup time - handles both display timezone time and UTC ISO formats
const formatPickupTimeInDisplayTimezone = (pickupTimeValue: string, displayTimezone: string): string => {
  try {
    // Check if it's a UTC ISO string (contains 'T' and 'Z')
    if (pickupTimeValue.includes('T') && pickupTimeValue.includes('Z')) {
      // Parse UTC ISO string (e.g., "2026-03-01T00:20Z")
      const date = new Date(pickupTimeValue);
      
      // Format using Intl API with the display timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: displayTimezone,
      });
      
      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const day = parts.find(p => p.type === 'day')?.value;
      const hour = parts.find(p => p.type === 'hour')?.value;
      const minute = parts.find(p => p.type === 'minute')?.value;
      
      return `${year}-${month}-${day}, ${hour}:${minute}`;
    } else if (pickupTimeValue.match(/^\d{4}-\d{2}-\d{2}, \d{2}:\d{2}$/)) {
      // If it's already in format "YYYY-MM-DD, HH:MM", extract date and time parts separately
      // and use the same conversion method as in normalizeJobForDisplay
      const [datePart, timePart] = pickupTimeValue.split(', ');
      
      // API already returns time in display timezone - use as-is
      // No conversion needed
      return `${datePart}, ${timePart}`;
    } else if (pickupTimeValue.match(/^\d{2}:\d{2}$/)) {
      // If it's just a time format "HH:MM", we need to combine with today's date to properly convert
      const [hour, minute] = pickupTimeValue.split(':').map(Number);
      
      // Since we only have time without date, we need to make assumptions.
      // The safest approach is to treat it as a time that needs proper timezone handling
      // For this case, we'll construct a date with the current date to allow timezone conversion
      const now = new Date();
      const dateWithTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
      
      // Format using Intl API with the display timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: displayTimezone,
      });
      
      return formatter.format(dateWithTime);
    } else {
      // Display timezone time format (e.g., "20:20" or "2026-03-01, 20:20")
      return pickupTimeValue;
    }
  } catch (error) {
    console.error('[JobMonitoringAlertsPanel] Error formatting pickup time:', error);
    // Fallback: just return the value as-is
    return pickupTimeValue;
  }
};

const JobMonitoringAlertsPanel = () => {
  const { alerts, startTrip, dismissAlert, isLoading: alertsLoading, error: alertsError, alertSettings } = useJobMonitoring();
  const { isLoggedIn, isLoading: userLoading } = useUser();

  const [expandedAlerts, setExpandedAlerts] = useState<Record<number, boolean>>(
    {}
  );
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isJobDetailsModalOpen, setIsJobDetailsModalOpen] = useState(false);
  const [startingTripAlerts, setStartingTripAlerts] = useState<Set<number>>(new Set());
  const [dismissingAlerts, setDismissingAlerts] = useState<Set<number>>(new Set());
  const [jobDetailsMap] = useState<Record<number, ApiJob | null>>({});

  // Optimize filtering to avoid repeated calculations
  const activeAlerts = useMemo(() => {
    return alerts.filter(alert => !alert.dismissed);
  }, [alerts]);

  // Driver names come directly from alert data — no extra getJobById calls needed

  // Check if visual alerts are enabled (default to true if not specified)
  const visualAlertsEnabled = alertSettings?.alert_settings?.enable_visual_alerts ?? true;

  // Don't render anything if user is not authenticated or still loading
  if (userLoading || !isLoggedIn) {
    return null;
  }

  // Don't render the panel if visual alerts are disabled
  if (!visualAlertsEnabled) {
    // Optionally show a subtle indicator that alerts exist but are hidden
    // For now, we'll just return null - the backend sends them, we just don't display them
    return null;
  }
  const toggleExpand = (id: number) => {
    setExpandedAlerts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatElapsedTime = (minutes: number) => {
    if (minutes < 0) {
      // Negative minutes means job is upcoming (in the future)
      const absMinutes = Math.abs(minutes);
      if (absMinutes < 60) return `in ${absMinutes}m`;
      if (absMinutes < 1440) {
        const hours = Math.floor(absMinutes / 60);
        const remainingMinutes = absMinutes % 60;
        return remainingMinutes > 0
          ? `in ${hours}h ${remainingMinutes}m`
          : `in ${hours}h`;
      }
      const days = Math.floor(absMinutes / 1440);
      const remainingHours = Math.floor((absMinutes % 1440) / 60);
      return remainingHours > 0 ? `in ${days}d ${remainingHours}h` : `in ${days}d`;
    }

    // Positive minutes means job is late (past pickup time)
    if (minutes < 60) return `${minutes}m late`;
    if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m late`
        : `${hours}h late`;
    }

    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    return remainingHours > 0 ? `${days}d ${remainingHours}h late` : `${days}d late`;
  };

  const getTimingTagStyle = (minutes: number) => {
    // Early = yellow tag, Late = red tag
    if (minutes < 0) {
      return "bg-yellow-500/15 text-yellow-300 border border-yellow-500/25";
    }
    return "bg-red-500/15 text-red-300 border border-red-500/25";
  };

  return (
    <>
      <div className="col-span-full sm:col-span-3">
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-1 h-8 bg-gradient-to-b from-red-400 to-red-600 rounded-full"></div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Active Monitoring Alerts
              </h3>
              <p className="text-xs sm:text-sm text-gray-400">
                Jobs requiring immediate attention
              </p>
            </div>
          </div>

          <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-red-600/15 text-red-300 text-xs sm:text-sm font-medium rounded-full border border-red-600/25 whitespace-nowrap">
            {activeAlerts.length} alerts
          </span>
        </div>

        {/* Alerts */}
        {activeAlerts && activeAlerts.length > 0 ? (
          <div className="max-h-[300px] sm:max-h-[350px] md:max-h-[410px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {activeAlerts.map((alert) => {
                const elapsed = Math.floor(alert.elapsedTime);

                return (
                  <div
                    key={alert.id}
                    className="rounded-lg sm:rounded-xl border border-gray-700 bg-gray-900/40 hover:bg-gray-900/60 transition-colors p-3 sm:p-4"
                  >
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold text-sm sm:text-base">
                            Job #{alert.jobId}
                          </span>

                          {/* TEMPORARILY HIDDEN: Elapsed time display */}
                          {/* <span
                            className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${getTimingTagStyle(
                              elapsed
                            )}`}
                          >
                            {formatElapsedTime(elapsed)}
                          </span> */}
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                          <span className="truncate">{alert.driverName && alert.driverName !== 'Unassigned' ? alert.driverName : (alert.jobData?.driver?.name || 'Unassigned')}</span>
                        </div>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={() => toggleExpand(alert.id)}
                        className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/40 transition"
                        aria-label={expandedAlerts[alert.id] ? "Collapse" : "Expand"}
                      >
                        {expandedAlerts[alert.id] ? (
                          <ChevronUpIcon className="h-5 w-5" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    {/* Expanded Info */}
                    {expandedAlerts[alert.id] && (
                      <div className="mt-3 pt-3 border-t border-gray-700 text-sm space-y-2">
                        <div className="flex items-center gap-2 text-gray-300">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-400">Pickup:</span>
                          <span className="ml-auto text-gray-200">
                            {alert.pickupDate ? formatPickupTimeInDisplayTimezone(`${alert.pickupDate}, ${alert.pickupTime}`, getDisplayTimezone()) : formatPickupTimeInDisplayTimezone(alert.pickupTime, getDisplayTimezone())}
                          </span>
                        </div>

                        <div className="text-gray-300">
                          <span className="text-gray-400">Passenger:</span>{" "}
                          <span className="text-gray-200">
                            {alert.passengerDetails || alert.jobData?.customer?.name || alert.jobData?.customer_name || 'Not assigned'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons (bottom row) */}
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedJobId(alert.jobId);
                          setIsJobDetailsModalOpen(true);
                        }}
                        className="flex-1 text-xs sm:text-sm bg-blue-600/90 hover:bg-blue-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition font-medium"
                        title="View Job Details"
                      >
                        View Details
                      </button>

                      <button
                        onClick={async () => {
                          setStartingTripAlerts(prev => new Set(prev).add(alert.id));
                          try {
                            await startTrip(alert.jobId);
                          } finally {
                            setStartingTripAlerts(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(alert.id);
                              return newSet;
                            });
                          }
                        }}
                        disabled={startingTripAlerts.has(alert.id)}
                        className="flex-1 text-xs sm:text-sm bg-green-600/90 hover:bg-green-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {startingTripAlerts.has(alert.id) ? "Starting..." : "Start Trip"}
                      </button>

                      <button
                        onClick={async () => {
                          setDismissingAlerts(prev => new Set(prev).add(alert.id));
                          try {
                            await dismissAlert(alert.id);
                          } catch (error) {
                            console.error('Error dismissing alert:', error);
                          } finally {
                            setDismissingAlerts(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(alert.id);
                              return newSet;
                            });
                          }
                        }}
                        disabled={dismissingAlerts.has(alert.id)}
                        className="text-xs sm:text-sm bg-red-600/90 hover:bg-red-600 text-white px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Dismiss Alert"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No active monitoring alerts 🎉</p>
          </div>
        )}
      </div>
    </div>
    
    {isJobDetailsModalOpen && (
      <JobDetailsModal
        isOpen={isJobDetailsModalOpen}
        jobId={selectedJobId}
        onClose={() => {
          setIsJobDetailsModalOpen(false);
          setSelectedJobId(null);
        }}
      />
    )}

  </>);
}

export default JobMonitoringAlertsPanel;