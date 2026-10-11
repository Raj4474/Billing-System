"use client";

import { updatePaymentStatusAction } from "@/actions/invoices";
import { useTransition } from "react";

export default function PaymentStatusForm({
  invoiceId,
  current,
}: {
  invoiceId: string;
  current: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value;
    startTransition(async () => {
      await updatePaymentStatusAction(invoiceId, status);
    });
  }

  const colorMap: Record<string, string> = {
    unpaid: "text-red-600",
    partial: "text-yellow-600",
    paid: "text-green-600",
  };

  return (
    <select
      defaultValue={current}
      onChange={handleChange}
      disabled={isPending}
      className={`px-4 py-3 text-lg font-bold border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40 uppercase tracking-wide cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${colorMap[current] ?? ""}`}
    >
      <option value="unpaid" className="text-red-600 dark:text-red-400 font-bold uppercase bg-white dark:bg-gray-900">Unpaid</option>
      <option value="partial" className="text-yellow-600 dark:text-yellow-400 font-bold uppercase bg-white dark:bg-gray-900">Partial</option>
      <option value="paid" className="text-green-600 dark:text-green-400 font-bold uppercase bg-white dark:bg-gray-900">Paid</option>
    </select>
  );
}
