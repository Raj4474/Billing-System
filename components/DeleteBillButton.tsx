"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, X, Loader2 } from "lucide-react";
import { deleteInvoiceAction } from "@/actions/invoices";

interface DeleteBillButtonProps {
  invoiceId: string;
  invoiceNumber: string;
  isMostRecentHint?: boolean; // purely for informational message
}

export default function DeleteBillButton({
  invoiceId,
  invoiceNumber,
  isMostRecentHint,
}: DeleteBillButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      try {
        const result = await deleteInvoiceAction(invoiceId);
        if (result.hardDeleted) {
          // Permanently deleted → go back to bills list
          router.push("/bills");
        } else {
          // Soft-deleted → go back to bills list (bill is now hidden)
          router.push("/bills");
        }
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Delete failed. Please try again.");
      }
    });
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 text-sm font-bold rounded-xl border border-red-200 shadow-2xs hover:-translate-y-0.5 transition-all cursor-pointer"
        title={`Delete bill ${invoiceNumber}`}
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <span className="font-black text-gray-900 text-base">Delete Bill {invoiceNumber}?</span>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                Are you sure you want to delete bill{" "}
                <span className="font-black text-gray-900">{invoiceNumber}</span>?
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900 leading-relaxed space-y-1">
                <p className="font-bold text-amber-800">What will happen:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                  <li>
                    <strong>If this is your most recent bill</strong> → permanently deleted,
                    and the next bill will reuse this number.
                  </li>
                  <li>
                    <strong>Otherwise</strong> → hidden from the bills list (number{" "}
                    <em>not</em> reused), but recoverable from{" "}
                    <span className="font-semibold">Bills → Deleted Bills</span>.
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isPending ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
