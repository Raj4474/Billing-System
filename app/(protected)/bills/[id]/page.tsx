import { notFound, redirect } from "next/navigation";
import { getInvoiceByIdAction, getSettingsAction } from "@/actions/invoices";
import { getProductsAction } from "@/actions/products";
import InvoiceView from "@/components/InvoiceView";
import PrintButton from "@/components/PrintButton";
import DeleteBillButton from "@/components/DeleteBillButton";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ print?: string }>;
}) {
  const { id } = await params;
  const sParams = searchParams ? await searchParams : {};
  const autoPrint = sParams?.print === "1";

  const [invoice, settings, products] = await Promise.all([
    getInvoiceByIdAction(id),
    getSettingsAction(),
    getProductsAction(),
  ]);

  if (!invoice) notFound();

  // Soft-deleted bill — show a clear message with recovery link
  if (invoice.isDeleted) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/60 flex items-center justify-center mx-auto">
          <Trash2 className="w-7 h-7 text-red-500 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100">Bill Deleted</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bill <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{invoice.invoiceNumber}</span> has been deleted.
          It can be recovered from the Deleted Bills page.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/bills" className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-colors">
            ← All Bills
          </Link>
          <Link href="/bills/deleted" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-500/20">
            Go to Deleted Bills
          </Link>
        </div>
      </div>
    );
  }

  const snap = invoice.customerSnapshot as {
    name: string;
    address?: string;
    gstin?: string;
    phone?: string;
    placeOfSupply?: string;
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-[#090d16] min-h-screen print:bg-white print:p-0 transition-colors duration-200">
      {/* Toolbar — hidden on print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 max-w-5xl mx-auto print:hidden bg-white dark:bg-[#0f172a] p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800/80 transition-colors">
        <div className="flex items-center gap-4">
          <Link
            href="/bills"
            className="flex items-center gap-2 text-base font-bold text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors bg-gray-50 dark:bg-gray-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 px-4 py-2.5 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <span className="text-gray-300 dark:text-gray-700 text-2xl font-light">|</span>
          <span className="text-lg font-black text-gray-900 dark:text-gray-100 tracking-wide">
            {invoice.invoiceNumber}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/bills/${id}/edit`}
            className="flex items-center gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-base font-bold rounded-xl transition-all shadow-2xs hover:-translate-y-0.5 border border-gray-200/60 dark:border-gray-700/60"
            title="Edit Entire Bill Form"
          >
            <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Edit Bill
          </Link>
          <DeleteBillButton
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
          />
          <PrintButton
            invoiceNumber={invoice.invoiceNumber}
            customerName={snap?.name}
            autoPrint={autoPrint}
          />
        </div>
      </div>

      {/* Invoice */}
      <InvoiceView
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        date={invoice.date}
        transport={invoice.transport}
        ewayBillNo={invoice.ewayBillNo}
        dalalName={invoice.dalalName}
        dalalContact={invoice.dalalContact}
        catalogProducts={products}
        customerSnapshot={snap}
        items={invoice.items.map((item) => ({
          srNo: item.srNo,
          productName: item.productName,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          gstPercent: item.gstPercent ?? "0",
          amount: item.amount,
        }))}
        subtotal={invoice.subtotal}
        cgst={invoice.cgst ?? "0"}
        sgst={invoice.sgst ?? "0"}
        igst={invoice.igst ?? "0"}
        grandTotal={invoice.grandTotal}
        amountInWords={invoice.amountInWords}
        notes={invoice.notes}
        settings={{
          companyName: settings?.companyName,
          address: settings?.address,
          phone: settings?.phone,
          email: settings?.email,
          gstin: settings?.gstin,
          msmeNo: settings?.msmeNo,
          bankName: settings?.bankName,
          bankAccount: settings?.bankAccount,
          ifscCode: settings?.ifscCode,
          termsAndConditions: settings?.termsAndConditions,
        }}
      />
    </div>
  );
}
