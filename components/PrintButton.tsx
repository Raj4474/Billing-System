"use client";

import { useState, useEffect } from "react";
import { Printer, Download, FolderOpen, Check, Loader2 } from "lucide-react";
import {
  saveInvoicePdf,
  pickSaveDirectory,
  getSavedDirectoryName,
  isDirectoryPickerSupported,
} from "@/lib/pdfStorage";

interface PrintButtonProps {
  invoiceNumber?: string;
  customerName?: string;
}

export default function PrintButton({
  invoiceNumber = "INVOICE",
  customerName = "",
}: PrintButtonProps) {
  const [folderName, setFolderName] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported(isDirectoryPickerSupported());
    const saved = getSavedDirectoryName();
    if (saved) setFolderName(saved);
  }, []);

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  async function handlePickFolder() {
    const res = await pickSaveDirectory();
    if (res.name) {
      setFolderName(res.name);
      showStatus(`📁 સેવ ફોલ્ડર સેટ થયું: ${res.name}`);
    }
  }

  async function handleSavePdf(alsoPrint = false) {
    setIsSaving(true);
    try {
      const res = await saveInvoicePdf({
        invoiceNumber,
        customerName,
        elementId: "invoice-print",
        promptIfNoDir: true,
      });

      if (res.folderName) {
        setFolderName(res.folderName);
        showStatus(`✅ ${res.filename} સેવ થયું (${res.folderName})`);
      } else if (res.directDownload) {
        showStatus(`✅ ${res.filename} ડાઉનલોડ થયું`);
      }

      if (alsoPrint) {
        setTimeout(() => {
          window.print();
        }, 300);
      }
    } catch (err) {
      console.error("Save PDF error:", err);
      showStatus("❌ PDF સેવ કરતી વખતે ભૂલ આવી");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {/* Folder Picker Badge */}
      {isSupported && (
        <button
          type="button"
          onClick={handlePickFolder}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-colors cursor-pointer"
          title="Select folder where PDFs will be saved on your computer"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
          <span>
            {folderName ? (
              <span>
                સેવ ફોલ્ડર: <strong className="text-gray-900 font-bold">{folderName}</strong> (બદલો)
              </span>
            ) : (
              <span>📁 સેવ ફોલ્ડર પસંદ કરો</span>
            )}
          </span>
        </button>
      )}

      {/* Save PDF Only Button */}
      <button
        type="button"
        disabled={isSaving}
        onClick={() => handleSavePdf(false)}
        className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-sm font-bold rounded-xl border border-gray-300 shadow-2xs hover:-translate-y-0.5 transition-all disabled:opacity-60 cursor-pointer"
        title="Save PDF directly to your chosen local folder"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Download className="w-4 h-4 text-blue-600" />}
        <span>Save PDF</span>
      </button>

      {/* Main Print & Save PDF Button */}
      <button
        type="button"
        disabled={isSaving}
        onClick={() => handleSavePdf(true)}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-60 cursor-pointer"
        title="Save PDF to local disk and open print dialog"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
        <span>PRINT & SAVE</span>
      </button>

      {/* Status Feedback Toast */}
      {statusMsg && (
        <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-800 px-3 py-1.5 rounded-xl font-bold text-xs animate-fade-in shadow-xs">
          <Check className="w-3.5 h-3.5 text-green-600" />
          {statusMsg}
        </span>
      )}
    </div>
  );
}
