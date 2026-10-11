import Link from "next/link";
import { db } from "@/lib/db";
import { invoices } from "@/lib/schema";
import { desc, eq } from "drizzle-orm";
import { formatINR } from "@/lib/utils";

// Always render fresh from DB — never serve a static snapshot
export const dynamic = "force-dynamic";

import {
  Plus,
  Receipt,
  Calendar,
  TrendingUp,
  Eye,
  Printer,
  ArrowRight,
  FileText,
} from "lucide-react";

function parseCustomerSnapshot(snap: unknown): {
  name: string;
  phone?: string;
  city?: string;
} {
  if (!snap) return { name: "Customer" };
  let obj: any = snap;
  if (typeof snap === "string") {
    try {
      obj = JSON.parse(snap);
    } catch {
      return { name: snap };
    }
  }
  return {
    name: obj?.name || "Customer",
    phone: obj?.phone || undefined,
    city: obj?.placeOfSupply || (obj?.address ? obj.address.split(",")[0] : undefined),
  };
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

async function getDashboardData() {
  const allInvoices = await db
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

  const totalBills = allInvoices.length;
  let totalSales = 0;
  let todayCount = 0;

  const now = new Date();
  const todayIST = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "YYYY-MM-DD" in IST

  for (const inv of allInvoices) {
    const amt = parseFloat(inv.grandTotal || "0");
    if (!isNaN(amt)) totalSales += amt;

    if (inv.date) {
      const invIST = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(inv.date));
      if (invIST === todayIST) {
        todayCount++;
      }
    }
  }

  const recent = allInvoices.slice(0, 8);

  return {
    totalBills,
    todayCount,
    totalSales,
    recent,
  };
}

export default async function DashboardPage() {
  const { totalBills, todayCount, totalSales, recent } = await getDashboardData();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </p>
        </div>

        <Link
          href="/bills/new"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold rounded-xl shadow-md shadow-blue-500/20 hover:-translate-y-0.5 transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>CREATE BILL</span>
        </Link>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Bills</p>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-0.5">{totalBills}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Today&apos;s Bills</p>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-0.5">{todayCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800/80 shadow-xs flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-2xl font-black text-gray-900 dark:text-gray-100 mt-0.5">₹{formatINR(totalSales)}</p>
          </div>
        </div>
      </div>

      {/* Recent Bills Section */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-200/80 dark:border-gray-800/80 overflow-hidden shadow-xs transition-colors">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/40">
          <div className="flex items-center gap-2.5">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base uppercase tracking-wide">Recent Bills</h2>
            <span className="text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/60">
              Latest {recent.length}
            </span>
          </div>
          <Link
            href="/bills"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400 dark:text-gray-500">
            <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-base font-semibold text-gray-600 dark:text-gray-300">No bills recorded yet.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">Start by creating your first bill</p>
            <Link
              href="/bills/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/25"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Bill</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800/80 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50/30 dark:bg-gray-900/20">
                  <th className="py-3.5 px-6">Bill No.</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Date</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
                {recent.map((bill) => {
                  const cust = parseCustomerSnapshot(bill.customerSnapshot);
                  const numAmt = parseFloat(bill.grandTotal || "0");
                  const safeAmt = isNaN(numAmt) ? "0.00" : formatINR(numAmt);

                  return (
                    <tr
                      key={bill.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-gray-800/40 transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <Link
                          href={`/bills/${bill.id}`}
                          className="inline-flex items-center font-mono font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-900 dark:group-hover:text-blue-300 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {bill.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        <Link href={`/bills/${bill.id}`} className="block">
                          <p className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {cust.name}
                          </p>
                          {(cust.phone || cust.city) && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {[cust.city, cust.phone].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </Link>
                      </td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                        {formatDisplayDate(bill.date)}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <span className="font-black text-gray-900 dark:text-gray-100 text-base">
                          ₹{safeAmt}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center whitespace-nowrap">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

