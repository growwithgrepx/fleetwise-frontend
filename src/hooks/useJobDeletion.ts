import { useState, useCallback } from 'react';

export interface Job {
  id: number | string;
  [key: string]: any;
}

export const useJobDeletion = () => {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const handleDelete = useCallback((id: string | number) => {
    setPendingDeleteId(Number(id));
    setConfirmOpen(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setConfirmOpen(false);
    setPendingDeleteId(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    return pendingDeleteId;
  }, [pendingDeleteId]);

  const resetDeletion = useCallback(() => {
    setDeletingId(null);
    setPendingDeleteId(null);
    setConfirmOpen(false);
  }, []);

  return {
    deletingId,
    setDeletingId,
    confirmOpen,
    setConfirmOpen,
    pendingDeleteId,
    handleDelete,
    handleCancelDelete,
    handleConfirmDelete,
    resetDeletion
  };
};
