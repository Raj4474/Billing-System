"use client";

import { useState, useEffect } from "react";
import { Printer, FileDown, FolderOpen, Check, Loader2, AlertCircle } from "lucide-react";
import {
  saveInvoicePdf,
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
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  const cleanFilename = getCleanInvoiceFilename(invoiceNumber, customerName);

  useEffect(() => {
    setIsSupported(isDirectoryPickerSupported());
    const saved = getSavedDirectoryName();
    if (saved) setFolderName(saved);
  }, []);

  // ── auto-trigger print when opened via ?print=1 ──────────────────────────
  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => nativePrint(), 400);
    return () => clearTimeout(t);
  }, [autoPrint]);

  // ── helpers ───────────────────────────────────────────────────────────────
  function showStatus(text: string, ok = true) {
    setStatus({ text, ok });
    setTimeout(() => setStatus(null), 5000);
  }

  function nativePrint() {
    const originalTitle = document.title;
    // Pre-fill the browser's "Save as PDF" filename suggestion
    document.title = cleanFilename.replace(/\.pdf$/i, "");
    setTimeout(() => {
      window.print();
      setTimeout(() => { document.title = originalTitle; }, 1200);
    }, 80);
  }

  async function handlePickFolder() {
    const res = await pickSaveDirectory();
    if (res.name) {
      setFolderName(res.name);
      showStatus(`Save folder set: ${res.name}`);
    }
  }

  /**
   * PRINT BILL:
   *  1. If a folder is configured → silently auto-save PDF to that folder
   *     (overwrites existing file — no duplicate names).
   *  2. Open ONE native print dialog.
   */
  async function handlePrintBill() {
    if (folderName) {
      // Auto-save to folder first (skip browser-download fallback)
      setIsSaving(true);
      try {
        const res = await saveInvoicePdf({
          invoiceNumber,
          customerName,
          elementId: "invoice-print",
          promptIfNoDir: false,
          skipFallback: true, // never open a browser download during print flow
        });
        if (res.folderName) {
          showStatus(`Auto-saved to "${res.folderName}" as ${res.filename}`);
        }
      } catch (err) {
        console.error("Auto-save before print failed:", err);
        showStatus("Auto-save failed — continuing to print", false);
      } finally {
        setIsSaving(false);
      }
    }

    // Always open the print dialog (one click, one dialog)
    nativePrint();
  }

  /**
   * SAVE PDF:
   *  Saves directly to the configured folder (no print dialog).
   *  If no folder is set, prompts once to pick one, then saves.
   *  Uses File System Access API → overwrites existing file, no duplicates.
   */
  async function handleSavePdf() {
    setIsSaving(true);
    try {
      const res = await saveInvoicePdf({
        invoiceNumber,
        customerName,
        elementId: "invoice-print",
        promptIfNoDir: true,  // prompt once if no folder configured
        skipFallback: false,  // fall back to browser download as last resort
      });

      if (res.folderName) {
        setFolderName(res.folderName);
        showStatus(`Saved: ${res.filename}  →  ${res.folderName}`);
      } else if (res.directDownload) {
        showStatus(`Downloaded: ${res.filename} (tip: set a save folder to avoid browser copies)`);
      }
    } catch (err) {
      console.error("Save PDF error:", err);
      showStatus("PDF save failed", false);
    } finally {
      setIsSaving(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-wrap items-center gap-2.5 print:hidden">

      {/* Folder Picker Badge */}
      {isSupported && (
        <button
          type="button"
          onClick={handlePickFolder}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-colors cursor-pointer"
          title="Select the folder where PDFs will auto-save"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          {folderName ? (
            <span>
              Folder: <strong className="text-gray-900 font-bold">{folderName}</strong>
              <span className="ml-1 text-gray-400 font-normal">(Change)</span>
            </span>
          ) : (
            <span className="text-orange-700 font-bold">Set Save Folder</span>
          )}
        </button>
      )}

      {/* Status Toast */}
      {status && (
        <span
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs animate-fade-in shadow-xs max-w-xs ${
            status.ok
              ? "bg-green-50 border border-green-200 text-green-900"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {status.ok
            ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
            : <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />}
          <span className="truncate">{status.text}</span>
        </span>
      )}

      {/* ── Save PDF ── saves to folder only (no print dialog) */}
      <button
        type="button"
        disabled={isSaving}
        onClick={handleSavePdf}
        className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-sm font-bold rounded-xl border border-gray-300 shadow-2xs hover:-translate-y-0.5 transition-all disabled:opacity-60 cursor-pointer"
        title={folderName ? `Save PDF to "${folderName}" — overwrites existing file` : "Save PDF to folder"}
      >
        {isSaving
          ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          : <FileDown className="w-4 h-4 text-blue-600" />}
        <span>Save PDF</span>
      </button>

      {/* ── PRINT BILL ── auto-saves to folder then opens ONE print dialog */}
      <button
        type="button"
        disabled={isSaving}
        onClick={handlePrintBill}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-60 cursor-pointer"
        title={
          folderName
            ? `Auto-saves to "${folderName}" then opens print dialog`
            : "Opens print dialog"
        }
      >
        {isSaving
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Printer className="w-4 h-4" />}
        <span>PRINT BILL</span>
      </button>
    </div>
  );
}
