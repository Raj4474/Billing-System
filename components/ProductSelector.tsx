"use client";

import { useState, useEffect } from "react";
import { Undo2 } from "lucide-react";

export type CatalogProduct = {
  id: string;
  name: string;
  hsnCode?: string | null;
  defaultUnit?: string | null;
  defaultGst?: string | null;
};

interface ProductSelectorProps {
  value: string;
  products: CatalogProduct[];
  onSelectProduct: (product: {
    name: string;
    hsnCode: string;
    unit: string;
    gstPercent: string;
  }) => void;
  onChangeCustomName: (name: string) => void;
  lang?: "en" | "gu";
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ProductSelector({
  value,
  products,
  onSelectProduct,
  onChangeCustomName,
  lang = "en",
  className = "",
  placeholder,
  autoFocus = false,
}: ProductSelectorProps) {
  // Check if current value matches an existing product in the catalog
  const matchingProduct = products.find(
    (p) => p.name.trim().toLowerCase() === (value || "").trim().toLowerCase()
  );

  // If value is non-empty and not in catalog, start in custom mode
  const [customMode, setCustomMode] = useState<boolean>(() => {
    return !matchingProduct && Boolean(value && value.trim());
  });

  // Only auto-switch out of custom mode if value externally changed to match a catalog product
  useEffect(() => {
    if (value && value.trim()) {
      const match = products.find(
        (p) => p.name.trim().toLowerCase() === value.trim().toLowerCase()
      );
      if (match) {
        setCustomMode(false);
      }
    }
  }, [value, products]);

  if (customMode) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => onChangeCustomName(e.target.value)}
          placeholder={
            placeholder ||
            (lang === "gu" ? "વસ્તુનું નામ લખો..." : "Type custom product name...")
          }
          className={`${className} flex-1`}
          autoFocus={autoFocus || true}
          required
        />
        <button
          type="button"
          onClick={() => {
            setCustomMode(false);
            onChangeCustomName("");
          }}
          className="shrink-0 px-2 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
          title={lang === "gu" ? "લિસ્ટમાંથી પસંદ કરો" : "Select from catalog list"}
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span className="text-[11px]">{lang === "gu" ? "લિસ્ટ" : "List"}</span>
        </button>
      </div>
    );
  }

  return (
    <select
      value={matchingProduct ? matchingProduct.id : ""}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "__other__") {
          setCustomMode(true);
          onChangeCustomName("");
        } else if (val === "") {
          onChangeCustomName("");
        } else {
          const selected = products.find((p) => p.id === val);
          if (selected) {
            // Clean up GST string (e.g. "18.00" -> "18", "5.00" -> "5")
            const numGst = parseFloat(selected.defaultGst || "0");
            const cleanGst = isNaN(numGst) ? "0" : String(numGst);

            setCustomMode(false);
            onSelectProduct({
              name: selected.name,
              hsnCode: selected.hsnCode || "",
              unit: selected.defaultUnit || "kg",
              gstPercent: cleanGst,
            });
          }
        }
      }}
      className={className}
    >
      <option value="">
        {lang === "gu" ? "-- વસ્તુ પસંદ કરો --" : "-- Select Product --"}
      </option>
      {products.map((p) => {
        const numGst = parseFloat(p.defaultGst || "0");
        const cleanGst = isNaN(numGst) ? "0" : String(numGst);
        const meta = [
          p.hsnCode ? `HSN: ${p.hsnCode}` : "",
          p.defaultGst ? `${cleanGst}% GST` : "",
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <option key={p.id} value={p.id}>
            {p.name} {meta ? `(${meta})` : ""}
          </option>
        );
      })}
      <option value="__other__" className="font-bold text-blue-700">
        {lang === "gu"
          ? "+ અન્ય (Other - નવી વસ્તુ લખવા માટે)"
          : "+ Other (Type Custom Item)"}
      </option>
    </select>
  );
}
