import { getSettingsAction } from "@/actions/invoices";
import { getProductsAction } from "@/actions/products";
import InvoiceForm from "@/components/InvoiceForm";

export default async function NewBillPage() {
  const [config, products] = await Promise.all([
    getSettingsAction(),
    getProductsAction(),
  ]);

  return (
    <div className="p-8 md:p-12 max-w-5xl mx-auto">
      <InvoiceForm catalogProducts={products} />
    </div>
  );
}
