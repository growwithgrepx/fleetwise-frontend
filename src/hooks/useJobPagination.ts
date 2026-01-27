import { useState, useCallback } from 'react';

export const useJobPagination = (initialPageSize: number = 10) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const paginate = useCallback((jobs: any[]) => {
    const total = jobs.length;
    const paginatedJobs = jobs.slice((page - 1) * pageSize, page * pageSize);
    const startIdx = (page - 1) * pageSize + 1;
    const endIdx = Math.min(page * pageSize, total);

    return {
      paginatedJobs,
      total,
      startIdx,
      endIdx,
      currentPage: page,
      totalPages: Math.ceil(total / pageSize)
    };
  }, [page, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  }, []);

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    paginate,
    handlePageChange,
    handlePageSizeChange
  };
};
