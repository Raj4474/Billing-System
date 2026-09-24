import Link from "next/link";
import { db } from "@/lib/db";
import { invoices } from "@/lib/schema";
import { desc, gte, sql } from "drizzle-orm";
import { formatINR } from "@/lib/utils";
import { Plus, FileText } from "lucide-react";

async function getDashboardData() {
  const today = new Date().toISOString().split("T")[0];

  const todayBills = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(gte(invoices.date, today));

  const recent = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      date: invoices.date,
      customerSnapshot: invoices.customerSnapshot,
      grandTotal: invoices.grandTotal,
      paymentStatus: invoices.paymentStatus,
    })
    .from(invoices)
    .orderBy(desc(invoices.createdAt))
    .limit(8);

  return {
    todayCount: Number(todayBills[0]?.count ?? 0),
    recent,
  };
}

export default async function DashboardPage() {
  const { recent } = await getDashboardData();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-base text-gray-500 mt-1 font-medium">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/bills/new"
            className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-6 h-6" />
            CREATE BILL
          </Link>
        </div>
      </div>

      {/* Recent Bills */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-gray-900 text-lg uppercase tracking-wide">Recent Bills</h2>
          <Link
            href="/bills"
            className="text-base text-blue-600 hover:text-blue-700 font-bold hover:underline"
          >
            View All →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400 text-lg font-medium">
            No bills recorded yet.{" "}
            <Link href="/bills/new" className="text-blue-600 font-bold hover:underline">
              Create a new bill →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map((bill) => {
              const snap = bill.customerSnapshot as { name: string };

              return (
                <Link
                  key={bill.id}
                  href={`/bills/${bill.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-5 hover:bg-blue-50/50 transition-colors group"
                >
                  <div>
                    <p className="text-xl font-bold text-gray-900 mb-1">{snap.name}</p>
                    <p className="text-sm text-gray-500 font-medium">
                      <span className="font-mono">{bill.invoiceNumber}</span> ·{" "}
                      {new Date(bill.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-left sm:text-right mt-3 sm:mt-0">
                    <p className="text-xl font-black text-gray-900">
                      ₹{formatINR(parseFloat(bill.grandTotal))}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
