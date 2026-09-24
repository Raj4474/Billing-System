"use server";

import { db } from "@/lib/db";
import { customers, invoices, invoiceItems, settings, products } from "@/lib/schema";
import { numberToWords } from "@/lib/utils";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceItem = {
  srNo: number;
  productName: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  gstPercent: number;
  amount: number;
};

export type CustomerSnapshot = {
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
  placeOfSupply?: string;
};

export type CreateInvoiceInput = {
  date: string;
  customerId?: string;
  customerSnapshot: CustomerSnapshot;
  transport?: string;
  ewayBillNo?: string;
  items: InvoiceItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  notes?: string;
};

// ─── Generate next invoice number ────────────────────────────────────────────

async function generateInvoiceNumber(): Promise<string> {
  // Increment counter in settings atomically
  const [updated] = await db
    .update(settings)
    .set({
      invoiceCounter: sql`${settings.invoiceCounter} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(settings.id, "default"))
    .returning({ counter: settings.invoiceCounter, prefix: settings.invoicePrefix });

  if (!updated) {
    // Seed default settings row if missing
    await db.insert(settings).values({ id: "default" }).onConflictDoNothing();
    return generateInvoiceNumber();
  }

  const padded = String(updated.counter).padStart(3, "0");
  return `${updated.prefix}-${padded}`;
}

// ─── Create Invoice ───────────────────────────────────────────────────────────

export async function createInvoiceAction(input: CreateInvoiceInput) {
  const invoiceNumber = await generateInvoiceNumber();
  const amountInWords = numberToWords(input.grandTotal);

  // Upsert customer to keep a reference record
  let customerId = input.customerId;
  if (!customerId && input.customerSnapshot.name) {
    const [existing] = await db
      .select()
      .from(customers)
      .where(ilike(customers.name, input.customerSnapshot.name))
      .limit(1);

    if (existing) {
      customerId = existing.id;
    } else {
      const [newCustomer] = await db
        .insert(customers)
        .values({
          name: input.customerSnapshot.name,
          address: input.customerSnapshot.address,
          gstin: input.customerSnapshot.gstin,
          phone: input.customerSnapshot.phone,
          placeOfSupply: input.customerSnapshot.placeOfSupply,
        })
        .returning({ id: customers.id });
      customerId = newCustomer.id;
    }
  }

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber,
      date: input.date,
      customerId,
      customerSnapshot: input.customerSnapshot,
      transport: input.transport,
      ewayBillNo: input.ewayBillNo,
      subtotal: String(input.subtotal),
      cgst: String(input.cgst),
      sgst: String(input.sgst),
      igst: String(input.igst),
      grandTotal: String(input.grandTotal),
      amountInWords,
      notes: input.notes,
    })
    .returning({ id: invoices.id });

  // Insert line items
  await db.insert(invoiceItems).values(
    input.items.map((item) => ({
      invoiceId: invoice.id,
      srNo: item.srNo,
      productName: item.productName,
      hsnCode: item.hsnCode,
      quantity: String(item.quantity),
      unit: item.unit,
      rate: String(item.rate),
      gstPercent: String(item.gstPercent),
      amount: String(item.amount),
    }))
  );

  // Learn products for autocomplete
  for (const item of input.items) {
    if (item.productName.trim()) {
      await db
        .insert(products)
        .values({
          name: item.productName.trim(),
          hsnCode: item.hsnCode,
          defaultUnit: item.unit,
          defaultRate: String(item.rate),
          defaultGst: String(item.gstPercent),
        })
        .onConflictDoNothing();
    }
  }

  revalidatePath("/bills");
  redirect(`/bills/${invoice.id}`);
}

// ─── Get all invoices (list) ──────────────────────────────────────────────────

export async function getInvoicesAction(search?: string) {
  const query = db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      date: invoices.date,
      customerSnapshot: invoices.customerSnapshot,
      grandTotal: invoices.grandTotal,
      paymentStatus: invoices.paymentStatus,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .orderBy(desc(invoices.createdAt));

  return query;
}

// ─── Get single invoice with items ───────────────────────────────────────────

export async function getInvoiceByIdAction(id: string) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  if (!invoice) return null;

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.srNo);

  return { ...invoice, items };
}

// ─── Update payment status ────────────────────────────────────────────────────

export async function updatePaymentStatusAction(id: string, status: string) {
  await db
    .update(invoices)
    .set({ paymentStatus: status })
    .where(eq(invoices.id, id));
  revalidatePath(`/bills/${id}`);
  revalidatePath("/bills");
}

// ─── Customer autocomplete ────────────────────────────────────────────────────

export async function searchCustomersAction(query: string) {
  if (!query || query.length < 1) return [];
  return db
    .select()
    .from(customers)
    .where(ilike(customers.name, `%${query}%`))
    .limit(8);
}

// ─── Product autocomplete ─────────────────────────────────────────────────────

export async function searchProductsAction(query: string) {
  if (!query || query.length < 1) return [];
  return db
    .select()
    .from(products)
    .where(ilike(products.name, `%${query}%`))
    .limit(8);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettingsAction() {
  const [row] = await db.select().from(settings).where(eq(settings.id, "default")).limit(1);
  return row ?? null;
}

export async function saveSettingsAction(data: Partial<typeof settings.$inferInsert>) {
  await db
    .insert(settings)
    .values({ id: "default", ...data })
    .onConflictDoUpdate({
      target: settings.id,
      set: { ...data, updatedAt: new Date() },
    });
  revalidatePath("/settings");
}
