"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { keepPreviousData } from "@tanstack/react-query";
import { useGetAllCustomers } from "@/hooks/useCustomers";
import { useRouter } from "next/navigation";
import { useBills } from "@/hooks/useBills";
import { JobOrInvoice } from "@/types/job";
import PartialPaymentModal from "@/components/organisms/PartialPaymentModal";



export interface Invoice {
  customer_id: number;
  date: string;     // yyyy-mm-dd or ISO
  id: number;
  jobs?: any[];
  status: "Paid" | string;
  total_amount: number;
  customer_name?: string;
  remaining_amount_invoice?: number;
}

// ---- utils ----
const money = (n: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "SGD" }).format(n);

const classNames = (...xs: (string | false | null | undefined)[]) =>
  xs.filter(Boolean).join(" ");

const toCSV = (rows: Record<string, any>[]) => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) =>
    `"${String(v ?? "").replaceAll('"', '""').replaceAll("\n", " ")}"`;
  const head = headers.map(esc).join(",");
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
  return `${head}\n${body}`;
};

// ---- tiny components ----
const Badge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    Paid: "bg-emerald-600/20 text-emerald-300 border-emerald-400/30",
  };
  return (
    <span className={classNames("px-2 py-1 rounded-md text-xs border", map[status])}>
      {status}
    </span>
  );
};

const Card: React.FC<{ title: string; value: string; sub?: string; tone: "green"|"blue"|"pink"|"yellow" }> = ({ title, value, sub, tone }) => {
  const toneCls =
    tone === "green" ? "from-emerald-700 to-emerald-600" :
    tone === "blue"  ? "from-sky-700 to-sky-600" :
    tone === "pink"  ? "from-fuchsia-700 to-fuchsia-600" :
                       "from-amber-600 to-amber-500";
  return (
    <div className={classNames("rounded-xl p-5 text-white bg-gradient-to-br shadow-lg", toneCls)}>
      <div className="text-sm/5 opacity-90">{title}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-xs/5 mt-1 opacity-80">{sub}</div> : null}
    </div>
  );
};




// ---- page ----
export default function BillingHistoryPage() {
  // filters
  const [invoiceId, setInvoiceId] = useState("");
  const [customer, setCustomer] = useState("");
  const [status, setStatus] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState(""); // yyyy-mm-dd
  const [endDate, setEndDate] = useState("");

  // table UI
  const [sortBy, setSortBy] = useState<"id"|"customer_name"|"date"|"total_amount"|"status">("date");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  //
const router = useRouter();
const { unPaidInvoiceDownload } = useBills();

// modal state
const [showPaymentsFor, setShowPaymentsFor] = useState<number | null>(null);

const openPaymentHistory = (invoiceId: number) => {
  setShowPaymentsFor(invoiceId);
};

const closePaymentHistory = () => {
  setShowPaymentsFor(null);
};


//const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);

// const handleViewInvoice = (invoice: Invoice) => {
//   setExpandedInvoiceId(expandedInvoiceId === invoice.id ? null : invoice.id);
// };

const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);
const [expandedJobsByInvoice, setExpandedJobsByInvoice] = useState<
  Record<number, JobOrInvoice[]>
>({});

const handleViewInvoice = async (inv: Invoice) => {
  // Guard invalid invoice IDs
  if (!inv?.id) {
    console.warn("Invalid invoice ID for job fetch:", inv);
    return;
  }

  setExpandedInvoiceId(prev => (prev === inv.id ? null : inv.id));

  // Already cached
  if (expandedJobsByInvoice[inv.id]) return;

  try {
    const res = await axios.get<JobOrInvoice[]>("/api/jobs", {
      params: { invoiceId: inv.id },
    });

    // Ensure API response is an array
    const rawJobs = Array.isArray(res.data) ? res.data : [];

    // Validate objects + filter only those with matching invoice_id
    const jobs: JobOrInvoice[] = rawJobs
      .filter(
        (j: any) =>
          j &&
          typeof j === "object" &&
          "invoice_id" in j &&
          j.invoice_id === inv.id
      )
      .map(
        (j: any): JobOrInvoice => ({
          ...j,
          type: "job" as const,
          status: j.status ?? "Paid",
          invoice: j.invoice ?? inv, // attach invoice fallback
        })
      );

    setExpandedJobsByInvoice(prev => ({
      ...prev,
      [inv.id]: jobs,
    }));
  } catch (e) {
    console.error("Failed to fetch jobs for invoice", inv.id, e);
    setExpandedJobsByInvoice(prev => ({ ...prev, [inv.id]: [] }));
  }
};





const handleUnpaidInvoiceDownload = (invoiceId: number) => {
  // same as billing page behavior
  unPaidInvoiceDownload(invoiceId);
};


  // build params only when non-empty (keeps your server logs clean)
const params = useMemo(() => {
  const p: Record<string, string> = {};

  // Apply user filters
  if (invoiceId) p.id = invoiceId;
  if (customer) p.customer = customer;
  if (status) p.status = status;
  if (minAmount) p.minAmount = minAmount;
  if (maxAmount) p.maxAmount = maxAmount;

  // Always enforce 6 months if no explicit date filters
  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  p.startDate = startDate || sixMonthsAgo.toISOString().slice(0, 10);
  p.endDate = endDate || today.toISOString().slice(0, 10);

  return p;
}, [invoiceId, customer, status, minAmount, maxAmount, startDate, endDate]);


  // fetch
  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
  queryKey: ["invoices"],
  queryFn: async () => {
    const res = await axios.get<Invoice[]>("/api/invoices");
    return res.data ?? [];
  },
  placeholderData: keepPreviousData, // use this if you want caching between queries
});

// fetch customers
const { data: customers = [] } = useGetAllCustomers();

const invoicesWithNames = useMemo(() => {
  return invoices.map((inv) => {
    const customer = customers.find((c) => c.id === inv.customer_id);
    return {
      ...inv,
      customer_name:
      customer?.name ?? inv.customer_name ?? `#${inv.customer_id}`,
    };
  });
}, [invoices, customers]);



  // client filters for amount & date if your API doesn't handle them
 const filtered = useMemo(() => {
  return invoicesWithNames.filter((inv) => {
    // invoiceId exact match
    if (inv.status !== "Paid") return false;
    const matchId = invoiceId ? String(inv.id).includes(invoiceId) : true;

    // customer name contains (case-insensitive)
    const matchCustomer = customer
      ? (inv.customer_name ?? "")
          .toLowerCase()
          .includes(customer.toLowerCase())
      : true;

    // amount range
    const amt = Number(inv.total_amount) || 0;
    const matchMin = minAmount ? amt >= Number(minAmount) : true;
    const matchMax = maxAmount ? amt <= Number(maxAmount) : true;

    // date range
    const d = new Date(inv.date);
    const matchStart = startDate ? d >= new Date(startDate) : true;
    const matchEnd = endDate ? d <= new Date(endDate) : true;

    return (
      matchId &&
      matchCustomer &&
      matchMin &&
      matchMax &&
      matchStart &&
      matchEnd
    );
  });
}, [invoices, invoiceId, customer, minAmount, maxAmount, startDate, endDate]);


  // sorting
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const A = (a as any)[sortBy] ?? "";
      const B = (b as any)[sortBy] ?? "";
      let cmp = 0;
      if (sortBy === "total_amount" || typeof A === "number" || typeof B === "number") {
        cmp = (Number(A) || 0) - (Number(B) || 0);
      } else if (sortBy === "date") {
        cmp = new Date(A).getTime() - new Date(B).getTime();
      } else {
        cmp = String(A).localeCompare(String(B));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  // pagination
  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const current = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  

  // date helpers
const now = new Date();
const last30 = new Date(now); 
last30.setDate(now.getDate() - 30);

const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);


  // summaries (based on filtered list)
  // --- compute totals ---
const totalRevenue30d = filtered
  .filter(
    (i) =>
      (i.status === "Paid" || i.status === "Partially Paid") &&
      new Date(i.date) >= last30
  )
  .reduce((sum, i) => {
    const total = Number(i.total_amount) || 0;
    if (i.status === "Paid") return sum + total;
    if (i.status === "Partially Paid") {
      const remaining = Number(i.remaining_amount_invoice) || 0;
      return sum + (total - remaining);
    }
    return sum;
  }, 0);

const paidThisMonth = filtered.filter(
  (i) => i.status === "Paid" && new Date(i.date) >= thisMonthStart
).length;

const avgInvoice = filtered.length
  ? filtered.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) /
    filtered.length
  : 0;


  // export CSV of filtered rows (not only current page)
  const handleExport = () => {
    const rows = filtered.map((i) => ({
      invoice_id: i.id,
      customer_name: i.customer_name ?? "",
      customer_id: i.customer_id,
      date: i.date,
      status: i.status,
      total_amount: i.total_amount,
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "billing-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const headerCell = (label: string, key: typeof sortBy) => (
    <button
      onClick={() => {
        if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortBy(key); setSortDir("asc"); }
      }}
      className="flex items-center gap-1 font-semibold"
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      <span className="opacity-70 text-xs">
        {sortBy === key ? (sortDir === "asc" ? "▲" : "▼") : ""}
      </span>
    </button>

  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
      {/* Title + Export */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Billing History</h1>
        <button
          onClick={handleExport}
          className="px-3 py-2 rounded-lg text-sm bg-background-light border border-border-color text-text-main hover:bg-primary hover:text-white transition"
        >
          Export Report
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
  title="Total Revenue"
  value={money(totalRevenue30d)}
  sub="Last 30 days"
  tone="green"
/>
<Card
  title="Paid Invoices"
  value={String(paidThisMonth)}
  sub="This month"
  tone="blue"
/>
<Card
  title="Average Invoice"
  value={money(avgInvoice)}
  sub="Per transaction"
  tone="pink"
/>

      </div>

      {/* Filters */}
      <div className="bg-background-light/60 border border-border-color rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <input
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border-color text-text-main placeholder:text-text-secondary"
            placeholder="Invoice ID"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
          />
          <input
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border-color text-text-main placeholder:text-text-secondary"
            placeholder="Customer name…"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
          <input
            type="number"
            min={0}
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border-color text-text-main"
            placeholder="Min amount"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
          />
          <input
            type="number"
            min={0}
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-border-color text-text-main"
            placeholder="Max amount"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
          />
          <div className="flex gap-2 col-span-2">
  <input
    type="date"
    className="flex-1 px-3 py-2 rounded-lg bg-background border border-border-color text-text-main"
    value={startDate}
    onChange={(e) => setStartDate(e.target.value)}
  />
  <input
    type="date"
    className="flex-1 px-3 py-2 rounded-lg bg-background border border-border-color text-text-main"
    value={endDate}
    onChange={(e) => setEndDate(e.target.value)}
  />
</div>

        </div>

        <div className="flex gap-2 mt-4 justify-end">
          <button
            className="px-4 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition"
            onClick={() => {/* no-op: query auto-runs via params */}}
          >
            Apply Filters
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-background border border-border-color text-text-main hover:bg-background/80 transition"
            onClick={() => {
              setInvoiceId(""); setCustomer(""); setStatus("");
              setMinAmount(""); setMaxAmount(""); setStartDate(""); setEndDate("");
              setPage(1);
            }}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-background-light rounded-xl shadow-lg border border-border-color overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-background-light/50 text-text-main">
              <tr className="[&>th]:px-4 [&>th]:py-3 text-left">
                <th>{headerCell("Invoice ID", "id")}</th>
                <th>{headerCell("Customer", "customer_name")}</th>
                <th>{headerCell("Invoice Date", "date")}</th>
                <th>{headerCell("Amount", "total_amount")}</th>
                <th>{headerCell("Status", "status")}</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-text-main/90">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">Loading…</td></tr>
              ) : current.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-secondary">No invoices found.</td></tr>
              ) : (
                current
                 .filter((inv) =>
        customer
          ? (inv.customer_name ?? "")
              .toLowerCase()
              .includes(customer.toLowerCase())
          : true)
                .map((inv) => (
                     <React.Fragment key={inv.id}>
                  <tr key={inv.id} className="border-t border-border-color hover:bg-background/40">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleUnpaidInvoiceDownload(inv.id)}
                        className="text-primary hover:underline"
                        title="Open invoice PDF"
                        >
                      {`INV-${String(inv.id).padStart(6, "0")}`}
                      </button>
                     
                    </td>
                    <td className="px-4 py-3">{inv.customer_name ?? `#${inv.customer_id}`}</td>
                    <td className="px-4 py-3">{new Date(inv.date).toISOString().slice(0,10)}</td>
                    <td className="px-4 py-3">{money(inv.total_amount)}</td>
                    <td className="px-4 py-3"><Badge status={inv.status} /></td>
                    
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                        onClick={() => handleViewInvoice(inv)}
                        className="px-2 py-1 rounded-md border border-border-color hover:bg-background"
                        title="View"
                        >
                        👁
                      </button>

                        <button
                        onClick={() => {
                          if (inv.status === "Paid") {
                              handleUnpaidInvoiceDownload(inv.id);
                            } 
                           }}
                        className="px-2 py-1 rounded-md border border-border-color hover:bg-background"
                        title="Download"
                        aria-label="Download Invoice"
                        >
                        ⬇
                      </button>
                      <button
      onClick={() => openPaymentHistory(inv.id)}
      className="px-2 py-1 rounded-md border border-border-color hover:bg-background"
      title="Payment History"
      aria-label="Payment History"
    >
      💳
    </button>
                      </div>
                    </td>
                  </tr>
{expandedInvoiceId === inv.id && (
  <tr>
    <td colSpan={6} className="bg-background-light/40 p-3">
      <div className="rounded-2xl border border-border-color bg-background-light overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-background/60">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Job ID</th>
              <th className="px-3 py-2 text-left font-semibold">Service</th>
              <th className="px-3 py-2 text-left font-semibold">Pickup</th>
              <th className="px-3 py-2 text-left font-semibold">Drop-off</th>
              <th className="px-3 py-2 text-left font-semibold">Pickup Date</th>
              <th className="px-3 py-2 text-left font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(expandedJobsByInvoice[inv.id] ?? []).length > 0 ? (
              expandedJobsByInvoice[inv.id].map(job => (
                <tr key={job.id} className="hover:bg-background/40">
                  <td className="px-3 py-2">{job.id}</td>
                  <td className="px-3 py-2">{"service_type" in job ? job.service_type : "—"}</td>
                  <td className="px-3 py-2">{"pickup_location" in job ? job.pickup_location : "—"}</td>
                  <td className="px-3 py-2">{"dropoff_location" in job ? job.dropoff_location : "—"}</td>
                  <td className="px-3 py-2">
                    {"pickup_date" in job && job.pickup_date
                      ? new Date(job.pickup_date).toISOString().slice(0, 10)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {"final_price" in job && typeof job.final_price === "number"
                      ? `$${job.final_price.toFixed(2)}`
                      : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-4 text-text-secondary">
                  No jobs for this invoice.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </td>
  </tr>
)}


    </React.Fragment>
                  
                ))
              )}
            </tbody>
          </table>
        </div>
        {showPaymentsFor && (
  <PartialPaymentModal
    invoice={{ id: showPaymentsFor }}
    onClose={closePaymentHistory}
    readOnly    
    onPaymentSuccess={() => {
      // queryClient.invalidateQueries({ queryKey: ["invoices"] });
    }}
  />
)}

        {/* Footer: pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-color text-sm">
          <div className="text-text-secondary">
            Showing {totalRows === 0 ? 0 : (page - 1) * rowsPerPage + 1}–
            {Math.min(page * rowsPerPage, totalRows)} of {totalRows} invoices
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-text-secondary">Rows per page</label>
            <select
              className="px-2 py-1 rounded-md bg-background border border-border-color text-text-main"
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
            >
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>

            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 rounded-md border border-border-color hover:bg-background disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ‹ Prev
              </button>
              <span className="px-2">{page} / {totalPages}</span>
              <button
                className="px-2 py-1 rounded-md border border-border-color hover:bg-background disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}