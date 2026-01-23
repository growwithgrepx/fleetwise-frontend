import { create } from 'zustand';

import { ApiJob } from '@/types/job';

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
  addAlert: (alert: Omit<JobMonitoringAlert, 'id' | 'createdAt' | 'dismissed' | 'maxRemindersReached' | 'reminderCount'>) => void;
  dismissAlert: (alertId: number) => void;
  startTrip: (jobId: number) => void;
  clearAllAlerts: () => void;
  updateAlerts: (alerts: JobMonitoringAlert[]) => void;
}

// Counter for generating unique alert IDs to prevent collisions
// Uses timestamp * 1000 + counter for microsecond-level uniqueness
let alertIdCounter = 0;

export const useJobMonitoringStore = create<JobMonitoringState>((set, get) => ({
  alerts: [],
  unreadCount: 0,
  
  addAlert: (alertData) => {
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
    
    set((state) => ({
      alerts: [...state.alerts, newAlert],
      unreadCount: state.unreadCount + 1,
    }));
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
  },
  
  updateAlerts: (newAlerts) => {
    set((state) => {
      // Only update if the alerts have actually changed
      const alertsChanged = JSON.stringify(state.alerts) !== JSON.stringify(newAlerts);
      
      if (!alertsChanged) {
        return {};
      }
      
      const unreadCount = newAlerts.filter(alert => !alert.dismissed).length;
      
      return { alerts: newAlerts, unreadCount };
    });
  },
}));