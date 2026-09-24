"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { createInvoiceAction, updateFullInvoiceAction, searchCustomersAction } from "@/actions/invoices";
import { getProductsAction } from "@/actions/products";
import { ProductSelector, CatalogProduct } from "./ProductSelector";
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

function AutocompleteInput<T extends { id: string; name: string; hsnCode?: string | null; defaultGst?: string | null; defaultUnit?: string | null }>({
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
    const results = await onSearch(q);
    setSuggestions(results);
    setOpen(results.length > 0);
  }, 200);

  function handleChange(v: string) {
    onChange(v);
    search(v);
  }

  async function handleFocus() {
    const results = await onSearch(value);
    setSuggestions(results);
    if (results.length > 0) setOpen(true);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onFocus={handleFocus}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder={placeholder}
        className={className}
      />
      {open && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={() => {
                onSelect(s);
                setOpen(false);
              }}
              className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/80 transition-colors border-b last:border-b-0 border-gray-100 flex items-center justify-between cursor-pointer"
            >
              <span className="font-bold text-gray-900 text-sm">{s.name}</span>
              {(s.hsnCode || s.defaultGst) && (
                <span className="text-[11px] text-gray-500 font-medium">
                  {s.hsnCode ? `HSN: ${s.hsnCode}` : ""}
                  {s.hsnCode && s.defaultGst ? " · " : ""}
                  {s.defaultGst ? `GST: ${s.defaultGst}%` : ""}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const STANDARD_UNITS = [
  { id: "kg", labelEn: "kg (Kilogram)", labelGu: "kg (કિલો)" },
  { id: "ton", labelEn: "ton (Metric Ton)", labelGu: "ton (ટન)" },
  { id: "quintal", labelEn: "quintal (Quintal)", labelGu: "quintal (ક્વિન્ટલ)" },
  { id: "bag", labelEn: "bag (Bags/Bori)", labelGu: "bag (બોરી/કોથળો)" },
  { id: "gram", labelEn: "gram (Gram)", labelGu: "gram (ગ્રામ)" },
  { id: "pcs", labelEn: "pcs (Pieces)", labelGu: "pcs (નંગ)" },
  { id: "box", labelEn: "box (Box)", labelGu: "box (બોક્સ)" },
];

export function UnitSelector({
  value,
  onChange,
  lang = "en",
  className = "",
}: {
  value: string;
  onChange: (val: string) => void;
  lang?: "en" | "gu";
  className?: string;
}) {
  const isStandard = STANDARD_UNITS.some(
    (u) => u.id.toLowerCase() === (value || "").toLowerCase().trim()
  );
  const [customMode, setCustomMode] = useState(!isStandard && value !== "" && value !== "kg");

  if (customMode) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={lang === "gu" ? "એકમ..." : "Unit..."}
          className={`${className} min-w-[65px]`}
          autoFocus
        />
        <button
          type="button"
          onClick={() => {
            setCustomMode(false);
            onChange("kg");
          }}
          className="text-xs text-blue-600 hover:text-blue-800 p-0.5 font-bold cursor-pointer"
          title={lang === "gu" ? "લિસ્ટમાંથી પસંદ કરો" : "Select from list"}
        >
          ↩
        </button>
      </div>
    );
  }

  return (
    <select
      value={(value || "kg").toLowerCase()}
      onChange={(e) => {
        if (e.target.value === "__other__") {
          setCustomMode(true);
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      {STANDARD_UNITS.map((u) => (
        <option key={u.id} value={u.id}>
          {lang === "gu" ? u.labelGu : u.labelEn}
        </option>
      ))}
      <option value="__other__">
        {lang === "gu" ? "➕ અન્ય (Other - ટાઈપ કરવા)" : "➕ Other (Type manually)"}
      </option>
    </select>
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
  editBill: { en: "Edit Bill", gu: "બિલમાં ફેરફાર કરો" },
  createSubtitle: { en: "Create a new tax invoice", gu: "નવું ટેક્સ બિલ બનાવો" },
  editSubtitle: { en: "Modify invoice details and save changes", gu: "બિલની વિગતોમાં ફેરફાર કરો અને સેવ કરો" },
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
  updateAndView: { en: "Update & View", gu: "અપડેટ કરો અને જુઓ" },
  cancel: { en: "Cancel", gu: "રદ કરો" },
  saving: { en: "Saving…", gu: "સેવ થાય છે…" },
  typeCustomerName: { en: "Type customer name…", gu: "ગ્રાહકનું નામ લખો…" },
  fullAddress: { en: "Full address…", gu: "પૂરું સરનામું…" },
  productName: { en: "Product name…", gu: "વસ્તુનું નામ…" },
};

type Lang = "en" | "gu";

type InitialInvoice = {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId?: string | null;
  customerSnapshot: {
    name: string;
    address?: string;
    gstin?: string;
    phone?: string;
    placeOfSupply?: string;
  };
  transport?: string | null;
  ewayBillNo?: string | null;
  items: {
    srNo: number;
    productName: string;
    hsnCode?: string | null;
    quantity: string | number;
    unit: string;
    rate: string | number;
    gstPercent: string | number;
    amount: string | number;
  }[];
  notes?: string | null;
  gstMode?: "cgst_sgst" | "igst";
};

export default function InvoiceForm({
  defaultInvoiceNumber,
  initialInvoice,
  catalogProducts = [],
}: {
  defaultInvoiceNumber?: string;
  initialInvoice?: InitialInvoice;
  catalogProducts?: CatalogProduct[];
}) {
  const isEditing = !!initialInvoice;
  const [lang, setLang] = useState<Lang>("en");
  const t = (key: keyof typeof dict) => dict[key][lang];

  const [productsList, setProductsList] = useState<CatalogProduct[]>(catalogProducts || []);

  useEffect(() => {
    if (catalogProducts && catalogProducts.length > 0) {
      setProductsList(catalogProducts);
    } else {
      getProductsAction().then((prods) => {
        if (prods && prods.length > 0) setProductsList(prods);
      });
    }
  }, [catalogProducts]);

  const today = new Date().toISOString().split("T")[0];

  // Customer
  const [customerName, setCustomerName] = useState(initialInvoice?.customerSnapshot?.name || "");
  const [customerAddress, setCustomerAddress] = useState(initialInvoice?.customerSnapshot?.address || "");
  const [customerGstin, setCustomerGstin] = useState(initialInvoice?.customerSnapshot?.gstin || "");
  const [customerPhone, setCustomerPhone] = useState(initialInvoice?.customerSnapshot?.phone || "");
  const [customerPos, setCustomerPos] = useState(initialInvoice?.customerSnapshot?.placeOfSupply || "");
  const [customerId, setCustomerId] = useState<string | undefined>(initialInvoice?.customerId || undefined);

  // Invoice meta
  const [date, setDate] = useState(initialInvoice?.date || today);
  const [transport, setTransport] = useState(initialInvoice?.transport || "");
  const [ewayBillNo, setEwayBillNo] = useState(initialInvoice?.ewayBillNo || "");
  const [notes, setNotes] = useState(initialInvoice?.notes || "");

  // GST mode
  const [gstMode, setGstMode] = useState<"cgst_sgst" | "igst">(initialInvoice?.gstMode || "cgst_sgst");

  // Items
  const [items, setItems] = useState<LineItem[]>(() => {
    if (initialInvoice && initialInvoice.items.length > 0) {
      return initialInvoice.items.map((i, idx) => ({
        srNo: idx + 1,
        productName: i.productName,
        hsnCode: i.hsnCode || "",
        quantity: String(i.quantity),
        unit: i.unit || "kg",
        rate: String(i.rate),
        gstPercent: String(i.gstPercent),
        amount: Number(i.amount) || 0,
      }));
    }
    return [emptyItem(1)];
  });

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
    const invoicePayload = {
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
    };

    if (isEditing && initialInvoice?.id) {
      await updateFullInvoiceAction(initialInvoice.id, invoicePayload);
    } else {
      await createInvoiceAction(invoicePayload);
    }
  }

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? `${t("editBill")} (${initialInvoice.invoiceNumber})` : t("newBill")}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEditing ? t("editSubtitle") : t("createSubtitle")}
          </p>
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

            {/* ── GST Mode Selection with Clear Visual Hints ── */}
            <div className="col-span-1 md:col-span-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100 mt-1">
              <label className="block text-xs font-bold text-gray-800 mb-2 flex items-center justify-between">
                <span>{t("gstType")}</span>
                <span className="text-[11px] font-semibold text-blue-700">
                  {lang === "gu" ? "💡 ગ્રાહકના લોકેશન મુજબ સાચો પ્રકાર પસંદ કરો" : "💡 Choose based on customer's state"}
                </span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    gstMode === "cgst_sgst"
                      ? "bg-white border-blue-600 shadow-sm ring-2 ring-blue-100"
                      : "bg-white/60 border-gray-200 hover:bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="gstMode"
                    value="cgst_sgst"
                    checked={gstMode === "cgst_sgst"}
                    onChange={() => setGstMode("cgst_sgst")}
                    className="mt-1 w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      <span>📍</span>
                      {lang === "gu" ? "CGST + SGST (ગુજરાતમાં વેચાણ)" : "CGST + SGST (Within Gujarat)"}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-snug">
                      {lang === "gu"
                        ? "જ્યારે ગ્રાહક ગુજરાતનો હોય (સ્થાનિક વેચાણ - Intra-State)"
                        : "For sales to customers inside Gujarat (Local / Intra-State)"}
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    gstMode === "igst"
                      ? "bg-white border-blue-600 shadow-sm ring-2 ring-blue-100"
                      : "bg-white/60 border-gray-200 hover:bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="gstMode"
                    value="igst"
                    checked={gstMode === "igst"}
                    onChange={() => setGstMode("igst")}
                    className="mt-1 w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                      <span>🚚</span>
                      {lang === "gu" ? "IGST (ગુજરાત બહાર / Export)" : "IGST (Outside Gujarat / Export)"}
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-snug">
                      {lang === "gu"
                        ? "જ્યારે ગ્રાહક બીજા રાજ્યનો હોય અથવા એક્સપોર્ટ કરતા હોવ (Inter-State)"
                        : "For sales to customers in other states or international export"}
                    </p>
                  </div>
                </label>
              </div>
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
                  <th className="text-left py-2 px-1 text-xs font-medium text-gray-500 w-28">{t("unit")}</th>
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
                      <ProductSelector
                        value={item.productName}
                        products={productsList}
                        onSelectProduct={(p) =>
                          updateItem(idx, {
                            productName: p.name,
                            hsnCode: p.hsnCode,
                            unit: p.unit,
                            gstPercent: p.gstPercent,
                          })
                        }
                        onChangeCustomName={(v) => updateItem(idx, { productName: v })}
                        lang={lang}
                        placeholder={t("productName")}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
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
                      <UnitSelector
                        value={item.unit}
                        onChange={(val) => updateItem(idx, { unit: val })}
                        lang={lang}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
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
            {submitting ? t("saving") : (isEditing ? t("updateAndView") : t("saveAndView"))}
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
