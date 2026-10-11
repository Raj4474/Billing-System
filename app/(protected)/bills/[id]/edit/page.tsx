import { notFound } from "next/navigation";
import { getInvoiceByIdAction } from "@/actions/invoices";
import { getProductsAction } from "@/actions/products";
import InvoiceForm from "@/components/InvoiceForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EditBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, products] = await Promise.all([
    getInvoiceByIdAction(id),
    getProductsAction(),
  ]);

  if (!invoice) notFound();

  const snap = invoice.customerSnapshot as {
    name: string;
    address?: string;
    gstin?: string;
    phone?: string;
    placeOfSupply?: string;
  };

  const useIgst = parseFloat(invoice.igst || "0") > 0;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/bills/${id}`}
          className="flex items-center gap-2 text-base font-bold text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-white dark:bg-[#0f172a] px-4 py-2 rounded-xl shadow-xs border border-gray-200 dark:border-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bill Preview
        </Link>
        <span className="text-gray-300 dark:text-gray-700">|</span>
        <span className="font-mono text-gray-700 dark:text-gray-300 font-bold">{invoice.invoiceNumber}</span>
      </div>

      <InvoiceForm
        catalogProducts={products}
        initialInvoice={{
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          date: invoice.date,
          customerId: invoice.customerId,
          customerSnapshot: snap,
          transport: invoice.transport,
          ewayBillNo: invoice.ewayBillNo,
          dalalName: invoice.dalalName,
          dalalContact: invoice.dalalContact,
          items: invoice.items.map((item) => ({
            srNo: item.srNo,
            productName: item.productName,
            hsnCode: item.hsnCode,
            quantity: String(item.quantity),
            unit: item.unit,
            rate: String(item.rate),
            gstPercent: item.gstPercent ?? "0",
            amount: Number(item.amount),
          })),
          notes: invoice.notes,
          gstMode: useIgst ? "igst" : "cgst_sgst",
        }}
      />
    </div>
  );
}
