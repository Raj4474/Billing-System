"use client";

import { useState, useEffect } from "react";
import { Printer, FileDown, FolderOpen, Check, Loader2, Info } from "lucide-react";
import {
  pickSaveDirectory,
  getSavedDirectoryName,
  isDirectoryPickerSupported,
  getCleanInvoiceFilename,
} from "@/lib/pdfStorage";

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
  const [folderName, setFolderName] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [savingLabel, setSavingLabel] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const cleanFilename = getCleanInvoiceFilename(invoiceNumber, customerName).replace(/\.pdf$/i, "");

  useEffect(() => {
    setIsSupported(isDirectoryPickerSupported());
    const saved = getSavedDirectoryName();
    if (saved) setFolderName(saved);
  }, []);

  // ── auto-trigger print when opened via ?print=1 ──────────────────────────
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => openPrintDialog(false), 400);
    return () => clearTimeout(t);
  }, [autoPrint]);

  function showToast(msg: string, ms = 6000) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), ms);
  }

  /**
   * Opens the native browser print dialog.
   * Sets document.title to the clean invoice filename so the browser
   * pre-fills "RE-004_Customer_Name" in its Save As / PDF destination filename.
   *
   * @param isSavePdf – when true, shows a brief hint to choose "Save as PDF"
   */
  function openPrintDialog(isSavePdf: boolean) {
    const originalTitle = document.title;
    document.title = cleanFilename;

    if (isSavePdf) {
      showToast(
        `📌 Dialog માં "Destination → Save as PDF" પસંદ કરો, ` +
        (folderName ? `folder: "${folderName}" → Save` : "અને Bills ફોલ્ડર પસંદ કરો")
      );
    }

    setTimeout(() => {
      window.print();
      // Restore page title after dialog closes
      setTimeout(() => { document.title = originalTitle; }, 1200);
    }, isSavePdf ? 300 : 80); // small extra delay so toast renders before dialog blocks
  }

  async function handlePickFolder() {
    setSavingLabel(true);
    try {
      const res = await pickSaveDirectory();
      if (res.name) {
        setFolderName(res.name);
        showToast(`✓ Save folder set: "${res.name}" — select it in the print dialog's Destination`);
      }
    } finally {
      setSavingLabel(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 print:hidden">

      {/* ── Folder Reminder Badge ─────────────────────────────────────────── */}
      {isSupported && (
        <button
          type="button"
          onClick={handlePickFolder}
          disabled={savingLabel}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-colors cursor-pointer disabled:opacity-60"
          title="Remember which folder to save bills in"
        >
          {savingLabel
            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            : <FolderOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
          {folderName ? (
            <span>
              Save to: <strong className="text-gray-900">{folderName}</strong>
              <span className="ml-1 text-gray-400 font-normal">(Change)</span>
            </span>
          ) : (
            <span className="text-orange-700 font-bold">Set Bills Folder</span>
          )}
        </button>
      )}

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toastMsg && (
        <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-900 px-3 py-1.5 rounded-xl font-semibold text-xs animate-fade-in shadow-xs max-w-sm">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{toastMsg}</span>
        </span>
      )}

      {/* ── Save as PDF ───────────────────────────────────────────────────
          Opens the native print dialog with a hint to choose "Save as PDF"
          as destination → 100% same quality as "PRINT BILL". */}
      <button
        type="button"
        onClick={() => openPrintDialog(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-sm font-bold rounded-xl border border-gray-300 shadow-2xs hover:-translate-y-0.5 transition-all cursor-pointer"
        title={`Save as "${cleanFilename}.pdf" — opens print dialog, choose Save as PDF`}
      >
        <FileDown className="w-4 h-4 text-blue-600" />
        <span>Save as PDF</span>
      </button>

      {/* ── PRINT BILL ───────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => openPrintDialog(false)}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        title="Open browser print window"
      >
        <Printer className="w-4 h-4" />
        <span>PRINT BILL</span>
      </button>
    </div>
  );
}
