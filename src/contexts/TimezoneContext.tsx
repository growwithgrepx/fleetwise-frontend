import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getDisplayTimezone } from '../utils/timezoneUtils';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  refreshTimezone: () => void;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezone] = useState<string>(() => {
    // Get initial timezone from utils function
    return getDisplayTimezone();
  });

  // Update timezone when system/user preference changes
  useEffect(() => {
    const handleStorageChange = () => {
      const newTimezone = getDisplayTimezone();
      if (newTimezone !== timezone) {
        setTimezone(newTimezone);
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
      localStorage.setItem('userTimezone', newTimezone);
      setTimezone(newTimezone);
    },
    refreshTimezone: () => {
      const newTimezone = getDisplayTimezone();
      if (newTimezone !== timezone) {
        setTimezone(newTimezone);
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