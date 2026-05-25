"use client";
import { useEffect, useState, ReactNode, useRef, useMemo } from "react";
import axios from "axios";

type CountFetcherProps = {
  apiUrl: string;
  statusFilter?: string[];
  refreshInterval?: number; // in ms
  render: (counts: Record<string, number>, error?: string) => ReactNode;
  forceRefresh?: number;
};

export default function CountFetcher({
  apiUrl,
  statusFilter,
  refreshInterval = 120000, // 2 minutes default
  render,
  forceRefresh = 0,
}: CountFetcherProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(false);
  const retryTimeout = useRef<NodeJS.Timeout | null>(null);

  // Stabilise statusFilter so a new array literal on every render doesn't retrigger the effect
  const statusFilterKey = useMemo(() => JSON.stringify(statusFilter ?? null), [statusFilter]);

  useEffect(() => {
    isMounted.current = true;
    const currentStatusFilter: string[] | undefined = statusFilter;

    async function fetchCounts() {
      try {
        setError(null);
        const res = await axios.get(apiUrl);
        if (!isMounted.current) return;
        const data = res.data;

        // Support both flat-array responses (e.g. /api/invoices) and
        // paginated { items: [...] } responses (e.g. /api/invoices/unpaid)
        const items: any[] | null = Array.isArray(data)
          ? data
          : Array.isArray(data.items)
          ? data.items
          : null;

        if (currentStatusFilter && items) {
          const counted: Record<string, number> = {};
          currentStatusFilter.forEach((status) => {
            counted[status] = items.filter(
              (item: any) => item.status === status
            ).length;
            counted[`${status}Amount`] = items
              .filter((item: any) => item.status === status)
              .reduce((sum: number, item: any) => sum + Number(item.total_amount ?? 0), 0);
          });
          counted["TotalReceivedAmount"] = items
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
          setCounts({ total: data?.total ?? (items ? items.length : 0) });
        }
      } catch (err: any) {
        if (!isMounted.current || axios.isCancel(err)) return;
        const status = err.response?.status;
        // On 429 back off for 5 minutes before next poll
        if (status === 429) {
          console.warn("CountFetcher: rate limited (429), backing off for 5 minutes.");
          retryTimeout.current = setTimeout(fetchCounts, 5 * 60 * 1000);
          return;
        }
        console.error("Failed to fetch counts:", err);
        setError(err.response?.data?.message || err.message || "Failed to fetch counts");
        const fallback: Record<string, number> = {};
        if (currentStatusFilter) {
          currentStatusFilter.forEach((s) => (fallback[s] = 0));
          fallback["TotalReceivedAmount"] = 0;
        } else {
          fallback["total"] = 0;
        }
        setCounts(fallback);
      }
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, refreshInterval);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
      if (retryTimeout.current) clearTimeout(retryTimeout.current);
    };
  // statusFilterKey (stable JSON string) replaces statusFilter array reference in deps
  }, [apiUrl, statusFilterKey, refreshInterval, forceRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{render(counts, error)}</>;
}
