import { db } from "@/lib/db";
import { invoices } from "@/lib/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { Plus } from "lucide-react";
import BillsSearch from "@/components/BillsSearch";

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
    .orderBy(desc(invoices.createdAt));
}

export default async function BillsPage() {
  const allBills = await getAllInvoices();

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Bills</h1>
          <p className="text-base text-gray-500 mt-1">{allBills.length} invoice{allBills.length !== 1 ? "s" : ""} total</p>
        </div>
        <Link
          href="/bills/new"
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-base font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          Create New Bill
        </Link>
      </div>

      <BillsSearch bills={allBills} />
    </div>
  );
}
