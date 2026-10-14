import { pgTable, uuid, text, numeric, date, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Customers ────────────────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
  gstin: text("gstin"),
  phone: text("phone"),
  placeOfSupply: text("place_of_supply"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  hsnCode: text("hsn_code"),
  defaultUnit: text("default_unit").default("kg"),
  defaultRate: numeric("default_rate", { precision: 12, scale: 2 }),
  defaultGst: numeric("default_gst", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceNumber: text("invoice_number").unique().notNull(),
  date: date("date").notNull().default(sql`CURRENT_DATE`),
  customerId: uuid("customer_id").references(() => customers.id),
  // Snapshot of customer details at time of billing (immutable record)
  customerSnapshot: jsonb("customer_snapshot").notNull(),
  transport: text("transport"),         // vehicle number (optional)
  ewayBillNo: text("eway_bill_no"),     // reference only (optional)
  dalalName: text("dalal_name"),         // dalal name (optional)
  dalalContact: text("dalal_contact"),   // dalal contact (optional)
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  cgst: numeric("cgst", { precision: 14, scale: 2 }).default("0"),
  sgst: numeric("sgst", { precision: 14, scale: 2 }).default("0"),
  igst: numeric("igst", { precision: 14, scale: 2 }).default("0"),
  grandTotal: numeric("grand_total", { precision: 14, scale: 2 }).notNull(),
  amountInWords: text("amount_in_words"),
  notes: text("notes"),
  paymentStatus: text("payment_status").default("unpaid"), // unpaid / paid / partial
  // ── Soft-delete support ────────────────────────────────────────────────
  // If isDeleted=true the bill is hidden from the main UI but recoverable.
  // Hard-deleted bills (most-recent only) are permanently removed from DB.
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Invoice Items ────────────────────────────────────────────────────────────
export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  srNo: integer("sr_no").notNull(),
  productName: text("product_name").notNull(),
  hsnCode: text("hsn_code"),
  quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
  unit: text("unit").notNull().default("kg"),
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull(),
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }).default("0"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(), // qty × rate (pre-tax)
});

// ─── Settings (singleton row: id = 'default') ─────────────────────────────────
export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  companyName: text("company_name").default("Billing System"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  gstin: text("gstin"),
  msmeNo: text("msme_no"),
  bankName: text("bank_name"),
  bankAccount: text("bank_account"),
  ifscCode: text("ifsc_code"),
  termsAndConditions: text("terms_and_conditions"),
  invoicePrefix: text("invoice_prefix").default("RE"),
  invoiceCounter: integer("invoice_counter").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});
