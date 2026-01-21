import React, { useState } from "react";
import { useJobMonitoring } from "@/hooks/useJobMonitoring";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import JobDetailsModal from "./JobDetailsModal";
import { ApiJob } from "@/types/job";

const JobMonitoringAlertsPanel = () => {
  const { alerts, startTrip, dismissAlert } = useJobMonitoring();

  const [expandedAlerts, setExpandedAlerts] = useState<Record<number, boolean>>(
    {}
  );
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedJobData, setSelectedJobData] = useState<ApiJob | undefined>(undefined);
  const [isJobDetailsModalOpen, setIsJobDetailsModalOpen] = useState(false);
  const [startingTripAlerts, setStartingTripAlerts] = useState<Set<number>>(new Set());
  const [dismissingAlerts, setDismissingAlerts] = useState<Set<number>>(new Set());
  const toggleExpand = (id: number) => {
    setExpandedAlerts((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatElapsedTime = (minutes: number) => {
    if (minutes < 0) {
      const absMinutes = Math.abs(minutes);
      if (absMinutes < 60) return `${absMinutes} min early`;
      if (absMinutes < 1440) {
        const hours = Math.floor(absMinutes / 60);
        const remainingMinutes = absMinutes % 60;
        return remainingMinutes > 0
          ? `${hours}h ${remainingMinutes}m early`
          : `${hours}h early`;
      }
      const days = Math.floor(absMinutes / 1440);
      const remainingHours = Math.floor((absMinutes % 1440) / 60);
      return remainingHours > 0 ? `${days}d ${remainingHours}h early` : `${days}d early`;
    }

    if (minutes < 60) return `${minutes} min late`;
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
      <div className="col-span-3 px-8">
        <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-5 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Active Monitoring Alerts
              </h3>
              <p className="text-xs text-gray-400">
                Jobs requiring immediate attention
              </p>
            </div>
          </div>

          <span className="px-3 py-1 bg-red-600/15 text-red-300 text-sm font-medium rounded-full border border-red-600/25">
            {alerts.length} alerts
          </span>
        </div>

        {/* Alerts */}
        {alerts && alerts.length > 0 ? (
          <div className="max-h-[410px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {alerts.map((alert) => {
                const elapsed = Math.floor(alert.elapsedTime);

                return (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-gray-700 bg-gray-900/40 hover:bg-gray-900/60 transition-colors p-4"
                  >
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold">
                            Job #{alert.jobId}
                          </span>

                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getTimingTagStyle(
                              elapsed
                            )}`}
                          >
                            {formatElapsedTime(elapsed)}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                          <span className="truncate">{alert.driverName}</span>
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
                            {new Date(alert.pickupTime).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-gray-300">
                          <span className="text-gray-400">Passenger:</span>{" "}
                          <span className="text-gray-200">
                            {alert.passengerDetails}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons (bottom row) */}
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedJobId(alert.jobId);
                          setSelectedJobData(alert.jobData); // Store the job data when opening
                          setIsJobDetailsModalOpen(true);
                        }}
                        className="flex-1 text-xs bg-blue-600/90 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition font-medium"
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
                        className="flex-1 text-xs bg-green-600/90 hover:bg-green-600 text-white px-3 py-2 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {startingTripAlerts.has(alert.id) ? "Starting..." : "Start Trip"}
                      </button>

                      <button
                        onClick={async () => {
                          setDismissingAlerts(prev => new Set(prev).add(alert.id));
                          try {
                            await dismissAlert(alert.id);
                          } finally {
                            setDismissingAlerts(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(alert.id);
                              return newSet;
                            });
                          }
                        }}
                        disabled={dismissingAlerts.has(alert.id)}
                        className="text-xs bg-red-600/90 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
        jobData={selectedJobData}
        onClose={() => {
          setIsJobDetailsModalOpen(false);
          setSelectedJobId(null);
          setSelectedJobData(undefined); // Clear stored job data when closing
        }}
      />
    )}

  </>);
}

export default JobMonitoringAlertsPanel;