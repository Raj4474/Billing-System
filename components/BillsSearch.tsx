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

export default function BillsSearch({ bills }: { bills: Bill[] }) {
  const [query, setQuery] = useState("");

  const filtered = bills.filter((b) => {
    if (!query.trim()) return true;
    const snap = b.customerSnapshot as { name: string };
    const q = query.toLowerCase();
    return (
      snap.name.toLowerCase().includes(q) ||
      b.invoiceNumber.toLowerCase().includes(q) ||
      b.date.includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Search bar */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer, invoice number, or date…"
            className="w-full pl-11 pr-5 py-3 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-gray-800 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_150px_150px_140px_120px] gap-5 px-6 py-4 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider bg-white">
        <span>Customer</span>
        <span>Invoice No.</span>
        <span>Date</span>
        <span className="text-right">Amount</span>
        <span className="text-center">Actions</span>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="px-6 py-16 text-center text-gray-400 text-base font-medium">
          {bills.length === 0 ? (
            <>
              No bills yet.{" "}
              <Link href="/bills/new" className="text-blue-600 font-bold hover:underline">
                Create one →
              </Link>
            </>
          ) : (
            "No bills match your search."
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filtered.map((bill) => {
            const snap = bill.customerSnapshot as { name: string };

            return (
              <div
                key={bill.id}
                className="grid grid-cols-[1fr_150px_150px_140px_120px] gap-5 px-6 py-5 items-center hover:bg-blue-50/50 transition-colors bg-white group"
              >
                <div>
                  <p className="text-lg font-bold text-gray-900 truncate" title={snap.name}>{snap.name}</p>
                </div>
                <p className="text-base text-gray-600 font-mono font-medium">{bill.invoiceNumber}</p>
                <p className="text-base font-medium text-gray-600">
                  {new Date(bill.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-lg font-black text-gray-900 text-right">
                  ₹{formatINR(parseFloat(bill.grandTotal))}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Link
                    href={`/bills/${bill.id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all hover:scale-105"
                    title="View Bill"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
                  <Link
                    href={`/bills/${bill.id}?print=1`}
                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-all hover:scale-105"
                    title="Print Bill"
                  >
                    <Printer className="w-5 h-5" />
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
