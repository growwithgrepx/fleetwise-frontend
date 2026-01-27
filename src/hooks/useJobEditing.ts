import { useState, useCallback } from 'react';
import type { Job } from '@/types/job';

export interface JobFormData {
  [key: string]: any;
}

export const useJobEditing = () => {
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEdit = useCallback((job: Job) => {
    setEditJob(job);
    setShowEditModal(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setShowEditModal(false);
    setEditJob(null);
  }, []);

  const handleSaveEdit = useCallback((callback: (job: Job, data: JobFormData) => Promise<void>) => {
    return async (updated: JobFormData) => {
      if (!editJob) return;
      await callback(editJob, updated);
      handleCancelEdit();
    };
  }, [editJob, handleCancelEdit]);

  return {
    editJob,
    showEditModal,
    setShowEditModal,
    handleEdit,
    handleCancelEdit,
    handleSaveEdit
  };
};
