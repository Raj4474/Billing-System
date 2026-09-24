"use client";

import { useState, useEffect } from "react";
import { getSettingsAction, saveSettingsAction } from "@/actions/invoices";
import {
  pickSaveDirectory,
  getSavedDirectoryName,
  clearSavedDirectoryHandle,
  isDirectoryPickerSupported,
} from "@/lib/pdfStorage";
import { FolderOpen, Trash2, Check, RefreshCw } from "lucide-react";

type Settings = Awaited<ReturnType<typeof getSettingsAction>>;

export default function SettingsForm({ initial }: { initial: Settings }) {
  const [form, setForm] = useState({
    companyName: initial?.companyName ?? "Rupala Enterprise",
    address: initial?.address ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    gstin: initial?.gstin ?? "",
    msmeNo: initial?.msmeNo ?? "",
    bankName: initial?.bankName ?? "",
    bankAccount: initial?.bankAccount ?? "",
    ifscCode: initial?.ifscCode ?? "",
    termsAndConditions: initial?.termsAndConditions ?? "",
    invoicePrefix: initial?.invoicePrefix ?? "RE",
  });

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [folderMsg, setFolderMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsSupported(isDirectoryPickerSupported());
    const savedName = getSavedDirectoryName();
    if (savedName) setFolderName(savedName);
  }, []);

  async function handleSelectFolder() {
    const res = await pickSaveDirectory();
    if (res.name) {
      setFolderName(res.name);
      setFolderMsg(`સેવ ફોલ્ડર સફળતાપૂર્વક સેટ થયું: ${res.name}`);
      setTimeout(() => setFolderMsg(null), 4000);
    }
  }

  async function handleResetFolder() {
    await clearSavedDirectoryHandle();
    setFolderName(null);
    setFolderMsg("ફોલ્ડર રીસેટ થયું");
    setTimeout(() => setFolderMsg(null), 3000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await saveSettingsAction(form);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  function field(label: string, key: keyof typeof form, opts?: { placeholder?: string; type?: string }) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <input
          type={opts?.type ?? "text"}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className={inputCls}
          placeholder={opts?.placeholder}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Company Information</h2>
        <div className="grid grid-cols-2 gap-4">
          {field("Company Name", "companyName", { placeholder: "Rupala Enterprise" })}
          {field("GSTIN", "gstin", { placeholder: "24ATKPR5908H1ZE" })}
          {field("MSME No.", "msmeNo", { placeholder: "UDYAM-GJ-XX-XXXXXXX" })}
          {field("Phone", "phone", { placeholder: "9714304141" })}
          {field("Email", "email", { placeholder: "rupalaenterprise@gmail.com", type: "email" })}
          {field("Invoice Prefix", "invoicePrefix", { placeholder: "RE" })}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              rows={3}
              className={inputCls + " resize-none"}
              placeholder="Full business address…"
            />
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Bank Details</h2>
        <div className="grid grid-cols-3 gap-4">
          {field("Bank Name", "bankName", { placeholder: "HDFC BANK LTD" })}
          {field("Account No.", "bankAccount", { placeholder: "50200081678969" })}
          {field("RTGS/IFSC Code", "ifscCode", { placeholder: "HDFC0003101" })}
        </div>
      </div>

      {/* Terms */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Terms &amp; Conditions</h2>
        <textarea
          value={form.termsAndConditions}
          onChange={(e) => setForm((f) => ({ ...f, termsAndConditions: e.target.value }))}
          rows={5}
          className={inputCls + " resize-none"}
          placeholder="Enter your standard T&C…"
        />
        <p className="text-xs text-gray-400 mt-1">Leave blank to use default terms.</p>
      </div>

      {/* PDF Save Location */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800 text-base">
              PDF Save Location (કમ્પ્યુટરમાં બિલ સેવ કરવાનું ફોલ્ડર)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select a folder once on your computer (e.g. Desktop &gt; Bills). All future bill PDFs will be saved directly into this folder with proper bill numbers and no duplicate copies.
            </p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Current Folder / હાલનું ફોલ્ડર:</div>
              <div className="text-sm font-bold text-gray-900">
                {folderName ? (
                  <span className="text-blue-700 flex items-center gap-1.5">
                    📁 {folderName} <span className="text-xs font-normal text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">Active</span>
                  </span>
                ) : (
                  <span className="text-gray-400 font-normal">કોઈ ફોલ્ડર પસંદ કરેલ નથી (Downloads ફોલ્ડરમાં ડાઉનલોડ થશે)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectFolder}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{folderName ? "ફોલ્ડર બદલો (Change)" : "ફોલ્ડર પસંદ કરો (Select Folder)"}</span>
            </button>
            {folderName && (
              <button
                type="button"
                onClick={handleResetFolder}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                title="Reset folder setting"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {folderMsg && (
          <div className="flex items-center gap-1.5 text-xs text-green-700 font-bold bg-green-50 p-2.5 rounded-xl border border-green-200">
            <Check className="w-4 h-4" />
            <span>{folderMsg}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pb-8">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">✓ Saved!</span>
        )}
      </div>
    </form>
  );
}
