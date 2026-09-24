import { getProductsAction } from "@/actions/products";
import ProductsManager from "@/components/ProductsManager";

export default async function ProductsPage() {
  const products = await getProductsAction();

  return <ProductsManager initialProducts={products} />;
}
