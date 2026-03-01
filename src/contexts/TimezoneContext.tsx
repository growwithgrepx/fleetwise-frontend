import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getDisplayTimezone, initializeDisplayTimezone, refreshDisplayTimezone, setDisplayTimezone } from '../utils/timezoneUtils';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  refreshTimezone: () => Promise<void>;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<string>(() => {
    // Get initial timezone from utils function (may be default)
    return getDisplayTimezone();
  });
  const [initialized, setInitialized] = useState(false);

  // Initialize timezone from API on mount
  useEffect(() => {
    const init = async () => {
      try {
        const tz = await initializeDisplayTimezone();
        setTimezoneState(tz);
      } catch (error) {
        console.error('Failed to initialize timezone:', error);
      }
      setInitialized(true);
    };

    init();
  }, []);

  // Update timezone when system/user preference changes
  useEffect(() => {
    const handleStorageChange = () => {
      const newTimezone = getDisplayTimezone();
      if (newTimezone && newTimezone !== timezone) {
        setTimezoneState(newTimezone);
      }
    };

    // Listen for changes to timezone-related localStorage items
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [timezone]);

  const value = {
    timezone,
    setTimezone: (newTimezone: string) => {
      setDisplayTimezone(newTimezone);
      setTimezoneState(newTimezone);
    },
    refreshTimezone: async () => {
      try {
        const newTimezone = await refreshDisplayTimezone();
        setTimezoneState(newTimezone);
      } catch (error) {
        console.error('Failed to refresh timezone:', error);
      }
    }
  };

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
}