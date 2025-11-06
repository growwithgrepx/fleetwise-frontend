import { create } from 'zustand';

interface JobModalState {
  isOpen: boolean;
  jobId: number | null;
  open: (jobId: number) => void;
  close: () => void;
}

export const useJobModalStore = create<JobModalState>((set) => ({
  isOpen: false,
  jobId: null,
  open: (jobId) => set({ isOpen: true, jobId }),
  close: () => set({ isOpen: false, jobId: null }),
})); 