import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Customer {
  id: number;
  name: string;
}

export interface Job {
  id: number | string;
  customer_name: string;
  status: string;
  [key: string]: any;
}

export const useJobsData = (isDriver: boolean) => {
  // Fetch all jobs without status filter for count calculation
  const { data: allJobsData } = useQuery({
    queryKey: ['jobs', 'all-status-counts'],
    queryFn: async () => {
      const response = await api.get('/api/jobs/table?pageSize=10000');
      return response.data;
    }
  });

  // Fetch customers for customer filter buttons
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'list'],
    queryFn: async () => {
      const response = await api.get('/api/customers');
      return response.data;
    },
    enabled: !isDriver
  });

  const allJobs = (allJobsData?.items || []) as Job[];
  const customers = (customersData || []) as Customer[];

  // Calculate customer counts
  const customerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allJobs.forEach((job) => {
      if (job.customer_name) {
        counts[job.customer_name] = (counts[job.customer_name] || 0) + 1;
      }
    });
    return counts;
  }, [allJobs]);

  // Sort customers by job count (descending)
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const countA = customerCounts[a.name] || 0;
      const countB = customerCounts[b.name] || 0;
      return countB - countA;
    });
  }, [customers, customerCounts]);

  // Filter customers to only show those with at least 1 job
  const filteredCustomers = useMemo(() => {
    return sortedCustomers.filter((customer) => {
      const count = customerCounts[customer.name] || 0;
      return count > 0;
    });
  }, [sortedCustomers, customerCounts]);

  // Calculate status counts from all jobs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allJobs.forEach((job) => {
      counts[job.status] = (counts[job.status] || 0) + 1;
    });
    const totalCount = allJobs.length || 0;
    return { ...counts, all: totalCount };
  }, [allJobs]);

  return {
    allJobs,
    customers,
    customerCounts,
    sortedCustomers,
    filteredCustomers,
    statusCounts
  };
};
