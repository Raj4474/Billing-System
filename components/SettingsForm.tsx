"use client";

import { useState } from "react";
import { getSettingsAction, saveSettingsAction } from "@/actions/invoices";

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
