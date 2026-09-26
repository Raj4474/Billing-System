"use client";

import { formatINR, numberToWords } from "@/lib/utils";
import { Eye, EyeOff, Pencil, X, Plus, Trash2, Check, ZoomIn } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import {
  updateInvoiceCustomerAction,
  updateInvoiceMetaAction,
  updateInvoiceItemsAction,
  saveSettingsAction,
} from "@/actions/invoices";
import { getProductsAction } from "@/actions/products";
import { UnitSelector } from "@/components/InvoiceForm";
import { ProductSelector, CatalogProduct } from "@/components/ProductSelector";

const STORAGE_KEY_HIDDEN = "rupala_invoice_hidden_fields";
const STORAGE_KEY_LANG = "rupala_invoice_modal_lang";

function ActionCluster({
  isHidden,
  onToggle,
  onEdit,
  editTitle = "Edit field",
}: {
  isHidden?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  editTitle?: string;
}) {
  return (
    <div className="absolute -top-3 -right-2 flex items-center gap-0.5 bg-white border border-gray-300 shadow-md rounded-full px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity print:hidden z-20">
      {onToggle && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          title={isHidden ? "Show in print" : "Hide in print"}
        >
          {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
          title={editTitle}
        >
          <Pencil size={11} />
        </button>
      )}
    </div>
  );
}

function ToggleWrapper({
  isHidden = false,
  onToggle,
  onEdit,
  editTitle,
  children,
  className = "",
  as: Component = "div",
}: {
  isHidden?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  editTitle?: string;
  children: React.ReactNode;
  className?: string;
  as?: any;
}) {
  return (
    <Component
      className={`group relative ${isHidden ? "opacity-30 print:hidden" : ""} ${className}`}
    >
      {(onToggle || onEdit) && (
        <ActionCluster
          isHidden={isHidden}
          onToggle={onToggle}
          onEdit={onEdit}
          editTitle={editTitle}
        />
      )}
      {children}
    </Component>
  );
}

type CustomerSnapshot = {
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
  placeOfSupply?: string;
};

type InvoiceItem = {
  srNo: number;
  productName: string;
  hsnCode?: string | null;
  quantity: string;
  unit: string;
  rate: string;
  gstPercent: string;
  amount: string;
};

type CompanySettings = {
  companyName?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  msmeNo?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  ifscCode?: string | null;
  termsAndConditions?: string | null;
};

type Props = {
  invoiceId?: string;
  invoiceNumber: string;
  date: string;
  transport?: string | null;
  ewayBillNo?: string | null;
  dalalName?: string | null;
  dalalContact?: string | null;
  customerSnapshot: CustomerSnapshot;
  items: InvoiceItem[];
  subtotal: string;
  cgst: string;
  sgst: string;
  igst: string;
  grandTotal: string;
  amountInWords?: string | null;
  notes?: string | null;
  settings: CompanySettings;
  catalogProducts?: CatalogProduct[];
};

type ModalType =
  | null
  | { type: "customer" }
  | { type: "date" }
  | { type: "transport" }
  | { type: "ewayBill" }
  | { type: "dalal" }
  | { type: "notes" }
  | { type: "items" }
  | { type: "bankDetails" }
  | { type: "termsAndConditions" }
  | { type: "companyInfo" };

export default function InvoiceView({
  invoiceId,
  invoiceNumber,
  date: initialDate,
  transport: initialTransport,
  ewayBillNo: initialEwayBillNo,
  dalalName: initialDalalName,
  dalalContact: initialDalalContact,
  customerSnapshot: initialCustomerSnapshot,
  items: initialItems,
  subtotal: initialSubtotal,
  cgst: initialCgst,
  sgst: initialSgst,
  igst: initialIgst,
  grandTotal: initialGrandTotal,
  amountInWords: initialAmountInWords,
  notes: initialNotes,
  settings: initialSettings,
  catalogProducts = [],
}: Props) {
  // ─── Local State for Live In-Place Updates ──────────────────────────────────
  const [customer, setCustomer] = useState<CustomerSnapshot>(initialCustomerSnapshot);
  const [date, setDate] = useState<string>(initialDate);
  const [transport, setTransport] = useState<string>(initialTransport || "");
  const [ewayBillNo, setEwayBillNo] = useState<string>(initialEwayBillNo || "");
  const [dalalName, setDalalName] = useState<string>(initialDalalName || "");
  const [dalalContact, setDalalContact] = useState<string>(initialDalalContact || "");
  const [notes, setNotes] = useState<string>(initialNotes || "");
  const [items, setItems] = useState<InvoiceItem[]>(initialItems);
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
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

  const [subtotal, setSubtotal] = useState<string>(initialSubtotal);
  const [cgst, setCgst] = useState<string>(initialCgst);
  const [sgst, setSgst] = useState<string>(initialSgst);
  const [igst, setIgst] = useState<string>(initialIgst);
  const [grandTotal, setGrandTotal] = useState<string>(initialGrandTotal);
  const [amountInWords, setAmountInWords] = useState<string | null>(initialAmountInWords || null);

  // Persistent hidden fields state (across all bills)
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HIDDEN);
      if (saved) {
        setHidden(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load saved hidden fields", e);
    }
  }, []);

  const toggle = (key: string) => {
    setHidden((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save hidden fields", e);
      }
      return next;
    });
  };

  // Zoom state (default 1.18 = 18% zoomed for father's view)
  const [zoomLevel, setZoomLevel] = useState<number>(1.18);

  // Edit Modal State & Language
  const [modal, setModal] = useState<ModalType>(null);
  const [modalLang, setModalLang] = useState<"en" | "gu">("gu");
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(STORAGE_KEY_LANG) as "en" | "gu" | null;
      if (savedLang === "en" || savedLang === "gu") {
        setModalLang(savedLang);
      }
    } catch {}
  }, []);

  const handleModalLangChange = (l: "en" | "gu") => {
    setModalLang(l);
    try {
      localStorage.setItem(STORAGE_KEY_LANG, l);
    } catch {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Calculations
  const subtotalNum = parseFloat(subtotal || "0");
  const cgstVal = parseFloat(cgst || "0");
  const sgstVal = parseFloat(sgst || "0");
  const igstVal = parseFloat(igst || "0");
  const grandTotalNum = parseFloat(grandTotal || "0");
  const useIgst = igstVal > 0;

  const totalGst = useIgst ? igstVal : cgstVal + sgstVal;

  const taxRate = subtotalNum > 0 ? (totalGst / subtotalNum) * 100 : 0;
  const halfTaxRate = (taxRate / 2).toFixed(2);
  const fullTaxRate = taxRate.toFixed(2);

  // Formatted date (DD/MM/YYYY)
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const formattedDate = isNaN(d.getTime()) ? date : `${day}/${month}/${year}`;

  const billAmountInWords = amountInWords || numberToWords(grandTotalNum);
  const gstInWords = totalGst > 0 ? numberToWords(totalGst) : "Zero Only";

  const emptyRowsCount = Math.max(0, 8 - items.length);

  const hHsn = hidden["colHsn"] ? "opacity-30 print:hidden" : "";
  const hUnit = hidden["colUnit"] ? "opacity-30 print:hidden" : "";
  const hRate = hidden["colRate"] ? "opacity-30 print:hidden" : "";
  const hGst = hidden["colGst"] ? "opacity-30 print:hidden" : "";

  return (
    <div className="w-full">
      {/* ── Top Zoom & Hint Bar (Screen Only) ─────────────────────────────────── */}
      <div className="mb-6 max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-700 text-sm flex items-center gap-1.5">
            <ZoomIn className="w-4 h-4 text-blue-600" />
            Preview Size:
          </span>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.8, Math.round((z - 0.05) * 100) / 100))}
              className="px-2.5 py-1 font-bold hover:bg-white rounded-lg text-gray-700 transition-colors cursor-pointer text-sm"
              title="Zoom Out"
            >
              -
            </button>
            <span className="px-2 font-mono font-bold text-gray-900 text-sm min-w-[50px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.5, Math.round((z + 0.05) * 100) / 100))}
              className="px-2.5 py-1 font-bold hover:bg-white rounded-lg text-gray-700 transition-colors cursor-pointer text-sm"
              title="Zoom In"
            >
              +
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoomLevel(1.0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                zoomLevel === 1.0 ? "bg-blue-600 text-white shadow-2xs" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1.18)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                zoomLevel === 1.18 ? "bg-blue-600 text-white shadow-2xs" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              118% (Default Large)
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1.3)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                zoomLevel === 1.3 ? "bg-blue-600 text-white shadow-2xs" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              130%
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {toastMessage && (
            <span className="flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1 rounded-lg font-bold text-xs animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              {toastMessage}
            </span>
          )}
          <span className="text-gray-500 font-medium text-xs flex items-center gap-1.5">
            <span>Hover field:</span>
            <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-700">
              <Eye className="w-3 h-3 text-gray-600" /> Hide
            </span>
            <span>|</span>
            <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded font-bold text-blue-700">
              <Pencil className="w-3 h-3 text-blue-600" /> Edit
            </span>
          </span>
        </div>
      </div>

      {/* ── Bill Preview Container ───────────────────────────────────────────── */}
      <div className="w-full overflow-x-auto pb-12 print:p-0 print:overflow-visible flex justify-center">
        <div
          id="invoice-print"
          style={{ zoom: zoomLevel }}
          className="bg-white text-black font-sans w-full max-w-[210mm] mx-auto border-[1.5px] border-black text-[11px] leading-tight select-text print:m-0 print:border-[1.5px] print:border-black print:![zoom:1] shadow-md print:shadow-none"
        >
          {/* ── 1. Header Section ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-[1fr_230px] border-b border-black">
            {/* Left: Company Name Box & Centered Address */}
            <div className="p-2 border-r border-black flex flex-col justify-between">
              <ToggleWrapper
                onEdit={() => setModal({ type: "companyInfo" })}
                editTitle="Edit Company Information"
                className="border border-black bg-[#e9ecef] py-1 px-4 text-center font-serif font-bold text-xl md:text-2xl tracking-wider uppercase text-black"
              >
                {settings.companyName || "RUPALA ENTERPRISE"}
              </ToggleWrapper>

              <div className="text-center text-[10px] uppercase font-bold text-black mt-2 leading-tight px-1">
                <ToggleWrapper
                  isHidden={hidden["companyAddress"]}
                  onToggle={() => toggle("companyAddress")}
                  onEdit={() => setModal({ type: "companyInfo" })}
                  editTitle="Edit Address"
                >
                  {settings.address ? (
                    <div className="whitespace-pre-line leading-relaxed">{settings.address}</div>
                  ) : (
                    <>
                      <div>GROUND FLOOR, OFFICE 12X25, RUPALA ENTERPRISE, GIR GADHADA ROAD</div>
                      <div className="mt-0.5">LAND SURVEY NO. 144/P2, VADVIYALA, GIR SOMNATH, GUJARAT, 362530</div>
                    </>
                  )}
                </ToggleWrapper>
                <ToggleWrapper
                  isHidden={hidden["companyContact"]}
                  onToggle={() => toggle("companyContact")}
                  onEdit={() => setModal({ type: "companyInfo" })}
                  editTitle="Edit Contact Details"
                  className="mt-1 text-[9.5px] font-semibold flex flex-wrap justify-center gap-x-4 normal-case"
                >
                  {settings.email && <span>E-MAIL: {settings.email}</span>}
                  {settings.phone && <span>Phone: {settings.phone}</span>}
                </ToggleWrapper>
              </div>
            </div>

            {/* Right: Wordmark Logo Box */}
            <div className="p-3 flex flex-col items-center justify-center relative bg-white select-none border-l border-black">
              <div className="text-center w-full">
                <div className="font-black text-[28px] tracking-tight text-black leading-none uppercase font-sans">
                  RUPALA
                </div>
                <div className="font-bold text-[11px] tracking-[0.25em] text-black leading-tight mt-1 uppercase font-sans">
                  ENTERPRISE
                </div>
                <div className="w-16 h-[2px] bg-black mx-auto mt-2"></div>
              </div>
            </div>
          </div>

          {/* ── 2. TAX INVOICE Strip ───────────────────────────────────────────── */}
          <div className="border-b border-t border-black py-0.5 px-3 flex items-center justify-between text-[11px] font-bold bg-white text-black">
            <span className="italic font-normal">Debit Memo</span>
            <span className="text-xs font-black tracking-widest uppercase">TAX INVOICE</span>
            <span className="font-semibold">Original</span>
          </div>

          {/* ── 3. Customer (Bill To) & Invoice Meta ────────────────────────────── */}
          <div className="grid grid-cols-[55.58%_44.48%] border-b border-black">
            {/* Left: Customer Info */}
            <div className="p-2 border-r border-black text-[10.5px] leading-relaxed">
              <ToggleWrapper
                onEdit={() => setModal({ type: "customer" })}
                editTitle="Edit Customer Name"
                className="font-bold"
              >
                M/s. : <span className="font-bold text-[11px]">{customer.name}</span>
              </ToggleWrapper>

              {customer.address && (
                <ToggleWrapper
                  isHidden={hidden["customerAddress"]}
                  onToggle={() => toggle("customerAddress")}
                  onEdit={() => setModal({ type: "customer" })}
                  editTitle="Edit Customer Address"
                  className="pl-8 whitespace-pre-line text-[10px] leading-snug mt-0.5 text-black"
                >
                  {customer.address}
                </ToggleWrapper>
              )}

              <div className="mt-2 space-y-0.5 text-[10px]">
                <ToggleWrapper
                  isHidden={hidden["customerPhone"]}
                  onToggle={() => toggle("customerPhone")}
                  onEdit={() => setModal({ type: "customer" })}
                  editTitle="Edit Customer Mobile"
                >
                  <span className="font-bold">Mo No. : </span>
                  <span>{customer.phone || "—"}</span>
                </ToggleWrapper>
                <ToggleWrapper
                  isHidden={hidden["customerPos"]}
                  onToggle={() => toggle("customerPos")}
                  onEdit={() => setModal({ type: "customer" })}
                  editTitle="Edit Place of Supply"
                >
                  <span className="font-bold">Place of Supply : </span>
                  <span>{customer.placeOfSupply || "24-Gujarat"}</span>
                </ToggleWrapper>
                <ToggleWrapper
                  isHidden={hidden["customerGstin"]}
                  onToggle={() => toggle("customerGstin")}
                  onEdit={() => setModal({ type: "customer" })}
                  editTitle="Edit Customer GSTIN"
                >
                  <span className="font-bold">GSTIN No. : </span>
                  <span className="font-bold">{customer.gstin || "—"}</span>
                </ToggleWrapper>
              </div>
            </div>

            {/* Right: Invoice Meta */}
            <div className="flex flex-col text-[10.5px]">
              <div className="p-2 space-y-1 bg-[#e9ecef]">
                <div className="grid grid-cols-[85px_1fr]">
                  <span className="font-bold">Invoice No.</span>
                  <span className="font-bold">: {invoiceNumber}</span>
                </div>
                <ToggleWrapper
                  onEdit={() => setModal({ type: "date" })}
                  editTitle="Edit Invoice Date"
                  className="grid grid-cols-[85px_1fr]"
                >
                  <span className="font-bold">Date</span>
                  <span>: {formattedDate}</span>
                </ToggleWrapper>
              </div>
              <div className="border-t border-black p-2 flex-1 space-y-1">
                <ToggleWrapper
                  isHidden={hidden["transport"]}
                  onToggle={() => toggle("transport")}
                  onEdit={() => setModal({ type: "transport" })}
                  editTitle="Edit Transport / Vehicle"
                  className="grid grid-cols-[85px_1fr]"
                >
                  <span className="font-bold">Transport</span>
                  <span>: {transport || "—"}</span>
                </ToggleWrapper>
                <ToggleWrapper
                  isHidden={hidden["ewayBill"]}
                  onToggle={() => toggle("ewayBill")}
                  onEdit={() => setModal({ type: "ewayBill" })}
                  editTitle="Edit e-Way Bill No."
                  className="grid grid-cols-[85px_1fr]"
                >
                  <span className="font-bold">e-Way Bill No.</span>
                  <span>: {ewayBillNo || "—"}</span>
                </ToggleWrapper>
                <ToggleWrapper
                  isHidden={hidden["dalalName"]}
                  onToggle={() => toggle("dalalName")}
                  onEdit={() => setModal({ type: "dalal" })}
                  editTitle="Edit Dalal Details"
                  className="grid grid-cols-[85px_1fr]"
                >
                  <span className="font-bold">Dalal</span>
                  <span>: {dalalName || "—"}</span>
                </ToggleWrapper>
                <ToggleWrapper
                  isHidden={hidden["dalalContact"]}
                  onToggle={() => toggle("dalalContact")}
                  onEdit={() => setModal({ type: "dalal" })}
                  editTitle="Edit Dalal Contact"
                  className="grid grid-cols-[85px_1fr]"
                >
                  <span className="font-bold">Dalal Contact</span>
                  <span>: {dalalContact || "—"}</span>
                </ToggleWrapper>
              </div>
            </div>
          </div>

          {/* ── 4. Line Items Table ────────────────────────────────────────────── */}
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="border-b border-black text-[10px] font-bold text-black bg-white">
                <th className="w-10 py-1.5 text-center border-r border-black font-bold">SrNo</th>
                <ToggleWrapper
                  as="th"
                  onEdit={() => setModal({ type: "items" })}
                  editTitle="Edit Line Items"
                  className="py-1.5 px-2 text-left border-r border-black font-bold"
                >
                  Product Name
                </ToggleWrapper>
                <ToggleWrapper
                  as="th"
                  isHidden={hidden["colHsn"]}
                  onToggle={() => toggle("colHsn")}
                  className="w-16 py-1.5 text-center border-r border-black font-bold"
                >
                  HSN/SAC
                </ToggleWrapper>
                <th className="w-16 py-1.5 text-right pr-2 border-r border-black font-bold">Qty</th>
                <ToggleWrapper
                  as="th"
                  isHidden={hidden["colUnit"]}
                  onToggle={() => toggle("colUnit")}
                  className="w-14 py-1.5 text-center border-r border-black font-bold"
                >
                  Unit
                </ToggleWrapper>
                <ToggleWrapper
                  as="th"
                  isHidden={hidden["colRate"]}
                  onToggle={() => toggle("colRate")}
                  className="w-20 py-1.5 text-right pr-2 border-r border-black font-bold"
                >
                  Rate
                </ToggleWrapper>
                <ToggleWrapper
                  as="th"
                  isHidden={hidden["colGst"]}
                  onToggle={() => toggle("colGst")}
                  className="w-14 py-1.5 text-right pr-2 border-r border-black font-bold"
                >
                  GST %
                </ToggleWrapper>
                <ToggleWrapper
                  as="th"
                  onEdit={() => setModal({ type: "items" })}
                  editTitle="Edit Items & Rates"
                  className="w-24 py-1.5 text-right pr-2 font-bold"
                >
                  Amount
                </ToggleWrapper>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-transparent group/row">
                  <td className="py-1 text-center border-r border-black">{item.srNo}</td>
                  <td className="py-1 px-2 text-left border-r border-black font-medium relative">
                    {item.productName}
                    <button
                      type="button"
                      onClick={() => setModal({ type: "items" })}
                      className="absolute right-1 top-1/2 -translate-y-1/2 text-blue-600 opacity-0 group-hover/row:opacity-100 p-0.5 hover:bg-blue-50 rounded transition-opacity print:hidden cursor-pointer"
                      title="Edit Items"
                    >
                      <Pencil size={10} />
                    </button>
                  </td>
                  <td className={`py-1 text-center border-r border-black ${hHsn}`}>{item.hsnCode || "—"}</td>
                  <td className="py-1 pr-2 text-right border-r border-black">
                    {parseFloat(item.quantity).toFixed(3)}
                  </td>
                  <td className={`py-1 text-center border-r border-black text-[9.5px] text-gray-700 font-semibold ${hUnit}`}>
                    {item.unit}
                  </td>
                  <td className={`py-1 pr-2 text-right border-r border-black ${hRate}`}>
                    {parseFloat(item.rate).toFixed(2)}
                  </td>
                  <td className={`py-1 pr-2 text-right border-r border-black ${hGst}`}>
                    {parseFloat(item.gstPercent).toFixed(2)}
                  </td>
                  <td className="py-1 pr-2 text-right font-medium">
                    {parseFloat(item.amount).toFixed(2)}
                  </td>
                </tr>
              ))}

              {/* Empty filler rows to preserve vertical column lines all the way down */}
              {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-6">
                  <td className="border-r border-black text-center">&nbsp;</td>
                  <td className="border-r border-black">&nbsp;</td>
                  <td className={`border-r border-black text-center ${hHsn}`}>&nbsp;</td>
                  <td className="border-r border-black text-right pr-2">&nbsp;</td>
                  <td className={`border-r border-black text-center ${hUnit}`}>&nbsp;</td>
                  <td className={`border-r border-black text-right pr-2 ${hRate}`}>&nbsp;</td>
                  <td className={`border-r border-black text-right pr-2 ${hGst}`}>&nbsp;</td>
                  <td className="text-right pr-2">&nbsp;</td>
                </tr>
              ))}

              {/* Bottom expanding spacer row */}
              <tr className="h-44">
                <td className="border-r border-black text-center">&nbsp;</td>
                <td className="border-r border-black">&nbsp;</td>
                <td className={`border-r border-black text-center ${hHsn}`}>&nbsp;</td>
                <td className="border-r border-black text-right pr-2">&nbsp;</td>
                <td className={`border-r border-black text-center ${hUnit}`}>&nbsp;</td>
                <td className={`border-r border-black text-right pr-2 ${hRate}`}>&nbsp;</td>
                <td className={`border-r border-black text-right pr-2 ${hGst}`}>&nbsp;</td>
                <td className="text-right pr-2">&nbsp;</td>
              </tr>
            </tbody>
          </table>

          {/* ── 5. Upper Footer: GSTIN & MSME / Sub Total ──────────────────────── */}
          <div className="grid grid-cols-[60%_40%] border-t border-black text-[10.5px] font-bold">
            <div className="border-r border-black px-2.5 py-1 flex items-center justify-between">
              <ToggleWrapper
                isHidden={hidden["footerGstin"]}
                onToggle={() => toggle("footerGstin")}
                onEdit={() => setModal({ type: "companyInfo" })}
                editTitle="Edit GSTIN / MSME"
              >
                <span>GSTIN No.: {settings.gstin || "—"}</span>
              </ToggleWrapper>
              <ToggleWrapper
                isHidden={hidden["footerMsme"]}
                onToggle={() => toggle("footerMsme")}
                onEdit={() => setModal({ type: "companyInfo" })}
                editTitle="Edit GSTIN / MSME"
              >
                <span>MSME No.: {settings.msmeNo || "—"}</span>
              </ToggleWrapper>
            </div>
            <div className="px-2.5 py-1 flex items-center justify-between">
              <span>Sub Total</span>
              <span>{formatINR(subtotalNum)}</span>
            </div>
          </div>

          {/* ── 6. Middle Footer: Bank Details, Words, Tax Breakdown ──────────── */}
          <div className="grid grid-cols-[60%_40%] border-t border-black">
            {/* Left Column: Bank Details, Words, Note */}
            <div className="border-r border-black flex flex-col justify-between text-[10px]">
              {/* Bank details */}
              <ToggleWrapper
                isHidden={hidden["bankDetails"]}
                onToggle={() => toggle("bankDetails")}
                onEdit={() => setModal({ type: "bankDetails" })}
                editTitle="Edit Bank Details"
                className="p-2 space-y-0.5 leading-snug"
              >
                <div className="grid grid-cols-[95px_1fr]">
                  <span className="font-bold">Bank Name</span>
                  <span>: {settings.bankName || "—"}</span>
                </div>
                <div className="grid grid-cols-[95px_1fr]">
                  <span className="font-bold">Bank A/c. No.</span>
                  <span>: {settings.bankAccount || "—"}</span>
                </div>
                <div className="grid grid-cols-[95px_1fr]">
                  <span className="font-bold">RTGS/IFSC Code</span>
                  <span>: {settings.ifscCode || "—"}</span>
                </div>
              </ToggleWrapper>

              {/* Words */}
              <div className="border-t border-black p-2 space-y-1">
                <div>
                  <span className="font-bold">Total GST : </span>
                  <span className="italic font-medium">{gstInWords}</span>
                </div>
                <div>
                  <span className="font-bold">Bill Amount : </span>
                  <span className="italic font-medium">{billAmountInWords}</span>
                </div>
              </div>

              {/* Note */}
              <ToggleWrapper
                isHidden={hidden["notes"]}
                onToggle={() => toggle("notes")}
                onEdit={() => setModal({ type: "notes" })}
                editTitle="Edit Notes"
                className="border-t border-black p-2 min-h-[26px]"
              >
                <span className="font-bold">Note : </span>
                <span>{notes || ""}</span>
              </ToggleWrapper>
            </div>

            {/* Right Column: Tax Breakdown & Grand Total */}
            <div className="flex flex-col justify-between text-[10.5px]">
              <div className="p-2 space-y-1.5 leading-snug">
                <div className="flex justify-between font-bold">
                  <span>Taxable Amount</span>
                  <span>{formatINR(subtotalNum)}</span>
                </div>

                {useIgst ? (
                  <div className="flex justify-between">
                    <span>IGST</span>
                    <span className="flex gap-4">
                      <span className="w-14 text-right">{fullTaxRate}%</span>
                      <span className="w-24 text-right">{formatINR(igstVal)}</span>
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>CGST</span>
                      <span className="flex gap-4">
                        <span className="w-14 text-right">{halfTaxRate}%</span>
                        <span className="w-24 text-right">{formatINR(cgstVal)}</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST</span>
                      <span className="flex gap-4">
                        <span className="w-14 text-right">{halfTaxRate}%</span>
                        <span className="w-24 text-right">{formatINR(sgstVal)}</span>
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Grand Total */}
              <div className="border-t border-black p-2 flex justify-between items-center font-bold text-sm bg-[#e9ecef] text-black">
                <span>Grand Total</span>
                <span className="text-base font-black">{formatINR(grandTotalNum)}</span>
              </div>
            </div>
          </div>

          {/* ── 7. Bottom Footer: Terms & Conditions and Signature ─────────────── */}
          <div className="grid grid-cols-[60%_40%] border-t border-black">
            {/* Left: Terms & Conditions */}
            <ToggleWrapper
              isHidden={hidden["termsAndConditions"]}
              onToggle={() => toggle("termsAndConditions")}
              onEdit={() => setModal({ type: "termsAndConditions" })}
              editTitle="Edit Terms & Conditions"
              className="border-r border-black p-2 text-[9px] leading-tight text-black"
            >
              <div className="font-bold underline mb-1">Terms & Condition :</div>
              {settings.termsAndConditions ? (
                <div className="whitespace-pre-line italic leading-relaxed">
                  {settings.termsAndConditions}
                </div>
              ) : (
                <ol className="list-none space-y-0.5 italic">
                  <li>1. Goods once sold will not be taken back.</li>
                  <li>2. Interest @18% p.a. will be charged if payment is not made within due date.</li>
                  <li>3. Our risk and responsibility ceases as soon as the goods leave our premises.</li>
                  <li>4. &ldquo;Subject to &apos;GIR SOMNATH&apos; Jurisdiction only. E.&amp;O.E&rdquo;</li>
                </ol>
              )}
            </ToggleWrapper>

            {/* Right: Authorised Signatory */}
            <div className="p-2 flex flex-col justify-between text-right text-[10px] min-h-[95px]">
              <div className="font-bold">For, {settings.companyName || "RUPALA ENTERPRISE"}</div>
              <div className="text-center mt-auto font-medium text-[9.5px]">
                (Authorised Signatory)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals for In-Place Field Editing with Language Switch ───────────── */}
      {modal && (
        <EditModalDialog
          modal={modal}
          lang={modalLang}
          onLangChange={handleModalLangChange}
          invoiceId={invoiceId}
          products={productsList}
          customer={customer}
          date={date}
          transport={transport}
          ewayBillNo={ewayBillNo}
          dalalName={dalalName}
          dalalContact={dalalContact}
          notes={notes}
          items={items}
          settings={settings}
          useIgst={useIgst}
          isPending={isPending}
          onClose={() => setModal(null)}
          onSaveCustomer={(updated) => {
            startTransition(async () => {
              if (invoiceId) await updateInvoiceCustomerAction(invoiceId, updated);
              setCustomer(updated);
              setModal(null);
              showToast(modalLang === "gu" ? "ગ્રાહકની વિગત અપડેટ થઈ!" : "Customer updated!");
            });
          }}
          onSaveDate={(updatedDate) => {
            startTransition(async () => {
              if (invoiceId) await updateInvoiceMetaAction(invoiceId, { date: updatedDate });
              setDate(updatedDate);
              setModal(null);
              showToast(modalLang === "gu" ? "તારીખ અપડેટ થઈ!" : "Date updated!");
            });
          }}
          onSaveTransport={(updatedTransport) => {
            startTransition(async () => {
              if (invoiceId) await updateInvoiceMetaAction(invoiceId, { transport: updatedTransport });
              setTransport(updatedTransport);
              setModal(null);
              showToast(modalLang === "gu" ? "ટ્રાન્સપોર્ટ નં. અપડેટ થયો!" : "Transport updated!");
            });
          }}
          onSaveEwayBill={(updatedEway) => {
            startTransition(async () => {
              if (invoiceId) await updateInvoiceMetaAction(invoiceId, { ewayBillNo: updatedEway });
              setEwayBillNo(updatedEway);
              setModal(null);
              showToast(modalLang === "gu" ? "ઈ-વે બિલ નં. અપડેટ થયો!" : "e-Way Bill updated!");
            });
          }}
          onSaveDalal={(updatedDalal) => {
            startTransition(async () => {
              if (invoiceId) {
                await updateInvoiceMetaAction(invoiceId, {
                  dalalName: updatedDalal.name,
                  dalalContact: updatedDalal.contact,
                });
              }
              setDalalName(updatedDalal.name);
              setDalalContact(updatedDalal.contact);
              setModal(null);
              showToast(modalLang === "gu" ? "દલાલની વિગત અપડેટ થઈ!" : "Dalal details updated!");
            });
          }}
          onSaveNotes={(updatedNotes) => {
            startTransition(async () => {
              if (invoiceId) await updateInvoiceMetaAction(invoiceId, { notes: updatedNotes });
              setNotes(updatedNotes);
              setModal(null);
              showToast(modalLang === "gu" ? "નોંધ અપડેટ થઈ!" : "Notes updated!");
            });
          }}
          onSaveBankDetails={(updatedBank) => {
            startTransition(async () => {
              await saveSettingsAction(updatedBank);
              setSettings((prev) => ({ ...prev, ...updatedBank }));
              setModal(null);
              showToast(modalLang === "gu" ? "બેંક વિગતો અપડેટ થઈ!" : "Bank details updated!");
            });
          }}
          onSaveTerms={(updatedTerms) => {
            startTransition(async () => {
              await saveSettingsAction({ termsAndConditions: updatedTerms });
              setSettings((prev) => ({ ...prev, termsAndConditions: updatedTerms }));
              setModal(null);
              showToast(modalLang === "gu" ? "શરતો અપડેટ થઈ!" : "Terms updated!");
            });
          }}
          onSaveCompanyInfo={(updatedCompany) => {
            startTransition(async () => {
              await saveSettingsAction(updatedCompany);
              setSettings((prev) => ({ ...prev, ...updatedCompany }));
              setModal(null);
              showToast(modalLang === "gu" ? "પેઢીની વિગતો અપડેટ થઈ!" : "Company details updated!");
            });
          }}
          onSaveItems={(updatedItems) => {
            startTransition(async () => {
              if (invoiceId) {
                const res = await updateInvoiceItemsAction(
                  invoiceId,
                  updatedItems.map((item, idx) => ({
                    srNo: idx + 1,
                    productName: item.productName,
                    hsnCode: item.hsnCode || undefined,
                    quantity: parseFloat(item.quantity) || 0,
                    unit: item.unit,
                    rate: parseFloat(item.rate) || 0,
                    gstPercent: parseFloat(item.gstPercent) || 0,
                    amount: parseFloat(item.amount) || 0,
                  })),
                  useIgst ? "igst" : "cgst_sgst"
                );
                setItems(res.items);
                setSubtotal(res.subtotal);
                setCgst(res.cgst);
                setSgst(res.sgst);
                setIgst(res.igst);
                setGrandTotal(res.grandTotal);
                setAmountInWords(res.amountInWords);
              }
              setModal(null);
              showToast(modalLang === "gu" ? "વસ્તુઓ અને બિલ અપડેટ થયું!" : "Line items updated & recalculated!");
            });
          }}
        />
      )}
    </div>
  );
}

// ─── Modal Dialog Component ───────────────────────────────────────────────────

function EditModalDialog({
  modal,
  lang,
  onLangChange,
  products = [],
  customer,
  date,
  transport,
  ewayBillNo,
  dalalName,
  dalalContact,
  notes,
  items,
  settings,
  useIgst,
  isPending,
  onClose,
  onSaveCustomer,
  onSaveDate,
  onSaveTransport,
  onSaveEwayBill,
  onSaveDalal,
  onSaveNotes,
  onSaveBankDetails,
  onSaveTerms,
  onSaveCompanyInfo,
  onSaveItems,
}: {
  modal: ModalType;
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  invoiceId?: string;
  products?: CatalogProduct[];
  customer: CustomerSnapshot;
  date: string;
  transport: string;
  ewayBillNo: string;
  dalalName: string;
  dalalContact: string;
  notes: string;
  items: InvoiceItem[];
  settings: CompanySettings;
  useIgst: boolean;
  isPending: boolean;
  onClose: () => void;
  onSaveCustomer: (c: CustomerSnapshot) => void;
  onSaveDate: (d: string) => void;
  onSaveTransport: (t: string) => void;
  onSaveEwayBill: (e: string) => void;
  onSaveDalal: (d: { name: string; contact: string }) => void;
  onSaveNotes: (n: string) => void;
  onSaveBankDetails: (b: { bankName?: string; bankAccount?: string; ifscCode?: string }) => void;
  onSaveTerms: (t: string) => void;
  onSaveCompanyInfo: (c: {
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    msmeNo?: string;
  }) => void;
  onSaveItems: (items: InvoiceItem[]) => void;
}) {
  if (!modal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Customer Modal */}
        {modal.type === "customer" && (
          <CustomerEditForm
            customer={customer}
            lang={lang}
            onLangChange={onLangChange}
            isPending={isPending}
            onClose={onClose}
            onSave={onSaveCustomer}
          />
        )}

        {/* Date Modal */}
        {modal.type === "date" && (
          <DateEditForm
            date={date}
            lang={lang}
            onLangChange={onLangChange}
            isPending={isPending}
            onClose={onClose}
            onSave={onSaveDate}
          />
        )}

        {/* Transport Modal */}
        {modal.type === "transport" && (
          <TransportEditForm
            transport={transport}
            lang={lang}
            onLangChange={onLangChange}
            isPending={isPending}
            onClose={onClose}
            onSave={onSaveTransport}
          />
        )}

        {/* e-Way Bill Modal */}
        {modal.type === "ewayBill" && (
          <EwayBillEditForm
            ewayBillNo={ewayBillNo}
            lang={lang}
            onLangChange={onLangChange}
            isPending={isPending}
            onClose={onClose}
            onSave={onSaveEwayBill}
          />
        )}

        {/* Dalal Modal */}
        {modal.type === "dalal" && (
          <DalalEditForm
            dalalName={dalalName}
            dalalContact={dalalContact}
            lang={lang}
            onLangChange={onLangChange}
            isPending={isPending}
            onClose={onClose}
            onSave={onSaveDalal}
          />
        )}

        {/* Notes Modal */}
        {modal.type === "notes" && (
          <NotesEditForm
            notes={notes}
            lang={lang}
            onLangChange={onLangChange}
            isPending={isPending}
            onClose={onClose}
            onSave={onSaveNotes}
          />
        )}

        {/* Bank Details Modal */}
        {modal.type === "bankDetails" && (
          <BankDetailsEditForm
            settings={settings}
            lang={lang}
            onLangChange={onLangChange}
            isPending={isPending}
            onClose={onClose}
            onSave={onSaveBankDetails}
          />
        )}

        {/* Terms Modal */}
        {modal.type === "termsAndConditions" && (
          <TermsEditForm
            terms={settings.termsAndConditions || ""}
            lang={lang}
            onLangChange={onLangChange}
            isPending={isPending}
            onClose={onClose}
            onSave={onSaveTerms}
          />
        )}

        {/* Company Info Modal */}
        {modal.type === "companyInfo" && (
          <CompanyInfoEditForm
            settings={settings}
            lang={lang}
            onLangChange={onLangChange}
            isPending={isPending}
            onClose={onClose}
            onSave={onSaveCompanyInfo}
          />
        )}

        {/* Line Items Modal */}
        {modal.type === "items" && (
          <LineItemsEditForm
            items={items}
            products={products}
            lang={lang}
            onLangChange={onLangChange}
            useIgst={useIgst}
            isPending={isPending}
            onClose={onClose}
            onSave={onSaveItems}
          />
        )}
      </div>
    </div>
  );
}

// ─── Modal Sub-Forms ─────────────────────────────────────────────────────────

function ModalHeader({
  title,
  lang,
  onLangChange,
  onClose,
}: {
  title: string;
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
      <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
        <Pencil className="w-4 h-4 text-blue-600" />
        {title}
      </h3>
      <div className="flex items-center gap-3">
        {/* Language selector in modal */}
        <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 text-xs font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => onLangChange("gu")}
            className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
              lang === "gu" ? "bg-blue-600 text-white font-bold" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            ગુજરાતી
          </button>
          <button
            type="button"
            onClick={() => onLangChange("en")}
            className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
              lang === "en" ? "bg-blue-600 text-white font-bold" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            English
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

function ModalFooter({
  isPending,
  onClose,
  lang = "en",
  submitLabel,
}: {
  isPending: boolean;
  onClose: () => void;
  lang?: "en" | "gu";
  submitLabel?: string;
}) {
  const cancelText = lang === "gu" ? "રદ કરો" : "Cancel";
  const defaultSubmitText = lang === "gu" ? "ફેરફારો સેવ કરો" : "Save Changes";
  const savingText = lang === "gu" ? "સેવ થાય છે..." : "Saving...";

  return (
    <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
      <button
        type="button"
        onClick={onClose}
        disabled={isPending}
        className="px-5 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
      >
        {cancelText}
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-all disabled:opacity-60 cursor-pointer"
      >
        {isPending ? savingText : submitLabel || defaultSubmitText}
      </button>
    </div>
  );
}

function CustomerEditForm({
  customer,
  lang,
  onLangChange,
  isPending,
  onClose,
  onSave,
}: {
  customer: CustomerSnapshot;
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  isPending: boolean;
  onClose: () => void;
  onSave: (c: CustomerSnapshot) => void;
}) {
  const [name, setName] = useState(customer.name || "");
  const [address, setAddress] = useState(customer.address || "");
  const [phone, setPhone] = useState(customer.phone || "");
  const [placeOfSupply, setPlaceOfSupply] = useState(customer.placeOfSupply || "");
  const [gstin, setGstin] = useState(customer.gstin || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return alert(lang === "gu" ? "ગ્રાહકનું નામ જરૂરી છે" : "Customer name is required");
    onSave({ name, address, phone, placeOfSupply, gstin });
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium";

  return (
    <form onSubmit={handleSubmit}>
      <ModalHeader
        title={lang === "gu" ? "ગ્રાહકની વિગતો બદલો" : "Edit Customer Details"}
        lang={lang}
        onLangChange={onLangChange}
        onClose={onClose}
      />
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {lang === "gu" ? "ગ્રાહકનું નામ" : "Customer Name"} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {lang === "gu" ? "સરનામું" : "Address"}
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className={inputCls + " resize-none"}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {lang === "gu" ? "મોબાઇલ નં." : "Mobile No."}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {lang === "gu" ? "સ્થળ (Place of Supply)" : "Place of Supply"}
            </label>
            <input
              type="text"
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              className={inputCls}
              placeholder="e.g. 24-Gujarat"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {lang === "gu" ? "GSTIN નં." : "GSTIN No."}
          </label>
          <input
            type="text"
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
            className={inputCls}
            placeholder="24ATKPR5908H1ZE"
          />
        </div>
      </div>
      <ModalFooter isPending={isPending} onClose={onClose} lang={lang} />
    </form>
  );
}

function DateEditForm({
  date,
  lang,
  onLangChange,
  isPending,
  onClose,
  onSave,
}: {
  date: string;
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  isPending: boolean;
  onClose: () => void;
  onSave: (d: string) => void;
}) {
  const [val, setVal] = useState(date || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!val) return alert(lang === "gu" ? "તારીખ પસંદ કરો" : "Date is required");
    onSave(val);
  }

  return (
    <form onSubmit={handleSubmit}>
      <ModalHeader
        title={lang === "gu" ? "બિલની તારીખ બદલો" : "Edit Invoice Date"}
        lang={lang}
        onLangChange={onLangChange}
        onClose={onClose}
      />
      <div className="p-6">
        <label className="block text-xs font-bold text-gray-700 mb-1">
          {lang === "gu" ? "બિલની તારીખ" : "Invoice Date"}
        </label>
        <input
          type="date"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          required
        />
      </div>
      <ModalFooter isPending={isPending} onClose={onClose} lang={lang} />
    </form>
  );
}

function TransportEditForm({
  transport,
  lang,
  onLangChange,
  isPending,
  onClose,
  onSave,
}: {
  transport: string;
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  isPending: boolean;
  onClose: () => void;
  onSave: (t: string) => void;
}) {
  const [val, setVal] = useState(transport || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(val.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <ModalHeader
        title={lang === "gu" ? "વાહન / ટ્રાન્સપોર્ટ નં. બદલો" : "Edit Transport / Vehicle No."}
        lang={lang}
        onLangChange={onLangChange}
        onClose={onClose}
      />
      <div className="p-6">
        <label className="block text-xs font-bold text-gray-700 mb-1">
          {lang === "gu" ? "વાહન / ટ્રાન્સપોર્ટ નં." : "Transport / Vehicle No."}
        </label>
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value.toUpperCase())}
          placeholder="GJ36T2093"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium font-mono"
        />
      </div>
      <ModalFooter isPending={isPending} onClose={onClose} lang={lang} />
    </form>
  );
}

function EwayBillEditForm({
  ewayBillNo,
  lang,
  onLangChange,
  isPending,
  onClose,
  onSave,
}: {
  ewayBillNo: string;
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  isPending: boolean;
  onClose: () => void;
  onSave: (e: string) => void;
}) {
  const [val, setVal] = useState(ewayBillNo || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(val.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <ModalHeader
        title={lang === "gu" ? "ઈ-વે બિલ નં. બદલો" : "Edit e-Way Bill No."}
        lang={lang}
        onLangChange={onLangChange}
        onClose={onClose}
      />
      <div className="p-6">
        <label className="block text-xs font-bold text-gray-700 mb-1">
          {lang === "gu" ? "ઈ-વે બિલ નં." : "e-Way Bill No."}
        </label>
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="652172775440"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium font-mono"
        />
      </div>
      <ModalFooter isPending={isPending} onClose={onClose} lang={lang} />
    </form>
  );
}

function DalalEditForm({
  dalalName,
  dalalContact,
  lang,
  onLangChange,
  isPending,
  onClose,
  onSave,
}: {
  dalalName: string;
  dalalContact: string;
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  isPending: boolean;
  onClose: () => void;
  onSave: (d: { name: string; contact: string }) => void;
}) {
  const [name, setName] = useState(dalalName || "");
  const [contact, setContact] = useState(dalalContact || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ name: name.trim(), contact: contact.trim() });
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium";

  return (
    <form onSubmit={handleSubmit}>
      <ModalHeader
        title={lang === "gu" ? "દલાલની વિગત બદલો" : "Edit Dalal Details"}
        lang={lang}
        onLangChange={onLangChange}
        onClose={onClose}
      />
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {lang === "gu" ? "દલાલનું નામ" : "Dalal Name"}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={lang === "gu" ? "દા.ત. રમેશભાઈ" : "e.g. Ramesh Bhai"}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {lang === "gu" ? "દલાલનો મોબાઈલ નં." : "Dalal Contact No."}
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={lang === "gu" ? "દા.ત. 98250XXXXX" : "e.g. 98250XXXXX"}
            className={inputCls}
          />
        </div>
      </div>
      <ModalFooter isPending={isPending} onClose={onClose} lang={lang} />
    </form>
  );
}

function NotesEditForm({
  notes,
  lang,
  onLangChange,
  isPending,
  onClose,
  onSave,
}: {
  notes: string;
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  isPending: boolean;
  onClose: () => void;
  onSave: (n: string) => void;
}) {
  const [val, setVal] = useState(notes || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(val.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <ModalHeader
        title={lang === "gu" ? "નોંધ (Notes) બદલો" : "Edit Notes"}
        lang={lang}
        onLangChange={onLangChange}
        onClose={onClose}
      />
      <div className="p-6">
        <label className="block text-xs font-bold text-gray-700 mb-1">
          {lang === "gu" ? "બિલની નોંધ" : "Invoice Note"}
        </label>
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          rows={3}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none"
          placeholder={lang === "gu" ? "બિલ માટે કોઈ ખાસ નોંધ લખો..." : "Add any specific note for this bill..."}
        />
      </div>
      <ModalFooter isPending={isPending} onClose={onClose} lang={lang} />
    </form>
  );
}

function BankDetailsEditForm({
  settings,
  lang,
  onLangChange,
  isPending,
  onClose,
  onSave,
}: {
  settings: CompanySettings;
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  isPending: boolean;
  onClose: () => void;
  onSave: (b: { bankName?: string; bankAccount?: string; ifscCode?: string }) => void;
}) {
  const [bankName, setBankName] = useState(settings.bankName || "");
  const [bankAccount, setBankAccount] = useState(settings.bankAccount || "");
  const [ifscCode, setIfscCode] = useState(settings.ifscCode || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ bankName, bankAccount, ifscCode });
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium";

  return (
    <form onSubmit={handleSubmit}>
      <ModalHeader
        title={lang === "gu" ? "બેંકની વિગતો બદલો" : "Edit Bank Details"}
        lang={lang}
        onLangChange={onLangChange}
        onClose={onClose}
      />
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {lang === "gu" ? "બેંકનું નામ" : "Bank Name"}
          </label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className={inputCls}
            placeholder="e.g. State Bank of India"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {lang === "gu" ? "બેંક ખાતા નંબર" : "Bank A/c No."}
          </label>
          <input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            className={inputCls}
            placeholder="e.g. 30894038402"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {lang === "gu" ? "RTGS / IFSC કોડ" : "RTGS / IFSC Code"}
          </label>
          <input
            type="text"
            value={ifscCode}
            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
            className={inputCls}
            placeholder="e.g. SBIN0001234"
          />
        </div>
      </div>
      <ModalFooter isPending={isPending} onClose={onClose} lang={lang} />
    </form>
  );
}

function TermsEditForm({
  terms,
  lang,
  onLangChange,
  isPending,
  onClose,
  onSave,
}: {
  terms: string;
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  isPending: boolean;
  onClose: () => void;
  onSave: (t: string) => void;
}) {
  const [val, setVal] = useState(terms || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(val);
  }

  return (
    <form onSubmit={handleSubmit}>
      <ModalHeader
        title={lang === "gu" ? "નિયમો અને શરતો બદલો" : "Edit Terms & Conditions"}
        lang={lang}
        onLangChange={onLangChange}
        onClose={onClose}
      />
      <div className="p-6">
        <label className="block text-xs font-bold text-gray-700 mb-1">
          {lang === "gu" ? "નિયમો અને શરતો" : "Terms & Conditions"}
        </label>
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          rows={5}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium resize-none leading-relaxed"
          placeholder="1. Goods once sold will not be taken back..."
        />
      </div>
      <ModalFooter isPending={isPending} onClose={onClose} lang={lang} />
    </form>
  );
}

function CompanyInfoEditForm({
  settings,
  lang,
  onLangChange,
  isPending,
  onClose,
  onSave,
}: {
  settings: CompanySettings;
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  isPending: boolean;
  onClose: () => void;
  onSave: (c: {
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    msmeNo?: string;
  }) => void;
}) {
  const [companyName, setCompanyName] = useState(settings.companyName || "");
  const [address, setAddress] = useState(settings.address || "");
  const [phone, setPhone] = useState(settings.phone || "");
  const [email, setEmail] = useState(settings.email || "");
  const [gstin, setGstin] = useState(settings.gstin || "");
  const [msmeNo, setMsmeNo] = useState(settings.msmeNo || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ companyName, address, phone, email, gstin, msmeNo });
  }

  const inputCls =
    "w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium";

  return (
    <form onSubmit={handleSubmit}>
      <ModalHeader
        title={lang === "gu" ? "પેઢીની વિગતો બદલો" : "Edit Company Information"}
        lang={lang}
        onLangChange={onLangChange}
        onClose={onClose}
      />
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {lang === "gu" ? "પેઢીનું નામ" : "Company Name"}
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1">
            {lang === "gu" ? "સરનામું" : "Company Address"}
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={2}
            className={inputCls + " resize-none"}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {lang === "gu" ? "ફોન" : "Phone"}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {lang === "gu" ? "ઈમેલ" : "Email"}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {lang === "gu" ? "GSTIN નં." : "GSTIN No."}
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {lang === "gu" ? "MSME નં." : "MSME No."}
            </label>
            <input
              type="text"
              value={msmeNo}
              onChange={(e) => setMsmeNo(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>
      <ModalFooter isPending={isPending} onClose={onClose} lang={lang} />
    </form>
  );
}

function LineItemsEditForm({
  items: initialList,
  products = [],
  lang,
  onLangChange,
  useIgst,
  isPending,
  onClose,
  onSave,
}: {
  items: InvoiceItem[];
  products?: CatalogProduct[];
  lang: "en" | "gu";
  onLangChange: (l: "en" | "gu") => void;
  useIgst: boolean;
  isPending: boolean;
  onClose: () => void;
  onSave: (items: InvoiceItem[]) => void;
}) {
  const [list, setList] = useState<InvoiceItem[]>(
    initialList.map((i, idx) => ({ ...i, srNo: idx + 1 }))
  );

  function updateRow(index: number, patch: Partial<InvoiceItem>) {
    setList((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const updated = { ...row, ...patch };
        const q = parseFloat(updated.quantity) || 0;
        const r = parseFloat(updated.rate) || 0;
        updated.amount = (Math.round(q * r * 100) / 100).toFixed(2);
        return updated;
      })
    );
  }

  function addRow() {
    setList((prev) => [
      ...prev,
      {
        srNo: prev.length + 1,
        productName: "",
        hsnCode: "",
        quantity: "1",
        unit: "kg",
        rate: "0",
        gstPercent: "0",
        amount: "0",
      },
    ]);
  }

  function removeRow(index: number) {
    if (list.length <= 1) return alert(lang === "gu" ? "ઓછામાં ઓછી 1 વસ્તુ રાખવી જરૂરી છે" : "Must keep at least 1 item");
    setList((prev) =>
      prev.filter((_, i) => i !== index).map((row, i) => ({ ...row, srNo: i + 1 }))
    );
  }

  // Live total calculations
  const subtotal = list.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const totalTax = list.reduce((s, i) => {
    const gst = parseFloat(i.gstPercent) || 0;
    return s + (parseFloat(i.amount) || 0) * (gst / 100);
  }, 0);
  const grandTotal = subtotal + totalTax;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (list.every((i) => !i.productName.trim())) {
      return alert(lang === "gu" ? "ઓછામાં ઓછું એક વસ્તુનું નામ લખવું જરૂરી છે" : "At least one product name is required.");
    }
    onSave(list);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <ModalHeader
        title={lang === "gu" ? "વસ્તુઓ અને ભાવ બદલો" : "Edit Line Items & Rates"}
        lang={lang}
        onLangChange={onLangChange}
        onClose={onClose}
      />
      <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
        <div className="space-y-3">
          {list.map((row, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">
                  {lang === "gu" ? `વસ્તુ #${idx + 1}` : `Item #${idx + 1}`}
                </span>
                {list.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="text-red-500 hover:text-red-700 p-1 rounded transition-colors cursor-pointer"
                    title={lang === "gu" ? "આ વસ્તુ હટાવો" : "Remove item"}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                    {lang === "gu" ? "વસ્તુનું નામ" : "Product Name"}
                  </label>
                  <ProductSelector
                    value={row.productName}
                    products={products}
                    onSelectProduct={(p) =>
                      updateRow(idx, {
                        productName: p.name,
                        hsnCode: p.hsnCode,
                        unit: p.unit,
                        gstPercent: p.gstPercent,
                      })
                    }
                    onChangeCustomName={(v) => updateRow(idx, { productName: v })}
                    lang={lang}
                    placeholder={lang === "gu" ? "દા.ત. ચણા / સિંગદાણા..." : "Product name"}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                    {lang === "gu" ? "HSN કોડ" : "HSN/SAC"}
                  </label>
                  <input
                    type="text"
                    value={row.hsnCode || ""}
                    onChange={(e) => updateRow(idx, { hsnCode: e.target.value })}
                    placeholder="HSN"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                    {lang === "gu" ? "માત્રા (Qty)" : "Qty"}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={row.quantity}
                    onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-medium bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                    {lang === "gu" ? "એકમ (Unit)" : "Unit"}
                  </label>
                  <UnitSelector
                    value={row.unit}
                    onChange={(val) => updateRow(idx, { unit: val })}
                    lang={lang}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-medium bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                    {lang === "gu" ? "ભાવ (₹)" : "Rate (₹)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.rate}
                    onChange={(e) => updateRow(idx, { rate: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-medium bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-0.5">
                    {lang === "gu" ? "GST %" : "GST %"}
                  </label>
                  <select
                    value={String(parseFloat(row.gstPercent || "0"))}
                    onChange={(e) => updateRow(idx, { gstPercent: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs font-medium bg-white"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="text-right text-xs font-bold text-gray-800 pt-1">
                {lang === "gu" ? "રકમ:" : "Item Amount:"} ₹{formatINR(parseFloat(row.amount) || 0)}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors cursor-pointer"
        >
          <Plus size={14} />
          {lang === "gu" ? "બીજી વસ્તુ ઉમેરો" : "Add Another Item"}
        </button>

        {/* Live Calculation Box */}
        <div className="p-3.5 bg-gray-100 rounded-xl text-xs space-y-1 font-medium text-gray-700">
          <div className="flex justify-between">
            <span>{lang === "gu" ? "કુલ રકમ (Subtotal):" : "Subtotal:"}</span>
            <span>₹{formatINR(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>{lang === "gu" ? "કુલ ટેક્સ:" : "Total Tax:"}</span>
            <span>₹{formatINR(totalTax)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 text-sm border-t border-gray-300 pt-1">
            <span>{lang === "gu" ? "કુલ રકમ (Grand Total):" : "Grand Total:"}</span>
            <span>₹{formatINR(grandTotal)}</span>
          </div>
        </div>
      </div>
      <ModalFooter
        isPending={isPending}
        onClose={onClose}
        lang={lang}
        submitLabel={lang === "gu" ? "સેવ કરો અને નવું બિલ ગણો" : "Save & Recalculate Bill"}
      />
    </form>
  );
}
