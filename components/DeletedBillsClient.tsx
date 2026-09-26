"use client";

import { useState, useTransition } from "react";
import { Undo2, Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { restoreInvoiceAction, permanentlyDeleteInvoiceAction } from "@/actions/invoices";

interface DeletedBill {
  id: string;
  invoiceNumber: string;
  date: string;
  grandTotal: string;
  customerName: string;
  deletedAt: string;
}

export default function DeletedBillsClient({ bills }: { bills: DeletedBill[] }) {
  const [items, setItems] = useState(bills);
  const [confirmPerm, setConfirmPerm] = useState<string | null>(null); // id to permanently delete
  const [pending, startTransition] = useTransition();

  function handleRestore(id: string) {
    startTransition(async () => {
      await restoreInvoiceAction(id);
      setItems((prev) => prev.filter((b) => b.id !== id));
    });
  }

  function handlePermanentDelete(id: string) {
    startTransition(async () => {
      await permanentlyDeleteInvoiceAction(id);
      setItems((prev) => prev.filter((b) => b.id !== id));
      setConfirmPerm(null);
    });
  }

  const confirmBill = items.find((b) => b.id === confirmPerm);

  return (
    <>
      {items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-lg">No deleted bills</p>
          <p className="text-sm mt-1">Bills deleted from the middle of the series appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-bold text-gray-700">Bill No.</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">Customer</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">Date</th>
                <th className="px-4 py-3 text-right font-bold text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">Deleted On</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((bill) => (
                <tr key={bill.id} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-gray-800 bg-red-100 text-red-800 px-2 py-0.5 rounded-lg text-xs">
                      {bill.invoiceNumber}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{bill.customerName}</td>
                  <td className="px-4 py-3 text-gray-600">{bill.date}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    ₹{parseFloat(bill.grandTotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(bill.deletedAt).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {/* Restore */}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleRestore(bill.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-800 font-bold text-xs rounded-xl border border-green-200 transition-colors cursor-pointer disabled:opacity-60"
                        title="Restore this bill"
                      >
                        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                        Recover
                      </button>
                      {/* Permanently delete */}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setConfirmPerm(bill.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 font-bold text-xs rounded-xl border border-red-200 transition-colors cursor-pointer disabled:opacity-60"
                        title="Permanently delete — cannot be undone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Permanently
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Permanent Delete Confirm Modal */}
      {confirmPerm && confirmBill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmPerm(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-black text-gray-900 text-base">Permanent Delete?</span>
              </div>
              <button onClick={() => setConfirmPerm(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                Permanently delete{" "}
                <span className="font-black text-gray-900">{confirmBill.invoiceNumber}</span>?
                <br />
                <span className="text-red-700 font-semibold">This cannot be undone.</span> The bill number{" "}
                <span className="font-mono font-bold">{confirmBill.invoiceNumber}</span> will be permanently
                retired.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmPerm(null)}
                disabled={pending}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handlePermanentDelete(confirmBill.id)}
                disabled={pending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm cursor-pointer disabled:opacity-60"
              >
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {pending ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
