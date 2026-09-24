"use client";

import { formatINR, numberToWords } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

function EyeToggle({ isHidden, onToggle }: { isHidden: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="absolute -top-1.5 -right-1.5 bg-gray-200 hover:bg-gray-300 p-0.5 rounded-full text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity print:hidden z-10"
      title="Toggle visibility"
    >
      {isHidden ? <EyeOff size={11} /> : <Eye size={11} />}
    </button>
  );
}

function ToggleWrapper({ 
  isHidden, 
  onToggle, 
  children, 
  className = "", 
  as: Component = "div",
}: {
  isHidden: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
  as?: any;
}) {
  return (
    <Component className={`group relative ${isHidden ? 'opacity-30 print:hidden' : ''} ${className}`}>
      <EyeToggle isHidden={isHidden} onToggle={onToggle} />
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
  invoiceNumber: string;
  date: string;
  transport?: string | null;
  ewayBillNo?: string | null;
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
};

export default function InvoiceView({
  invoiceNumber,
  date,
  transport,
  ewayBillNo,
  customerSnapshot,
  items,
  subtotal,
  cgst,
  sgst,
  igst,
  grandTotal,
  amountInWords,
  notes,
  settings,
}: Props) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setHidden(prev => ({ ...prev, [key]: !prev[key] }));

  const subtotalNum = parseFloat(subtotal || "0");
  const cgstVal = parseFloat(cgst || "0");
  const sgstVal = parseFloat(sgst || "0");
  const igstVal = parseFloat(igst || "0");
  const grandTotalNum = parseFloat(grandTotal || "0");
  const useIgst = igstVal > 0;

  const totalGst = useIgst ? igstVal : cgstVal + sgstVal;

  // Calculate percentage for display
  const taxRate = subtotalNum > 0 ? (totalGst / subtotalNum) * 100 : 0;
  const halfTaxRate = (taxRate / 2).toFixed(2);
  const fullTaxRate = taxRate.toFixed(2);

  // Formatted date (DD/MM/YYYY)
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const formattedDate = isNaN(d.getTime()) ? date : `${day}/${month}/${year}`;

  // Words
  const billAmountInWords = amountInWords || numberToWords(grandTotalNum);
  const gstInWords = totalGst > 0 ? numberToWords(totalGst) : "Zero Only";

  // Height spacer calculation so vertical borders stretch down to match photo
  const emptyRowsCount = Math.max(0, 8 - items.length);

  const hHsn = hidden["colHsn"] ? "opacity-30 print:hidden" : "";
  const hUnit = hidden["colUnit"] ? "opacity-30 print:hidden" : "";
  const hRate = hidden["colRate"] ? "opacity-30 print:hidden" : "";
  const hGst = hidden["colGst"] ? "opacity-30 print:hidden" : "";

  return (
    <div
      id="invoice-print"
      className="bg-white text-black font-sans w-full max-w-[210mm] mx-auto border-[1.5px] border-black text-[11px] leading-tight select-text print:m-0 print:border-[1.5px] print:border-black"
    >
      {/* ── 1. Header Section ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_230px] border-b border-black">
        {/* Left: Company Name Box & Centered Address */}
        <div className="p-2 border-r border-black flex flex-col justify-between">
          <div className="border border-black bg-[#e9ecef] py-1 px-4 text-center font-serif font-bold text-xl md:text-2xl tracking-wider uppercase text-black">
            {settings.companyName || "RUPALA ENTERPRISE"}
          </div>
          <div className="text-center text-[10px] uppercase font-bold text-black mt-2 leading-tight px-1">
            <ToggleWrapper isHidden={hidden["companyAddress"]} onToggle={() => toggle("companyAddress")}>
              {settings.address ? (
                <div className="whitespace-pre-line leading-relaxed">{settings.address}</div>
              ) : (
                <>
                  <div>GROUND FLOOR, OFFICE 12X25, RUPALA ENTERPRISE, GIR GADHADA ROAD</div>
                  <div className="mt-0.5">LAND SURVEY NO. 144/P2, VADVIYALA, GIR SOMNATH, GUJARAT, 362530</div>
                </>
              )}
            </ToggleWrapper>
            <ToggleWrapper isHidden={hidden["companyContact"]} onToggle={() => toggle("companyContact")} className="mt-1 text-[9.5px] font-semibold flex flex-wrap justify-center gap-x-4 normal-case">
              {settings.email && <span>E-MAIL: {settings.email}</span>}
              {settings.phone && <span>Phone: {settings.phone}</span>}
            </ToggleWrapper>
          </div>
        </div>

        {/* Right: Wordmark Logo Box */}
        <div className="p-3 flex flex-col items-center justify-center relative bg-white select-none border-l border-black">
          {/* <span className="absolute top-1 right-2 text-[9px] font-bold text-black">®</span> */}
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
      {/* <div className="grid grid-cols-[56%_44%] border-b border-black"> */}
      <div className="grid grid-cols-[55.58%_44.48%] border-b border-black">
        {/* Left: Customer Info */}
        <div className="p-2 border-r border-black text-[10.5px] leading-relaxed">
          <div className="font-bold">
            M/s. : <span className="font-bold text-[11px]">{customerSnapshot.name}</span>
          </div>
          {customerSnapshot.address && (
            <ToggleWrapper isHidden={hidden["customerAddress"]} onToggle={() => toggle("customerAddress")} className="pl-8 whitespace-pre-line text-[10px] leading-snug mt-0.5 text-black">
              {customerSnapshot.address}
            </ToggleWrapper>
          )}
          <div className="mt-2 space-y-0.5 text-[10px]">
            <ToggleWrapper isHidden={hidden["customerPhone"]} onToggle={() => toggle("customerPhone")}>
              <span className="font-bold">Mo No. : </span>
              <span>{customerSnapshot.phone || "—"}</span>
            </ToggleWrapper>
            <ToggleWrapper isHidden={hidden["customerPos"]} onToggle={() => toggle("customerPos")}>
              <span className="font-bold">Place of Supply : </span>
              <span>{customerSnapshot.placeOfSupply || "24-Gujarat"}</span>
            </ToggleWrapper>
            <ToggleWrapper isHidden={hidden["customerGstin"]} onToggle={() => toggle("customerGstin")}>
              <span className="font-bold">GSTIN No. : </span>
              <span className="font-bold">{customerSnapshot.gstin || "—"}</span>
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
            <div className="grid grid-cols-[85px_1fr]">
              <span className="font-bold">Date</span>
              <span>: {formattedDate}</span>
            </div>
          </div>
          <div className="border-t border-black p-2 flex-1 space-y-1">
            <ToggleWrapper isHidden={hidden["transport"]} onToggle={() => toggle("transport")} className="grid grid-cols-[85px_1fr]">
              <span className="font-bold">Transport</span>
              <span>: {transport || "—"}</span>
            </ToggleWrapper>
            {ewayBillNo && (
              <ToggleWrapper isHidden={hidden["ewayBill"]} onToggle={() => toggle("ewayBill")} className="grid grid-cols-[85px_1fr]">
                <span className="font-bold">e-Way Bill No.</span>
                <span>: {ewayBillNo}</span>
              </ToggleWrapper>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Line Items Table (with continuous vertical borders) ─────────── */}
      <table className="w-full border-collapse text-[10.5px]">
        <thead>
          <tr className="border-b border-black text-[10px] font-bold text-black bg-white">
            <th className="w-10 py-1.5 text-center border-r border-black font-bold">SrNo</th>
            <th className="py-1.5 px-2 text-left border-r border-black font-bold">Product Name</th>
            <ToggleWrapper as="th" isHidden={hidden["colHsn"]} onToggle={() => toggle("colHsn")} className="w-16 py-1.5 text-center border-r border-black font-bold">HSN/SAC</ToggleWrapper>
            <th className="w-16 py-1.5 text-right pr-2 border-r border-black font-bold">Qty</th>
            <ToggleWrapper as="th" isHidden={hidden["colUnit"]} onToggle={() => toggle("colUnit")} className="w-14 py-1.5 text-center border-r border-black font-bold">Unit</ToggleWrapper>
            <ToggleWrapper as="th" isHidden={hidden["colRate"]} onToggle={() => toggle("colRate")} className="w-20 py-1.5 text-right pr-2 border-r border-black font-bold">Rate</ToggleWrapper>
            <ToggleWrapper as="th" isHidden={hidden["colGst"]} onToggle={() => toggle("colGst")} className="w-14 py-1.5 text-right pr-2 border-r border-black font-bold">GST %</ToggleWrapper>
            <th className="w-24 py-1.5 text-right pr-2 font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.srNo} className="border-b border-transparent">
              <td className="py-1 text-center border-r border-black">{item.srNo}</td>
              <td className="py-1 px-2 text-left border-r border-black font-medium">{item.productName}</td>
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
          <ToggleWrapper isHidden={hidden["footerGstin"]} onToggle={() => toggle("footerGstin")}>
            <span>GSTIN No.: {settings.gstin || "—"}</span>
          </ToggleWrapper>
          <ToggleWrapper isHidden={hidden["footerMsme"]} onToggle={() => toggle("footerMsme")}>
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
          <ToggleWrapper isHidden={hidden["bankDetails"]} onToggle={() => toggle("bankDetails")} className="p-2 space-y-0.5 leading-snug">
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
          <ToggleWrapper isHidden={hidden["notes"]} onToggle={() => toggle("notes")} className="border-t border-black p-2 min-h-[26px]">
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
                <span>Integrated Tax</span>
                <span className="flex gap-4">
                  <span className="w-14 text-right">{fullTaxRate}%</span>
                  <span className="w-24 text-right">{formatINR(igstVal)}</span>
                </span>
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span>Central Tax</span>
                  <span className="flex gap-4">
                    <span className="w-14 text-right">{halfTaxRate}%</span>
                    <span className="w-24 text-right">{formatINR(cgstVal)}</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>State/UT Tax</span>
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
        <ToggleWrapper isHidden={hidden["termsAndConditions"]} onToggle={() => toggle("termsAndConditions")} className="border-r border-black p-2 text-[9px] leading-tight text-black">
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
  );
}
