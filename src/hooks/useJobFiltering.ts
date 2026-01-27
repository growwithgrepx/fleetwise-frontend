import { useState, useCallback } from 'react';

export const useJobFiltering = (initialFilters: Record<string, string> = {}) => {
  const [search, setSearch] = useState('');
  const [localFilters, setLocalFilters] = useState<Record<string, string>>(initialFilters);

  const handleFilterChange = useCallback((col: string, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [col]: value }));
  }, []);

  const handleClearFilter = useCallback((col: string) => {
    setLocalFilters((prev) => ({ ...prev, [col]: '' }));
  }, []);

  const handleImmediateFilterChange = useCallback((col: string, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [col]: value }));
  }, []);

  const handleTabChange = useCallback((statusValue: string | undefined) => {
    setLocalFilters((prev) => ({ ...prev, status: statusValue, customer_name: '' }));
  }, []);

  return {
    search,
    setSearch,
    localFilters,
    setLocalFilters,
    handleFilterChange,
    handleClearFilter,
    handleImmediateFilterChange,
    handleTabChange
  };
};
