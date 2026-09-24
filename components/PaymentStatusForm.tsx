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
      className={`px-4 py-3 text-lg font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 uppercase tracking-wide cursor-pointer transition-colors hover:bg-gray-50 ${colorMap[current] ?? ""}`}
    >
      <option value="unpaid" className="text-red-600 font-bold uppercase">Unpaid</option>
      <option value="partial" className="text-yellow-600 font-bold uppercase">Partial</option>
      <option value="paid" className="text-green-600 font-bold uppercase">Paid</option>
    </select>
  );
}
