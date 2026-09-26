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
  dalalName?: string;
  dalalContact?: string;
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
      dalalName: input.dalalName,
      dalalContact: input.dalalContact,
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
    .where(eq(invoices.isDeleted, false))
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

export async function searchProductsAction(query?: string) {
  if (!query || query.trim().length === 0) {
    return db
      .select({
        id: products.id,
        name: products.name,
        hsnCode: products.hsnCode,
        defaultUnit: products.defaultUnit,
        defaultRate: products.defaultRate,
        defaultGst: products.defaultGst,
      })
      .from(products)
      .orderBy(products.name)
      .limit(15);
  }
  const q = `%${query.trim()}%`;
  return db
    .select({
      id: products.id,
      name: products.name,
      hsnCode: products.hsnCode,
      defaultUnit: products.defaultUnit,
      defaultRate: products.defaultRate,
      defaultGst: products.defaultGst,
    })
    .from(products)
    .where(or(ilike(products.name, q), ilike(products.hsnCode, q)))
    .orderBy(products.name)
    .limit(10);
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
  revalidatePath("/bills");
}

// ─── Update Invoice Customer ──────────────────────────────────────────────────
export async function updateInvoiceCustomerAction(
  invoiceId: string,
  customerSnapshot: CustomerSnapshot
) {
  await db
    .update(invoices)
    .set({ customerSnapshot })
    .where(eq(invoices.id, invoiceId));

  if (customerSnapshot.name) {
    const [existing] = await db
      .select()
      .from(customers)
      .where(ilike(customers.name, customerSnapshot.name))
      .limit(1);

    if (existing) {
      await db
        .update(customers)
        .set({
          address: customerSnapshot.address,
          gstin: customerSnapshot.gstin,
          phone: customerSnapshot.phone,
          placeOfSupply: customerSnapshot.placeOfSupply,
        })
        .where(eq(customers.id, existing.id));
    }
  }

  revalidatePath(`/bills/${invoiceId}`);
  revalidatePath("/bills");
}

// ─── Update Invoice Meta (Date, Transport, eWay, Notes) ──────────────────────
export async function updateInvoiceMetaAction(
  invoiceId: string,
  data: {
    date?: string;
    transport?: string;
    ewayBillNo?: string;
    dalalName?: string;
    dalalContact?: string;
    notes?: string;
  }
) {
  await db
    .update(invoices)
    .set(data)
    .where(eq(invoices.id, invoiceId));

  revalidatePath(`/bills/${invoiceId}`);
  revalidatePath("/bills");
}

// ─── Update Invoice Items & Recalculate ───────────────────────────────────────
export async function updateInvoiceItemsAction(
  invoiceId: string,
  items: InvoiceItem[],
  forcedGstMode?: "cgst_sgst" | "igst"
) {
  const [current] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!current) throw new Error("Invoice not found");

  const useIgst = forcedGstMode
    ? forcedGstMode === "igst"
    : parseFloat(current.igst || "0") > 0;

  const validItems = items.filter((i) => i.productName.trim());
  const subtotal = validItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalTax = validItems.reduce((s, i) => {
    const gst = Number(i.gstPercent || 0);
    return s + (Number(i.amount) || 0) * (gst / 100);
  }, 0);

  const cgst = useIgst ? 0 : totalTax / 2;
  const sgst = useIgst ? 0 : totalTax / 2;
  const igst = useIgst ? totalTax : 0;
  const grandTotal = subtotal + totalTax;
  const amountInWords = numberToWords(grandTotal);

  // Replace invoice items
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  if (validItems.length > 0) {
    await db.insert(invoiceItems).values(
      validItems.map((item, idx) => ({
        invoiceId,
        srNo: idx + 1,
        productName: item.productName,
        hsnCode: item.hsnCode,
        quantity: String(item.quantity),
        unit: item.unit,
        rate: String(item.rate),
        gstPercent: String(item.gstPercent),
        amount: String(item.amount),
      }))
    );
  }

  const roundedSubtotal = String(Math.round(subtotal * 100) / 100);
  const roundedCgst = String(Math.round(cgst * 100) / 100);
  const roundedSgst = String(Math.round(sgst * 100) / 100);
  const roundedIgst = String(Math.round(igst * 100) / 100);
  const roundedGrandTotal = String(Math.round(grandTotal * 100) / 100);

  await db
    .update(invoices)
    .set({
      subtotal: roundedSubtotal,
      cgst: roundedCgst,
      sgst: roundedSgst,
      igst: roundedIgst,
      grandTotal: roundedGrandTotal,
      amountInWords,
    })
    .where(eq(invoices.id, invoiceId));

  revalidatePath(`/bills/${invoiceId}`);
  revalidatePath("/bills");

  return {
    subtotal: roundedSubtotal,
    cgst: roundedCgst,
    sgst: roundedSgst,
    igst: roundedIgst,
    grandTotal: roundedGrandTotal,
    amountInWords,
    items: validItems.map((item, idx) => ({
      ...item,
      srNo: idx + 1,
      quantity: String(item.quantity),
      rate: String(item.rate),
      gstPercent: String(item.gstPercent),
      amount: String(item.amount),
    })),
  };
}

// ─── Update Full Invoice (from Edit Form) ────────────────────────────────────
export async function updateFullInvoiceAction(
  invoiceId: string,
  input: CreateInvoiceInput
) {
  const amountInWords = numberToWords(input.grandTotal);

  await db
    .update(invoices)
    .set({
      date: input.date,
      customerSnapshot: input.customerSnapshot,
      transport: input.transport,
      ewayBillNo: input.ewayBillNo,
      dalalName: input.dalalName,
      dalalContact: input.dalalContact,
      subtotal: String(input.subtotal),
      cgst: String(input.cgst),
      sgst: String(input.sgst),
      igst: String(input.igst),
      grandTotal: String(input.grandTotal),
      amountInWords,
      notes: input.notes,
    })
    .where(eq(invoices.id, invoiceId));

  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  const validItems = input.items.filter((i) => i.productName.trim());
  if (validItems.length > 0) {
    await db.insert(invoiceItems).values(
      validItems.map((item, idx) => ({
        invoiceId,
        srNo: idx + 1,
        productName: item.productName,
        hsnCode: item.hsnCode,
        quantity: String(item.quantity),
        unit: item.unit,
        rate: String(item.rate),
        gstPercent: String(item.gstPercent),
        amount: String(item.amount),
      }))
    );
  }

  revalidatePath(`/bills/${invoiceId}`);
  revalidatePath("/bills");
  redirect(`/bills/${invoiceId}`);
}

// ─── Smart Delete Invoice ─────────────────────────────────────────────────────
//
// Rules:
//   • If the bill is the MOST RECENT active bill (highest invoiceCounter number)
//     → Hard delete from DB + decrement the settings.invoiceCounter by 1
//       so the next bill reuses the same number in the sequence.
//   • Otherwise
//     → Soft delete: set isDeleted=true, deletedAt=now()
//       The bill number is permanently retired (not reused).
//       The bill is hidden from the main UI but recoverable.
//
export async function deleteInvoiceAction(id: string): Promise<{ hardDeleted: boolean }> {
  // Load the target invoice
  const [target] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  if (!target) throw new Error("Invoice not found");

  // Find the most recent ACTIVE invoice (createdAt DESC)
  const [latestActive] = await db
    .select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(eq(invoices.isDeleted, false))
    .orderBy(desc(invoices.createdAt))
    .limit(1);

  const isMostRecent = latestActive?.id === id;

  if (isMostRecent) {
    // ── Hard delete ──────────────────────────────────────────────────────
    // invoice_items are cascade-deleted via FK constraint
    await db.delete(invoices).where(eq(invoices.id, id));

    // Decrement the settings counter so the next bill reuses this number
    await db
      .update(settings)
      .set({
        invoiceCounter: sql`GREATEST(0, ${settings.invoiceCounter} - 1)`,
        updatedAt: new Date(),
      })
      .where(eq(settings.id, "default"));

    revalidatePath("/bills");
    revalidatePath("/dashboard");
    return { hardDeleted: true };
  } else {
    // ── Soft delete ──────────────────────────────────────────────────────
    await db
      .update(invoices)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(invoices.id, id));

    revalidatePath("/bills");
    revalidatePath("/dashboard");
    return { hardDeleted: false };
  }
}

// ─── Restore Soft-Deleted Invoice ────────────────────────────────────────────
export async function restoreInvoiceAction(id: string): Promise<void> {
  await db
    .update(invoices)
    .set({ isDeleted: false, deletedAt: null })
    .where(eq(invoices.id, id));

  revalidatePath("/bills");
  revalidatePath("/bills/deleted");
  revalidatePath("/dashboard");
}

// ─── Permanently Delete a Soft-Deleted Invoice ───────────────────────────────
// Only callable from the Deleted Bills recovery page.
// Bill number is permanently retired — counter is NOT decremented.
export async function permanentlyDeleteInvoiceAction(id: string): Promise<void> {
  const [target] = await db
    .select({ isDeleted: invoices.isDeleted })
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  if (!target?.isDeleted) {
    throw new Error("Can only permanently delete soft-deleted bills");
  }

  await db.delete(invoices).where(eq(invoices.id, id));

  revalidatePath("/bills/deleted");
  revalidatePath("/bills");
}

// ─── Get Soft-Deleted (Recoverable) Invoices ─────────────────────────────────
export async function getDeletedInvoicesAction() {
  return db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      date: invoices.date,
      customerSnapshot: invoices.customerSnapshot,
      grandTotal: invoices.grandTotal,
      deletedAt: invoices.deletedAt,
    })
    .from(invoices)
    .where(eq(invoices.isDeleted, true))
    .orderBy(desc(invoices.deletedAt));
}
