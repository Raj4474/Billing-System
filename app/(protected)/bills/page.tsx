import { db } from "@/lib/db";
import { invoices } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import BillsSearch from "@/components/BillsSearch";

// Always render fresh from DB
export const dynamic = "force-dynamic";

async function getAllInvoices() {
  return db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      date: invoices.date,
      customerSnapshot: invoices.customerSnapshot,
      grandTotal: invoices.grandTotal,
      paymentStatus: invoices.paymentStatus,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .where(eq(invoices.isDeleted, false))
    .orderBy(desc(invoices.createdAt));
}

export default async function BillsPage() {
  const allBills = await getAllInvoices();

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Bills</h1>
          <p className="text-base text-gray-500 dark:text-gray-400 mt-1">{allBills.length} invoice{allBills.length !== 1 ? "s" : ""} total</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/bills/deleted"
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-600 dark:text-gray-300 hover:text-red-700 dark:hover:text-red-400 text-sm font-bold rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 transition-all"
            title="View and recover deleted bills"
          >
            <Trash2 className="w-4 h-4" />
            Deleted Bills
          </Link>
          <Link
            href="/bills/new"
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-base font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Create New Bill
          </Link>
        </div>
      </div>

      <BillsSearch bills={allBills} />
    </div>
  );
}
