"use server";

import { db } from "@/lib/db";
import { products } from "@/lib/schema";
import { eq, ilike, or, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type Product = {
  id: string;
  name: string;
  hsnCode: string | null;
  defaultUnit: string | null;
  defaultGst: string | null;
  createdAt: Date | null;
};

export type ProductInput = {
  name: string;
  hsnCode?: string;
  defaultUnit?: string;
  defaultGst?: string;
};

// ─── Get all products ─────────────────────────────────────────────────────────

export async function getProductsAction(): Promise<Product[]> {
  return db
    .select({
      id: products.id,
      name: products.name,
      hsnCode: products.hsnCode,
      defaultUnit: products.defaultUnit,
      defaultGst: products.defaultGst,
      createdAt: products.createdAt,
    })
    .from(products)
    .orderBy(products.name);
}

// ─── Create product ───────────────────────────────────────────────────────────

export async function createProductAction(input: ProductInput) {
  if (!input.name.trim()) throw new Error("Product name is required");

  const [created] = await db
    .insert(products)
    .values({
      name: input.name.trim(),
      hsnCode: input.hsnCode?.trim() || null,
      defaultUnit: input.defaultUnit?.trim() || "kg",
      defaultGst: input.defaultGst?.trim() || "0",
    })
    .returning();

  revalidatePath("/products");
  revalidatePath("/bills/new");
  return created;
}

// ─── Update product ───────────────────────────────────────────────────────────

export async function updateProductAction(id: string, input: ProductInput) {
  if (!input.name.trim()) throw new Error("Product name is required");

  const [updated] = await db
    .update(products)
    .set({
      name: input.name.trim(),
      hsnCode: input.hsnCode?.trim() || null,
      defaultUnit: input.defaultUnit?.trim() || "kg",
      defaultGst: input.defaultGst?.trim() || "0",
    })
    .where(eq(products.id, id))
    .returning();

  revalidatePath("/products");
  revalidatePath("/bills/new");
  return updated;
}

// ─── Delete product ───────────────────────────────────────────────────────────

export async function deleteProductAction(id: string) {
  await db.delete(products).where(eq(products.id, id));
  revalidatePath("/products");
  revalidatePath("/bills/new");
}

// ─── Search products for autocomplete / dropdown ─────────────────────────────

export async function searchProductsAction(query?: string) {
  if (!query || query.trim().length === 0) {
    return db
      .select({
        id: products.id,
        name: products.name,
        hsnCode: products.hsnCode,
        defaultUnit: products.defaultUnit,
        defaultGst: products.defaultGst,
      })
      .from(products)
      .orderBy(products.name)
      .limit(20);
  }

  const q = `%${query.trim()}%`;
  return db
    .select({
      id: products.id,
      name: products.name,
      hsnCode: products.hsnCode,
      defaultUnit: products.defaultUnit,
      defaultGst: products.defaultGst,
    })
    .from(products)
    .where(or(ilike(products.name, q), ilike(products.hsnCode, q)))
    .orderBy(products.name)
    .limit(10);
}
