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
        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 text-sm font-bold rounded-xl border border-red-200 dark:border-red-800/60 shadow-2xs hover:-translate-y-0.5 transition-all cursor-pointer"
        title={`Delete bill ${invoiceNumber}`}
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete</span>
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs"
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-sm mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="font-black text-gray-900 dark:text-gray-100 text-base">Delete Bill {invoiceNumber}?</span>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Are you sure you want to delete bill{" "}
                <span className="font-black text-gray-900 dark:text-gray-100">{invoiceNumber}</span>?
              </p>

              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl px-4 py-3 text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-1">
                <p className="font-bold text-amber-800 dark:text-amber-300">What will happen:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 dark:text-amber-300">
                  <li>
                    <strong>If this is your most recent bill</strong> → permanently deleted,
                    and the next bill will reuse this number.
                  </li>
                  <li>
                    <strong>Otherwise</strong> → hidden from the bills list (number{" "}
                    <em>not</em> reused), but recoverable from{" "}
                    <span className="font-semibold text-gray-900 dark:text-gray-100">Bills → Deleted Bills</span>.
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors cursor-pointer disabled:opacity-60"
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
