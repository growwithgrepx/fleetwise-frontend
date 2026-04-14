import { useState, useCallback } from 'react';

export interface Job {
  [key: string]: any;
}

export interface SortEntry {
  col: string;
  dir: 'asc' | 'desc';
}

/**
 * Multi-column sorting hook.
 *
 * Behaviour:
 *  - Clicking an unsorted column APPENDS it to the end of the sort list (asc).
 *  - Clicking an already-sorted column cycles:  asc → desc → removed.
 *  - All previous sorts stay active until the user removes them.
 *  - getSortedJobs applies all active sorts in priority order (index 0 = highest).
 */
export const useJobSorting = () => {
  // Default: date descending so newest jobs appear first
  const [sorts, setSorts] = useState<SortEntry[]>([
    { col: 'pickup_date', dir: 'desc' },
  ]);

  /**
   * Handle a column header click.
   * - New column  → append as asc (lowest priority)
   * - asc column  → flip to desc
   * - desc column → remove from sort list
   */
  const handleSort = useCallback((col: string) => {
    setSorts((prev) => {
      const idx = prev.findIndex((s) => s.col === col);
      if (idx === -1) {
        // Brand-new sort: append with asc
        return [...prev, { col, dir: 'asc' }];
      }
      if (prev[idx].dir === 'asc') {
        // asc → desc
        return prev.map((s, i) => (i === idx ? { ...s, dir: 'desc' } : s));
      }
      // desc → remove
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  /** Remove a single column from the sort list. */
  const removeSort = useCallback((col: string) => {
    setSorts((prev) => prev.filter((s) => s.col !== col));
  }, []);

  /** Clear all active sorts. */
  const clearSorts = useCallback(() => setSorts([]), []);

  /**
   * Apply all active sorts in priority order.
   * Falls back to stable input order when all sort keys are equal.
   */
  const getSortedJobs = useCallback(
    (jobs: Job[]) => {
      if (sorts.length === 0) return jobs;
      return [...jobs].sort((a, b) => {
        for (const { col, dir } of sorts) {
          const aVal = a[col];
          const bVal = b[col];
          if (aVal == null && bVal == null) continue;
          if (aVal == null) return 1;
          if (bVal == null) return -1;
          let cmp = 0;
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            cmp = aVal.localeCompare(bVal);
          } else if (typeof aVal === 'number' && typeof bVal === 'number') {
            cmp = aVal - bVal;
          } else {
            cmp = String(aVal).localeCompare(String(bVal));
          }
          if (cmp !== 0) return dir === 'asc' ? cmp : -cmp;
        }
        return 0;
      });
    },
    [sorts]
  );

  return { sorts, handleSort, removeSort, clearSorts, getSortedJobs };
};
