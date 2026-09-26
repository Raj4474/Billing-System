"use client";

import { useState, useEffect } from "react";
import { Printer, FileDown, Check, Info } from "lucide-react";
import { getCleanInvoiceFilename } from "@/lib/pdfStorage";

interface PrintButtonProps {
  invoiceNumber?: string;
  customerName?: string;
  autoPrint?: boolean;
}

export default function PrintButton({
  invoiceNumber = "INVOICE",
  customerName = "",
  autoPrint = false,
}: PrintButtonProps) {
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const cleanFilename = getCleanInvoiceFilename(invoiceNumber, customerName).replace(/\.pdf$/i, "");

  const triggerNativePrint = (isPdfSave = false) => {
    const originalTitle = document.title;
    document.title = cleanFilename;

    if (isPdfSave) {
      setToastMsg("Destination માં 'Save as PDF' પસંદ કરો");
    }

    // Small delay so document.title updates before browser print dialog snapshot
    setTimeout(() => {
      window.print();
      // Restore original page title after print dialog closes
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }, 100);
  };

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        triggerNativePrint(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="flex flex-wrap items-center gap-2.5 print:hidden">
      {/* Toast Feedback for Save as PDF */}
      {toastMsg && (
        <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 px-3 py-1.5 rounded-xl font-bold text-xs animate-fade-in shadow-xs">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{toastMsg}</span>
        </span>
      )}

      {/* Save as PDF Button */}
      <button
        type="button"
        onClick={() => triggerNativePrint(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-sm font-bold rounded-xl border border-gray-300 shadow-2xs hover:-translate-y-0.5 transition-all cursor-pointer"
        title={`Save clean vector PDF as ${cleanFilename}.pdf`}
      >
        <FileDown className="w-4 h-4 text-blue-600" />
        <span>Save as PDF</span>
      </button>

      {/* Print Bill Button */}
      <button
        type="button"
        onClick={() => triggerNativePrint(false)}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        title="Open browser print window"
      >
        <Printer className="w-4 h-4" />
        <span>PRINT BILL</span>
      </button>
    </div>
  );
}

