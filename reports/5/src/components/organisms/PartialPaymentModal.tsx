// PartialPaymentModal.tsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import classNames from "classnames";
import toast from "react-hot-toast";

interface Payment {
  id: number;
  amount: number;
  date: string;
  notes: string;
}

interface PartialPaymentModalProps {
  invoice: { id: number };
  onClose: () => void;
  onPaymentSuccess?: () => void;
  readOnly?: boolean; // 👈 NEW
}

const PartialPaymentModal: React.FC<PartialPaymentModalProps> = ({
  invoice,
  onClose,
  onPaymentSuccess,
  readOnly = false, // 👈 default to interactive
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [newPayment, setNewPayment] = useState({
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState<"Unpaid" | "Partially Paid" | "Paid">("Unpaid");
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const isMounted = useRef(true);

  const computeStatus = (remaining: number, total: number) => {
    if (remaining === 0) return "Paid";
    if (remaining < total) return "Partially Paid";
    return "Unpaid";
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/invoices/${invoice.id}/payments`);
      if (!isMounted.current) return;

      const mappedPayments: Payment[] = (res.data.payments || []).map((p: any) => ({
        id: p.id ?? 0,
        amount: Number(p.amount) || 0,
        date: p.date || new Date().toISOString(),
        notes: p.notes || "",
      }));

      const total = Number(res.data.total_amount) || 0;
      const remaining = Number(res.data.remaining_amount) || 0;

      setPayments(mappedPayments);
      setTotalAmount(total);
      setRemainingAmount(remaining);
      setStatus(computeStatus(remaining, total));
    } catch (err) {
      console.error("Failed to fetch payments", err);
      if (isMounted.current) {
        setPayments([]);
        setTotalAmount(0);
        setRemainingAmount(0);
        setStatus("Unpaid");
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchPayments();
    return () => {
      isMounted.current = false;
    };
  }, [invoice.id]);

  const handleAddPayment = async () => {
    if (readOnly) return; // 👈 guard in case someone calls it by mistake
    if (newPayment.amount <= 0) return alert("Enter a valid amount");
    if (newPayment.amount > remainingAmount) {
      toast.error(`Payment cannot exceed remaining amount of $${remainingAmount.toFixed(2)}`);
      return;
    }
    if (remainingAmount <= 0) {
      return alert("Invoice is already fully paid!");
    }

    setPaying(true);
    try {
      const res = await axios.post(`/api/invoices/${invoice.id}/payments`, {
        ...newPayment,
        reference_number: "",
      });
      if (!isMounted.current) return;

      const remaining = Number(res.data.remaining_amount) || 0;
      setRemainingAmount(remaining);
      setStatus(computeStatus(remaining, totalAmount));

      await fetchPayments();

      setNewPayment({
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });

      onPaymentSuccess?.();

      if (remaining === 0) {
        alert("Invoice is fully paid!");
      }
    } catch (err: any) {
      console.error("Failed to add payment", err);
      alert(err.response?.data?.error || "Payment failed");
    } finally {
      if (isMounted.current) setPaying(false);
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (readOnly) return; // 👈 hide & block in read-only
    if (!confirm("Are you sure you want to delete this payment?")) return;

    try {
      const res = await axios.delete(`/api/invoices/${invoice.id}/payments/${paymentId}`);

      if (res.data) {
        const total = Number(res.data.total_amount) || totalAmount;
        const remaining = Number(res.data.remaining_amount_invoice) || 0;

        setTotalAmount(total);
        setRemainingAmount(remaining);
        setStatus(res.data.status || computeStatus(remaining, total));
        setPayments(prev => prev.filter(p => p.id !== paymentId));
      }

      onPaymentSuccess?.();
    } catch (err: any) {
      console.error("Failed to delete payment", err);
      alert(err.response?.data?.error || "Failed to delete payment");
    }
  };

  // For read-only, hide “Actions” column entirely:
  const showActionsColumn = !readOnly && status !== "Paid";

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-6">
    <div className="w-full max-w-2xl bg-[#0f1216] mx-4 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
      {/* Header */}
      <div className="px-6 py-4 text-white bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            {readOnly ? "Payment History" : "Partial Payment"}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xl leading-none"
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="bg-black/60 px-6 py-6 pb-12 space-y-5 max-h-[70vh] overflow-y-auto">
      <div className="bg-[#0f1216] text-white px-6 py-6 space-y-5">
        {/* Top: Remaining + Total */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl p-4 bg-gradient-to-br from-emerald-700 to-emerald-600 shadow-lg">
            <div className="text-sm/5 opacity-90">Remaining Balance</div>
            <div className="text-3xl font-semibold mt-1">
              ${Number(remainingAmount || 0).toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl p-4 bg-gradient-to-br from-sky-700 to-sky-600 shadow-lg">
            <div className="text-sm/5 opacity-90">Total Amount</div>
            <div className="text-3xl font-semibold mt-1">
              ${Number(totalAmount || 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Full-width Status */}
       <div className="mt-4">
  <div
    className={classNames(
      "w-full rounded-md px-4 py-2 text-sm font-medium text-left",
      status === "Unpaid"
        ? "bg-red-500/20 text-red-400"
        : status === "Partially Paid"
        ? "bg-amber-500/20 text-amber-400"
        : "bg-emerald-500/20 text-emerald-400"
    )}
  >
   Status: {status}
  </div>
  </div>

        {/* Add Payment */}
        {!readOnly && status !== "Paid" && (
          <div className="space-y-3">
            <div className="text-lg font-semibold">Add Payment</div>

            {/* Row inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {/* Amount */}
              <div className="flex flex-col">
                <label className="text-xs text-white/70 mb-1">Payment Amount</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={newPayment.amount || ""}
                  onChange={(e) =>
                    setNewPayment((p: any) => ({
                      ...p,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1F25] border border-white/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Date */}
              <div className="flex flex-col">
                <label className="text-xs text-white/70 mb-1">Date</label>
                <input
                  type="date"
                  value={newPayment.date}
                  onChange={(e) =>
                    setNewPayment((p: any) => ({ ...p, date: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1F25] border border-white/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Remarks */}
              
            </div>
            <div className="flex flex-col">
                <label className="text-xs text-white/70 mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={newPayment.notes}
                  onChange={(e) =>
                    setNewPayment((p: any) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#1A1F25] border border-white/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

            {/* Record button */}
            <div className="pt-1">
              <button
                onClick={handleAddPayment}
                disabled={paying}
                className="w-full rounded-xl px-4 py-3 text-center font-semibold text-white bg-gradient-to-r from-fuchsia-600 to-amber-500 hover:brightness-110 disabled:opacity-50"
              >
                {paying ? "Processing…" : "Record Payment"}
              </button>
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className="space-y-3">
          <div className="text-lg font-semibold">Payment History</div>

          <div className="rounded-2xl overflow-hidden border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-[#151922] text-white/80">
                <tr className="[&>th]:px-4 [&>th]:py-3 text-left">
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Remarks</th>
                  {!readOnly && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-[#0f1216]">
                {payments?.length ? (
                  payments.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="px-4 py-3 font-semibold">
                        ${Number(p.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {(p.date || "").toString().slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-white/80">
                        {p.notes || "—"}
                      </td>
                      {!readOnly && (
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleDeletePayment(p.id)}
                              className="px-3 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={readOnly ? 3 : 4}
                      className="px-4 py-6 text-center text-white/60"
                    >
                      No payments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer (read-only mode just shows Close) */}
        {readOnly && (
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full rounded-xl px-4 py-3 text-center font-semibold text-white bg-[#1A1F25] border border-white/10 hover:bg-[#212734]"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
  </div>
);
};

export default PartialPaymentModal;
