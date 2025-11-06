"use client";
import { useEffect, useState, ReactNode, useRef } from "react";
import axios from "axios";

type CountFetcherProps = {
  apiUrl: string;
  statusFilter?: string[];
  refreshInterval?: number; // in ms
  render: (counts: Record<string, number>, error?: string) => ReactNode;
  forceRefresh?: number; // Add force refresh prop
};

export default function CountFetcher({
  apiUrl,
  statusFilter,
  refreshInterval = 10000,
  render,
  forceRefresh = 0, // Default to 0
}: CountFetcherProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(false);
  
  useEffect(() => {
    isMounted.current = true;
    const interval: NodeJS.Timeout = setInterval(fetchCounts, refreshInterval);

    async function fetchCounts() {
      try {
        setError(null);
        const res = await axios.get(apiUrl);
        if (!isMounted.current) return;
        const data = res.data;
        if (statusFilter && Array.isArray(data.items)) {
          // unpaid/paid/partially paid case
          const counted: Record<string, number> = {};
          statusFilter.forEach((status) => {
            counted[status] = data.items.filter(
              (item: any) => item.status === status
            ).length;
            
            // total amount for each status
            counted[`${status}Amount`] = data.items
              .filter((item: any) => item.status === status)
              .reduce((sum: number, item: any) => sum + Number(item.total_amount ?? 0), 0);
          });
          // Add total received amount as sum of paid_amount (total_amount - remaining_amount_invoice)
          counted["TotalReceivedAmount"] = data.items
            .filter((item: any) => ["Paid", "Partially Paid"].includes(item.status))
            .reduce((sum: number, item: any) => {
              const total = Number(item?.total_amount);
              const remaining = Number(item?.remaining_amount_invoice);

              const safeTotal = isNaN(total) ? 0 : total;
              const safeRemaining = isNaN(remaining) ? 0 : remaining;

              const paidAmount = safeTotal - safeRemaining;
              return sum + (isNaN(paidAmount) ? 0 : paidAmount);
            }, 0);
          setCounts(counted);
        } else {
          // unbilled or generic count
          setCounts({ total: data?.total ?? data?.items?.length ?? 0 });
        }
      } catch (err: any) {
        console.error("Failed to fetch counts:", err);
        if (!isMounted.current || axios.isCancel(err)) return;
        // propagate meaningful error
        setError(err.response?.data?.message || err.message || "Failed to fetch counts");

        const fallback: Record<string, number> = {};
        if (statusFilter) {
          statusFilter.forEach((s) => (fallback[s] = 0));
          fallback["TotalReceivedAmount"] = 0; // Fallback for total received
        } else {
          fallback["total"] = 0;
        }
        setCounts(fallback);
      }
    }
    
    fetchCounts();

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [apiUrl, statusFilter, refreshInterval, forceRefresh]); // Add forceRefresh to dependency array

  return <>{render(counts, error)}</>;
}
