import { getSettingsAction } from "@/actions/invoices";
import InvoiceForm from "@/components/InvoiceForm";

export default async function NewBillPage() {
  const config = await getSettingsAction();

  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto">
      <InvoiceForm />
    </div>
  );
}
