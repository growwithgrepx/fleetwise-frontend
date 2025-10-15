"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { JobFormData } from '@/types/job';

type CopiedJobContextType = {
  copiedJobData: Partial<JobFormData> | null;
  setCopiedJobData: (data: Partial<JobFormData> | null) => void;
  clearCopiedJobData: () => void;
};

const CopiedJobContext = createContext<CopiedJobContextType | undefined>(undefined);

export function CopiedJobProvider({ children }: { children: ReactNode }) {
  const [copiedJobData, setCopiedJobData] = useState<Partial<JobFormData> | null>(null);

  const clearCopiedJobData = () => {
    setCopiedJobData(null);
  };

  return (
    <CopiedJobContext.Provider 
      value={{ 
        copiedJobData, 
        setCopiedJobData, 
        clearCopiedJobData 
      }}
    >
      {children}
    </CopiedJobContext.Provider>
  );
}

export function useCopiedJob() {
  const context = useContext(CopiedJobContext);
  if (context === undefined) {
    throw new Error('useCopiedJob must be used within a CopiedJobProvider');
  }
  return context;
}