"use client";

import { useState, useCallback, useRef } from "react";
import { createInvoiceAction, searchCustomersAction, searchProductsAction } from "@/actions/invoices";
import { Plus, Trash2 } from "lucide-react";

type LineItem = {
  srNo: number;
  productName: string;
  hsnCode: string;
  quantity: string;
  unit: string;
  rate: string;
  gstPercent: string;
  amount: number;
};

const emptyItem = (srNo: number): LineItem => ({
  srNo,
  productName: "",
  hsnCode: "",
  quantity: "",
  unit: "kg",
  rate: "",
  gstPercent: "0",
  amount: 0,
});

const GST_OPTIONS = ["0", "5", "12", "18", "28"];

function useDebounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

// ─── Autocomplete Input ───────────────────────────────────────────────────────

function AutocompleteInput<T extends { id: string; name: string }>({
  value,
  onChange,
  onSelect,
  onSearch,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: T) => void;
  onSearch: (q: string) => Promise<T[]>;
  placeholder?: string;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<T[]>([]);
  const [open, setOpen] = useState(false);

  const search = useDebounce(async (q: string) => {
    if (!q) { setSuggestions([]); setOpen(false); return; }
    const results = await onSearch(q);
    setSuggestions(results);
    setOpen(results.length > 0);
  }, 200);

  function handleChange(v: string) {
    onChange(v);
    search(v);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={className}
      />
      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => { onSelect(s); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-gray-800"
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

type CustomerResult = {
  id: string;
  name: string;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  placeOfSupply: string | null;
};

type ProductResult = {
  id: string;
  name: string;
  hsnCode: string | null;
  defaultUnit: string | null;
  defaultRate: string | null;
  defaultGst: string | null;
};

const dict = {
  newBill: { en: "New Bill", gu: "નવું બિલ" },
  createSubtitle: { en: "Create a new tax invoice", gu: "નવું ટેક્સ બિલ બનાવો" },
  customerBillTo: { en: "Customer (Bill To)", gu: "ગ્રાહક (બિલ મોકલવા માટે)" },
  customerName: { en: "Customer Name", gu: "ગ્રાહકનું નામ" },
  address: { en: "Address", gu: "સરનામું" },
  gstin: { en: "GSTIN", gu: "GSTIN" },
  mobileNo: { en: "Mobile No.", gu: "મોબાઇલ નં." },
  placeOfSupply: { en: "Place of Supply", gu: "Place of Supply" },
  invoiceDetails: { en: "Invoice Details", gu: "બિલની વિગતો" },
  date: { en: "Date", gu: "તારીખ" },
  transport: { en: "Transport / Vehicle No.", gu: "ટ્રાન્સપોર્ટ / વાહન નં." },
  ewayBillNo: { en: "e-Way Bill No. (optional)", gu: "ઈ-વે બિલ નં. (વૈકલ્પિક)" },
  gstType: { en: "GST Type", gu: "GST ના પ્રકાર" },
  items: { en: "Items", gu: "વસ્તુઓ" },
  product: { en: "Product", gu: "વસ્તુ" },
  hsn: { en: "HSN", gu: "HSN" },
  qty: { en: "Qty", gu: "માત્રા (Qty)" },
  unit: { en: "Unit", gu: "એકમ (Unit)" },
  rate: { en: "Rate (₹)", gu: "ભાવ (₹)" },
  gstPercent: { en: "GST %", gu: "GST %" },
  amount: { en: "Amount (₹)", gu: "રકમ (₹)" },
  addItem: { en: "Add item", gu: "વસ્તુ ઉમેરો" },
  subtotal: { en: "Subtotal", gu: "કુલ રકમ (Subtotal)" },
  grandTotal: { en: "Grand Total", gu: "કુલ (Grand Total)" },
  notes: { en: "Notes (optional)", gu: "નોંધ (વૈકલ્પિક)" },
  saveAndView: { en: "Save & View", gu: "સેવ કરો અને જુઓ" },
  cancel: { en: "Cancel", gu: "રદ કરો" },
  saving: { en: "Saving…", gu: "સેવ થાય છે…" },
  typeCustomerName: { en: "Type customer name…", gu: "ગ્રાહકનું નામ લખો…" },
  fullAddress: { en: "Full address…", gu: "પૂરું સરનામું…" },
  productName: { en: "Product name…", gu: "વસ્તુનું નામ…" },
};

type Lang = "en" | "gu";

export default function InvoiceForm({
  defaultInvoiceNumber,
}: {
  defaultInvoiceNumber?: string;
}) {
  const [lang, setLang] = useState<Lang>("en");
  const t = (key: keyof typeof dict) => dict[key][lang];

  const today = new Date().toISOString().split("T")[0];

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerPos, setCustomerPos] = useState(""); // place of supply
  const [customerId, setCustomerId] = useState<string | undefined>();

  // Invoice meta
  const [date, setDate] = useState(today);
  const [transport, setTransport] = useState("");
  const [ewayBillNo, setEwayBillNo] = useState("");
  const [notes, setNotes] = useState("");

  // GST mode
  const [gstMode, setGstMode] = useState<"cgst_sgst" | "igst">("cgst_sgst");

  // Items
  const [items, setItems] = useState<LineItem[]>([emptyItem(1)]);

  const [submitting, setSubmitting] = useState(false);

  // ─── Calculations ────────────────────────────────────────────────────────

  const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);

  // Compute tax per item, then sum
  const totalTax = items.reduce((s, item) => {
    const gst = parseFloat(item.gstPercent || "0");
    return s + item.amount * (gst / 100);
  }, 0);

  const cgst = gstMode === "cgst_sgst" ? totalTax / 2 : 0;
  const sgst = gstMode === "cgst_sgst" ? totalTax / 2 : 0;
  const igst = gstMode === "igst" ? totalTax : 0;
  const grandTotal = subtotal + totalTax;

  // ─── Item helpers ────────────────────────────────────────────────────────

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, ...patch };
        const qty = parseFloat(updated.quantity) || 0;
        const rate = parseFloat(updated.rate) || 0;
        updated.amount = Math.round(qty * rate * 100) / 100;
        return updated;
      })
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem(prev.length + 1)]);
  }

  function removeItem(index: number) {
    setItems((prev) =>
      prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, srNo: i + 1 }))
    );
  }

  // ─── Submit ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) { alert("Customer name is required."); return; }
    if (items.every((i) => !i.productName.trim())) { alert("Add at least one item."); return; }

    setSubmitting(true);
    await createInvoiceAction({
      date,
      customerId,
      customerSnapshot: {
        name: customerName,
        address: customerAddress || undefined,
        gstin: customerGstin || undefined,
        phone: customerPhone || undefined,
        placeOfSupply: customerPos || undefined,
      },
      transport: transport || undefined,
      ewayBillNo: ewayBillNo || undefined,
      items: items
        .filter((i) => i.productName.trim())
        .map((i) => ({
          srNo: i.srNo,
          productName: i.productName,
          hsnCode: i.hsnCode || undefined,
          quantity: parseFloat(i.quantity) || 0,
          unit: i.unit,
          rate: parseFloat(i.rate) || 0,
          gstPercent: parseFloat(i.gstPercent) || 0,
          amount: i.amount,
        })),
      subtotal,
      cgst,
      sgst,
      igst,
      grandTotal,
      notes: notes || undefined,
    });
  }

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("newBill")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("createSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
          <label htmlFor="lang-select" className="text-sm font-medium text-gray-600">Language:</label>
          <select
            id="lang-select"
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="text-sm border-none bg-transparent focus:ring-0 text-gray-900 font-medium cursor-pointer"
          >
            <option value="en">English</option>
            <option value="gu">ગુજરાતી</option>
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Customer ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">{t("customerBillTo")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("customerName")} <span className="text-red-500">*</span>
              </label>
              <AutocompleteInput<CustomerResult>
                value={customerName}
                onChange={(v) => { setCustomerName(v); setCustomerId(undefined); }}
                onSelect={(c) => {
                  setCustomerName(c.name);
                  setCustomerAddress(c.address ?? "");
                  setCustomerGstin(c.gstin ?? "");
                  setCustomerPhone(c.phone ?? "");
                  setCustomerPos(c.placeOfSupply ?? "");
                  setCustomerId(c.id);
                }}
                onSearch={searchCustomersAction}
                placeholder={t("typeCustomerName")}
                className={inputCls}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("address")}</label>
              <textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                rows={2}
                className={inputCls + " resize-none"}
                placeholder={t("fullAddress")}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("gstin")}</label>
              <input
                type="text"
                value={customerGstin}
                onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                className={inputCls}
                placeholder="24ATKPR5908H1ZE"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("mobileNo")}</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={inputCls}
                placeholder="9714304141"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("placeOfSupply")}</label>
              <input
                type="text"
                value={customerPos}
                onChange={(e) => setCustomerPos(e.target.value)}
                className={inputCls}
                placeholder="e.g. 24-Gujarat"
              />
            </div>
          </div>
        </div>

        {/* ── Invoice Meta ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">{t("invoiceDetails")}</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("date")}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("transport")}
              </label>
              <input
                type="text"
                value={transport}
                onChange={(e) => setTransport(e.target.value)}
                className={inputCls}
                placeholder="GJ36T2093"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t("ewayBillNo")}
              </label>
              <input
                type="text"
                value={ewayBillNo}
                onChange={(e) => setEwayBillNo(e.target.value)}
                className={inputCls}
                placeholder="652172775440"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t("gstType")}</label>
              <select
                value={gstMode}
                onChange={(e) => setGstMode(e.target.value as "cgst_sgst" | "igst")}
                className={inputCls}
              >
                <option value="cgst_sgst">CGST + SGST (Intra-state)</option>
                <option value="igst">IGST (Inter-state / Export)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Line Items ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">{t("items")}</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-1 text-xs font-medium text-gray-500 w-8">#</th>
                  <th className="text-left py-2 px-1 text-xs font-medium text-gray-500">{t("product")}</th>
                  <th className="text-left py-2 px-1 text-xs font-medium text-gray-500 w-28">{t("hsn")}</th>
                  <th className="text-left py-2 px-1 text-xs font-medium text-gray-500 w-20">{t("qty")}</th>
                  <th className="text-left py-2 px-1 text-xs font-medium text-gray-500 w-16">{t("unit")}</th>
                  <th className="text-left py-2 px-1 text-xs font-medium text-gray-500 w-24">{t("rate")}</th>
                  <th className="text-left py-2 px-1 text-xs font-medium text-gray-500 w-20">{t("gstPercent")}</th>
                  <th className="text-right py-2 px-1 text-xs font-medium text-gray-500 w-24">{t("amount")}</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-1 text-gray-400 text-xs">{item.srNo}</td>
                    <td className="py-2 px-1">
                      <AutocompleteInput<ProductResult>
                        value={item.productName}
                        onChange={(v) => updateItem(idx, { productName: v })}
                        onSelect={(p) =>
                          updateItem(idx, {
                            productName: p.name,
                            hsnCode: p.hsnCode ?? "",
                            unit: p.defaultUnit ?? "kg",
                            rate: p.defaultRate ?? "",
                            gstPercent: p.defaultGst ?? "0",
                          })
                        }
                        onSearch={searchProductsAction}
                        placeholder={t("productName")}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        value={item.hsnCode}
                        onChange={(e) => updateItem(idx, { hsnCode: e.target.value })}
                        placeholder="HSN"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                        placeholder="0"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(idx, { unit: e.target.value })}
                        placeholder="kg"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(idx, { rate: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </td>
                    <td className="py-2 px-1">
                      <select
                        value={item.gstPercent}
                        onChange={(e) => updateItem(idx, { gstPercent: e.target.value })}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      >
                        {GST_OPTIONS.map((g) => (
                          <option key={g} value={g}>{g}%</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-1 text-right font-medium text-gray-800">
                      {item.amount > 0
                        ? new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(item.amount)
                        : "—"}
                    </td>
                    <td className="py-2 px-1">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            {t("addItem")}
          </button>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t("subtotal")}</span>
                <span>₹{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(subtotal)}</span>
              </div>
              {gstMode === "cgst_sgst" ? (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST</span>
                    <span>₹{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(cgst)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST</span>
                    <span>₹{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-gray-600">
                  <span>IGST</span>
                  <span>₹{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(igst)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
                <span>{t("grandTotal")}</span>
                <span>₹{new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Notes ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <label className="block text-xs font-medium text-gray-600 mb-1">{t("notes")}</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={inputCls + " resize-none"}
            placeholder=""
          />
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-4 pb-12 mt-6">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-6 py-4 bg-blue-600 text-white text-lg font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-all shadow-md hover:-translate-y-0.5"
          >
            {submitting ? t("saving") : t("saveAndView")}
          </button>
          <a
            href="/bills"
            className="px-6 py-4 border-2 border-gray-300 text-gray-700 text-lg font-bold rounded-xl hover:bg-gray-100 transition-all text-center sm:w-40"
          >
            {t("cancel")}
          </a>
        </div>
      </form>
    </div>
  );
}
