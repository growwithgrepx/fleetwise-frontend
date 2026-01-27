import { useState, useCallback } from 'react';

export interface Job {
  [key: string]: any;
}

export const useJobSorting = (initialSortBy: string = 'pickup_date', initialSortDir: 'asc' | 'desc' = 'desc') => {
  const [sortBy, setSortBy] = useState<string>(initialSortBy);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);

  const handleSort = useCallback((col: string) => {
    if (sortBy === col) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  }, [sortBy]);

  const getSortedJobs = useCallback((jobs: Job[]) => {
    return [...jobs].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let result = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        result = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        result = aVal - bVal;
      } else {
        result = String(aVal).localeCompare(String(bVal));
      }

      return sortDir === 'asc' ? result : -result;
    });
  }, [sortBy, sortDir]);

  return {
    sortBy,
    sortDir,
    handleSort,
    getSortedJobs
  };
};
