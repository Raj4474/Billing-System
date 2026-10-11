import Link from "next/link";
import { ArrowLeft, Trash2, Info } from "lucide-react";
import { getDeletedInvoicesAction } from "@/actions/invoices";
import DeletedBillsClient from "@/components/DeletedBillsClient";

export const dynamic = "force-dynamic";

export default async function DeletedBillsPage() {
  const deletedRaw = await getDeletedInvoicesAction();

  const bills = deletedRaw.map((b) => {
    let customerName = "—";
    try {
      const snap = typeof b.customerSnapshot === "string"
        ? JSON.parse(b.customerSnapshot as string)
        : (b.customerSnapshot as { name?: string });
      customerName = snap?.name || "—";
    } catch {
      customerName = "—";
    }

    return {
      id: b.id,
      invoiceNumber: b.invoiceNumber,
      date: b.date,
      grandTotal: b.grandTotal ?? "0",
      customerName,
      deletedAt: b.deletedAt ? new Date(b.deletedAt).toISOString() : new Date().toISOString(),
    };
  });

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-[#090d16] min-h-screen transition-colors duration-200">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-800/80 shadow-sm px-5 py-4 transition-colors">
          <div className="flex items-center gap-4">
            <Link
              href="/bills"
              className="flex items-center gap-2 text-base font-bold text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-50 dark:bg-gray-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-4 py-2.5 rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Bills
            </Link>
            <span className="text-gray-300 dark:text-gray-700 text-2xl font-light">|</span>
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              <span className="text-lg font-black text-gray-900 dark:text-gray-100">Deleted Bills</span>
            </div>
          </div>
          <span className="text-sm text-gray-500 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/60 px-3 py-1.5 rounded-xl">
            {bills.length} {bills.length === 1 ? "record" : "records"}
          </span>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-2xl px-5 py-4 text-sm text-blue-900 dark:text-blue-200 transition-colors">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1">
            <p className="font-bold">How bill deletion works:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-800 dark:text-blue-300 text-xs leading-relaxed">
              <li>
                <strong>Most recent bill</strong> → permanently deleted immediately (counter reused for next bill)
              </li>
              <li>
                <strong>Any older bill</strong> → shown here, recoverable. Its number is retired and won&apos;t be reused.
              </li>
              <li>
                <strong>Recover</strong> restores the bill to active status.{" "}
                <strong>Delete Permanently</strong> removes it forever.
              </li>
            </ul>
          </div>
        </div>

        {/* Deleted Bills Table */}
        <DeletedBillsClient bills={bills} />
      </div>
    </div>
  );
}
