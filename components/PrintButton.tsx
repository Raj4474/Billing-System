"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-bold rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
      title="Print or Save as PDF"
    >
      <Printer className="w-5 h-5" />
      PRINT / PDF
    </button>
  );
}
