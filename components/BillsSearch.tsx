"use client";

import { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/utils";
import { Search, Eye, Printer } from "lucide-react";

type Bill = {
  id: string;
  invoiceNumber: string;
  date: string;
  customerSnapshot: unknown;
  grandTotal: string;
  paymentStatus: string | null;
  createdAt: Date | null;
};

function parseCustomer(snap: unknown): string {
  if (!snap) return "Customer";
  let obj: any = snap;
  if (typeof snap === "string") {
    try {
      obj = JSON.parse(snap);
    } catch {
      return snap;
    }
  }
  return obj?.name || "Customer";
}

function formatDisplayDate(rawDate: string | Date | null | undefined): string {
  if (!rawDate) return "-";
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return String(rawDate);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default function BillsSearch({ bills }: { bills: Bill[] }) {
  const [query, setQuery] = useState("");

  const filtered = bills.filter((b) => {
    if (!query.trim()) return true;
    const name = parseCustomer(b.customerSnapshot);
    const q = query.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      b.invoiceNumber.toLowerCase().includes(q) ||
      b.date.includes(q)
    );
  });

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800/80 overflow-hidden transition-colors">
      {/* Search bar */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/40">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer, invoice number, or date…"
            className="w-full pl-11 pr-5 py-3 text-base border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all font-medium"
          />
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_150px_150px_140px_120px] gap-5 px-6 py-4 border-b border-gray-100 dark:border-gray-800/80 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50/30 dark:bg-gray-900/20">
        <span>Customer</span>
        <span>Invoice No.</span>
        <span>Date</span>
        <span className="text-right">Amount</span>
        <span className="text-center">Actions</span>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="px-6 py-16 text-center text-gray-400 dark:text-gray-500 text-base font-medium">
          {bills.length === 0 ? (
            <>
              No bills yet.{" "}
              <Link href="/bills/new" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
                Create one →
              </Link>
            </>
          ) : (
            "No bills match your search."
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
          {filtered.map((bill) => {
            const customerName = parseCustomer(bill.customerSnapshot);
            const numAmt = parseFloat(bill.grandTotal || "0");
            const safeAmt = isNaN(numAmt) ? "0.00" : formatINR(numAmt);

            return (
              <div
                key={bill.id}
                className="grid grid-cols-[1fr_150px_150px_140px_120px] gap-5 px-6 py-5 items-center hover:bg-blue-50/40 dark:hover:bg-gray-800/40 transition-colors bg-white dark:bg-[#0f172a] group"
              >
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100 truncate" title={customerName}>
                    {customerName}
                  </p>
                </div>
                <div>
                  <span className="font-mono text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2.5 py-1 rounded-lg">
                    {bill.invoiceNumber}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {formatDisplayDate(bill.date)}
                </p>
                <p className="text-base font-black text-gray-900 dark:text-gray-100 text-right">
                  ₹{safeAmt}
                </p>
                <div className="flex items-center justify-center gap-1.5">
                  <Link
                    href={`/bills/${bill.id}`}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-800 rounded-lg transition-all"
                    title="View Bill"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/bills/${bill.id}?print=1`}
                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                    title="Print / Save PDF"
                  >
                    <Printer className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
