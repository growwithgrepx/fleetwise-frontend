import React, { useState, useMemo } from "react";
import { useJobMonitoring } from "@/hooks/useJobMonitoring";
import { useUser } from '@/context/UserContext';
import {
  ClockIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import JobDetailsModal from './JobDetailsModal';

const JobMonitoringAlertsPanel = () => {
  const { alerts, startTrip, dismissAlert, isLoading: alertsLoading, error: alertsError, alertSettings } = useJobMonitoring();
  const { isLoggedIn, isLoading: userLoading } = useUser();

  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isJobDetailsModalOpen, setIsJobDetailsModalOpen] = useState(false);
  const [startingTripAlerts, setStartingTripAlerts] = useState<Set<number>>(new Set());
  const [dismissingAlerts, setDismissingAlerts] = useState<Set<number>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ type: 'start' | 'dismiss'; alertId: number; jobId: number } | null>(null);

  // Optimize filtering to avoid repeated calculations
  const activeAlerts = useMemo(() => {
    return alerts.filter(alert => !alert.dismissed);
  }, [alerts]);

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
  return (
    <>
      <div className="col-span-full sm:col-span-3">
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm border border-gray-700 rounded-2xl p-3 sm:p-4 lg:p-5 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {activeAlerts.map((alert) => {
                const isOverdue = alert.elapsedTime > 0;
                const driverName = alert.driverName && alert.driverName !== 'Unassigned'
                  ? alert.driverName
                  : (alert.jobData?.driver?.name || 'Unassigned');
                const custName = alert.jobData?.customer?.name || alert.jobData?.customer_name || '—';
                const paxName = alert.jobData?.passenger_name || alert.passengerDetails || '—';

                return (
                  <div
                    key={alert.id}
                    className={`relative rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.01] ${
                      isOverdue
                        ? 'border-red-500/40'
                        : 'border-amber-500/30'
                    } bg-gray-900/60 shadow-md`}
                  >
                    {/* Top accent bar */}
                    <div className={`h-0.5 w-full ${isOverdue ? 'bg-gradient-to-r from-red-500 to-red-400' : 'bg-gradient-to-r from-amber-500 to-yellow-400'}`} />

                    <div className="p-2.5 flex gap-2">
                      {/* Left: info */}
                      <div className="flex-1 min-w-0">
                        {/* Job ID + status dot */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                          <span className="text-white font-bold text-xs tracking-wide">Job #{alert.jobId}</span>
                          <span className={`ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                            isOverdue ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {isOverdue ? 'OVERDUE' : 'UPCOMING'}
                          </span>
                        </div>

                        {/* Driver + time row */}
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-0.5">
                          <UserIcon className="h-2.5 w-2.5 text-gray-500 flex-shrink-0" />
                          <span className="truncate font-medium text-gray-300">{driverName}</span>
                          {alert.pickupTime && (
                            <>
                              <span className="text-gray-600 mx-0.5">·</span>
                              <ClockIcon className="h-2.5 w-2.5 text-gray-500 flex-shrink-0" />
                              <span className="whitespace-nowrap text-gray-400">{alert.pickupTime}</span>
                            </>
                          )}
                        </div>

                        {/* Customer */}
                        <div className="text-[10px] truncate">
                          <span className="text-gray-600">Cust: </span>
                          <span className="text-gray-300">{custName}</span>
                        </div>

                        {/* Passenger */}
                        <div className="text-[10px] truncate">
                          <span className="text-gray-600">Pax: </span>
                          <span className="text-gray-300">{paxName}</span>
                        </div>
                      </div>

                      {/* Right: stacked buttons */}
                      <div className="flex flex-col gap-1 flex-shrink-0 justify-between">
                        <button
                          onClick={() => { setSelectedJobId(alert.jobId); setIsJobDetailsModalOpen(true); }}
                          className="text-[10px] bg-blue-600/80 hover:bg-blue-500 text-white px-2 py-1 rounded-md transition font-semibold leading-none border border-blue-500/30"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'start', alertId: alert.id, jobId: alert.jobId })}
                          disabled={startingTripAlerts.has(alert.id)}
                          className="text-[10px] bg-emerald-600/80 hover:bg-emerald-500 text-white px-2 py-1 rounded-md transition font-semibold leading-none border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {startingTripAlerts.has(alert.id) ? '⋯' : 'Start'}
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'dismiss', alertId: alert.id, jobId: alert.jobId })}
                          disabled={dismissingAlerts.has(alert.id)}
                          className="text-[10px] bg-red-600/80 hover:bg-red-500 text-white px-2 py-1 rounded-md transition font-semibold leading-none border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✕
                        </button>
                      </div>
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

    {/* Confirmation dialog */}
    {confirmAction && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl w-80 mx-4">
          <h3 className="text-white font-bold text-lg mb-2">
            {confirmAction.type === 'start' ? 'Start Trip?' : 'Dismiss Alert?'}
          </h3>
          <p className="text-gray-400 text-sm mb-5">
            {confirmAction.type === 'start'
              ? `Are you sure you want to start the trip for Job #${confirmAction.jobId}?`
              : `Are you sure you want to dismiss the alert for Job #${confirmAction.jobId}?`}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmAction(null)}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-slate-700 hover:bg-slate-600 text-gray-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const action = confirmAction;
                setConfirmAction(null);
                if (action.type === 'start') {
                  setStartingTripAlerts(prev => new Set(prev).add(action.alertId));
                  try {
                    await startTrip(action.jobId);
                  } finally {
                    setStartingTripAlerts(prev => { const s = new Set(prev); s.delete(action.alertId); return s; });
                  }
                } else {
                  setDismissingAlerts(prev => new Set(prev).add(action.alertId));
                  try {
                    await dismissAlert(action.alertId);
                  } catch (error) {
                    console.error('Error dismissing alert:', error);
                  } finally {
                    setDismissingAlerts(prev => { const s = new Set(prev); s.delete(action.alertId); return s; });
                  }
                }
              }}
              className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white transition ${
                confirmAction.type === 'start'
                  ? 'bg-green-600 hover:bg-green-500'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {confirmAction.type === 'start' ? 'Yes, Start' : 'Yes, Dismiss'}
            </button>
          </div>
        </div>
      </div>
    )}
    
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