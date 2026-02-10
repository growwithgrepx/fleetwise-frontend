import { create } from 'zustand';

import { ApiJob } from '@/types/job';

// Configuration constants
const MAX_ALERTS = 100;  // Maximum number of alerts to keep
const ALERT_CLEANUP_INTERVAL = 5 * 60 * 1000;  // 5 minutes
const OLD_ALERT_THRESHOLD = 24 * 60 * 60 * 1000;  // 24 hours

export interface JobMonitoringAlert {
  id: number;
  jobId: number;
  driverName: string;
  driverContact: string;
  pickupTime: string; // ISO string
  passengerDetails: string;
  elapsedTime: number; // in minutes
  createdAt: string; // ISO string
  dismissed: boolean;
  maxRemindersReached: boolean;
  reminderCount: number;
  jobData?: ApiJob; // Include the full job data if available
}

interface JobMonitoringState {
  alerts: JobMonitoringAlert[];
  unreadCount: number;
  init: () => void;
  cleanupOldAlerts: () => void;
  resetCleanupTimer: () => void;
  addAlert: (alert: Omit<JobMonitoringAlert, 'id' | 'createdAt' | 'dismissed' | 'maxRemindersReached' | 'reminderCount'>) => void;
  dismissAlert: (alertId: number) => void;
  startTrip: (jobId: number) => void;
  clearAllAlerts: () => void;
  updateAlerts: (alerts: JobMonitoringAlert[]) => void;
}

// Counter for generating unique alert IDs to prevent collisions
// Uses timestamp * 1000 + counter for microsecond-level uniqueness
let alertIdCounter = 0;

// Cleanup timer reference
let cleanupTimer: NodeJS.Timeout | null = null;

export const useJobMonitoringStore = create<JobMonitoringState>((set, get) => ({
  alerts: [],
  unreadCount: 0,
  
  // Initialize cleanup timer
  init: () => {
    if (!cleanupTimer) {
      cleanupTimer = setInterval(() => {
        get().cleanupOldAlerts();
      }, ALERT_CLEANUP_INTERVAL);
      
      // Cleanup on store destruction (in development)
      if (process.env.NODE_ENV === 'development') {
        console.debug('[JobMonitoringStore] Cleanup timer initialized');
      }
    }
  },
  
  // Cleanup old alerts
  cleanupOldAlerts: () => {
    const now = Date.now();
    const alerts = get().alerts;
    
    // Remove alerts older than threshold
    const recentAlerts = alerts.filter(alert => {
      const alertAge = now - new Date(alert.createdAt).getTime();
      return alertAge < OLD_ALERT_THRESHOLD;
    });
    
    // Limit to maximum alerts if still too many
    let finalAlerts = recentAlerts;
    if (recentAlerts.length > MAX_ALERTS) {
      // Keep the most recent alerts
      finalAlerts = recentAlerts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, MAX_ALERTS);
    }
    
    // Update state if cleanup was needed
    if (finalAlerts.length !== alerts.length) {
      const unreadCount = finalAlerts.filter(alert => !alert.dismissed).length;
      set({ alerts: finalAlerts, unreadCount });
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[JobMonitoringStore] Cleaned up ${alerts.length - finalAlerts.length} old alerts`);
      }
    }
  },
  
  // Reset cleanup timer
  resetCleanupTimer: () => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
    get().init();
  },
  
  addAlert: (alertData) => {
    // Initialize cleanup timer if not already running
    if (!cleanupTimer) {
      get().init();
    }
    
    // Generate unique ID using timestamp + counter to prevent collisions
    const timestamp = Date.now();
    const uniqueId = timestamp * 1000 + (alertIdCounter++ % 1000);
    
    const newAlert: JobMonitoringAlert = {
      ...alertData,
      id: uniqueId,
      createdAt: new Date().toISOString(),
      dismissed: false,
      maxRemindersReached: false,
      reminderCount: 1,
    };
    
    set((state) => {
      // Check if we're approaching the limit
      let updatedAlerts = [...state.alerts, newAlert];
      
      // Enforce maximum alert limit
      if (updatedAlerts.length > MAX_ALERTS) {
        // Remove oldest alerts, keeping the newest ones
        updatedAlerts = updatedAlerts
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_ALERTS);
      }
      
      return {
        alerts: updatedAlerts,
        unreadCount: updatedAlerts.filter(alert => !alert.dismissed).length,
      };
    });
    
    // Development warning for excessive alerts
    if (process.env.NODE_ENV === 'development') {
      const alertCount = get().alerts.length;
      if (alertCount > MAX_ALERTS * 0.8) {  // 80% of limit
        console.warn(`[JobMonitoringStore] Alert count is high: ${alertCount}/${MAX_ALERTS}`);
      }
    }
  },
  
  dismissAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map(alert => 
        alert.id === alertId ? { ...alert, dismissed: true } : alert
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },
  
  startTrip: (jobId) => {
    // This would typically trigger an API call to update the job status
    // For now, we'll just dismiss the alert
    const alert = get().alerts.find(a => a.jobId === jobId);
    if (alert) {
      get().dismissAlert(alert.id);
    }
  },
  
  clearAllAlerts: () => {
    set({ alerts: [], unreadCount: 0 });
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('[JobMonitoringStore] All alerts cleared');
    }
  },
  
  updateAlerts: (newAlerts) => {
    set((state) => {
      // Only update if the alerts have actually changed
      const alertsChanged = JSON.stringify(state.alerts) !== JSON.stringify(newAlerts);
      
      if (!alertsChanged) {
        return {};
      }
      
      // Validate and limit incoming alerts
      let validatedAlerts = newAlerts;
      if (newAlerts.length > MAX_ALERTS) {
        validatedAlerts = newAlerts
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, MAX_ALERTS);
      }
      
      const unreadCount = validatedAlerts.filter(alert => !alert.dismissed).length;
      
      return { alerts: validatedAlerts, unreadCount };
    });
  },
}));