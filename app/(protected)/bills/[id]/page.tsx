import { notFound } from "next/navigation";
import { getInvoiceByIdAction, getSettingsAction } from "@/actions/invoices";
import { getProductsAction } from "@/actions/products";
import InvoiceView from "@/components/InvoiceView";

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


  const snap = invoice.customerSnapshot as {
    name: string;
    address?: string;
    gstin?: string;
    phone?: string;
    placeOfSupply?: string;
  };

  return (
    <div className="p-4 md:p-8 bg-gray-100/60 min-h-screen print:bg-white print:p-0">
      <InvoiceView
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoiceNumber}
        date={invoice.date}
        autoPrint={autoPrint}
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
