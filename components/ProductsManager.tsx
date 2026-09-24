"use client";

import { useState, useTransition } from "react";
import { Product, createProductAction, updateProductAction, deleteProductAction } from "@/actions/products";
import { UnitSelector } from "@/components/InvoiceForm";
import { Plus, Search, Pencil, Trash2, X, Package, Check } from "lucide-react";

const dict = {
  products: { en: "Products", gu: "વસ્તુઓ (પ્રોડક્ટ્સ)" },
  subtitle: {
    en: "Manage product details (HSN, standard unit, GST) for quick 1-click billing.",
    gu: "બિલમાં ઝડપથી સિલેક્ટ કરવા માટે પ્રોડક્ટની વિગતો (HSN, એકમ, GST) સાચવો.",
  },
  addProduct: { en: "Add New Product", gu: "નવી પ્રોડક્ટ ઉમેરો" },
  editProduct: { en: "Edit Product", gu: "પ્રોડક્ટમાં સુધારો કરો" },
  searchPlaceholder: { en: "Search products by name or HSN...", gu: "નામ અથવા HSN થી શોધો..." },
  productName: { en: "Product Name", gu: "વસ્તુનું નામ" },
  productNamePlaceholder: { en: "e.g. Chana Daliya, Sing Dana...", gu: "દા.ત. ચણા દાળિયા, સિંગદાણા..." },
  hsnCode: { en: "HSN / SAC Code", gu: "HSN / SAC કોડ" },
  standardUnit: { en: "Standard Unit", gu: "સામાન્ય એકમ (Unit)" },
  gstPercent: { en: "GST Rate (%)", gu: "GST નો ટકા (%)" },
  noRateNote: {
    en: "💡 No price needed here. Market price/rate is entered when creating each bill.",
    gu: "💡 અહીં ભાવ રાખવાની જરૂર નથી. બિલ બનાવતી વખતે તે દિવસનો ભાવ લખાશે.",
  },
  actions: { en: "Actions", gu: "ક્રિયાઓ" },
  save: { en: "Save Product", gu: "પ્રોડક્ટ સેવ કરો" },
  update: { en: "Update Product", gu: "પ્રોડક્ટ અપડેટ કરો" },
  cancel: { en: "Cancel", gu: "રદ કરો" },
  saving: { en: "Saving...", gu: "સેવ થાય છે..." },
  deleteConfirm: {
    en: "Are you sure you want to delete this product?",
    gu: "શું તમે ખરેખર આ પ્રોડક્ટ ડિલીટ કરવા માંગો છો?",
  },
  noProducts: {
    en: "No products added yet.",
    gu: "હજુ કોઈ પ્રોડક્ટ ઉમેરેલ નથી.",
  },
  noProductsMatch: {
    en: "No products match your search.",
    gu: "આ શોધ મુજબ કોઈ પ્રોડક્ટ મળેલ નથી.",
  },
  totalProducts: { en: "products listed", gu: "પ્રોડક્ટ્સ ઉપલબ્ધ" },
};

type Lang = "en" | "gu";

const GST_RATES = ["0", "5", "12", "18", "28"];

export default function ProductsManager({ initialProducts }: { initialProducts: Product[] }) {
  const [productsList, setProductsList] = useState<Product[]>(initialProducts);
  const [lang, setLang] = useState<Lang>("gu");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [unit, setUnit] = useState("kg");
  const [gst, setGst] = useState("5");

  const [toast, setToast] = useState<string | null>(null);

  const t = (key: keyof typeof dict) => dict[key][lang];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName("");
    setHsnCode("");
    setUnit("kg");
    setGst("5");
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setHsnCode(p.hsnCode || "");
    setUnit(p.defaultUnit || "kg");
    setGst(p.defaultGst || "0");
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert(lang === "gu" ? "વસ્તુનું નામ જરૂરી છે" : "Product name is required");

    startTransition(async () => {
      if (editingProduct) {
        const updated = await updateProductAction(editingProduct.id, {
          name,
          hsnCode,
          defaultUnit: unit,
          defaultGst: gst,
        });
        setProductsList((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)));
        showToast(lang === "gu" ? "પ્રોડક્ટ અપડેટ થઈ ગઈ!" : "Product updated successfully!");
      } else {
        const created = await createProductAction({
          name,
          hsnCode,
          defaultUnit: unit,
          defaultGst: gst,
        });
        setProductsList((prev) => [created, ...prev]);
        showToast(lang === "gu" ? "નવી પ્રોડક્ટ સેવ થઈ ગઈ!" : "Product created successfully!");
      }
      setModalOpen(false);
    });
  };

  const handleDelete = (id: string, pName: string) => {
    if (!confirm(`${t("deleteConfirm")} (${pName})`)) return;

    startTransition(async () => {
      await deleteProductAction(id);
      setProductsList((prev) => prev.filter((p) => p.id !== id));
      showToast(lang === "gu" ? "પ્રોડક્ટ ડિલીટ થઈ ગઈ!" : "Product deleted!");
    });
  };

  const filtered = productsList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.hsnCode && p.hsnCode.toLowerCase().includes(q));
  });

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t("products")}</h1>
            {toast && (
              <span className="flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1 rounded-lg font-bold text-xs animate-fade-in">
                <Check className="w-3.5 h-3.5" />
                {toast}
              </span>
            )}
          </div>
          <p className="text-base text-gray-500 mt-1 font-medium">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 text-xs font-bold shadow-2xs">
            <button
              type="button"
              onClick={() => setLang("gu")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                lang === "gu" ? "bg-blue-600 text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              ગુજરાતી
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                lang === "en" ? "bg-blue-600 text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              English
            </button>
          </div>

          {/* Add Product Button */}
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white text-base font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Plus className="w-5 h-5" />
            {t("addProduct")}
          </button>
        </div>
      </div>

      {/* ── Search & Count Bar ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
        <span className="text-sm font-bold text-gray-500 shrink-0">
          {filtered.length} {t("totalProducts")}
        </span>
      </div>

      {/* ── Products Table ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400 text-base font-medium space-y-3">
            <Package className="w-12 h-12 mx-auto text-gray-300" />
            <p>{productsList.length === 0 ? t("noProducts") : t("noProductsMatch")}</p>
            {productsList.length === 0 && (
              <button
                type="button"
                onClick={openAddModal}
                className="text-blue-600 font-bold hover:underline cursor-pointer"
              >
                + {t("addProduct")} →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Header */}
            <div className="grid grid-cols-[1fr_130px_130px_110px_100px] gap-4 px-6 py-3.5 bg-gray-50/70 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <span>{t("productName")}</span>
              <span>{t("hsnCode")}</span>
              <span>{t("standardUnit")}</span>
              <span className="text-center">{t("gstPercent")}</span>
              <span className="text-right">{t("actions")}</span>
            </div>

            {/* Rows */}
            {filtered.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_130px_130px_110px_100px] gap-4 px-6 py-4 items-center hover:bg-blue-50/40 transition-colors group"
              >
                <div>
                  <p className="text-base font-bold text-gray-900">{p.name}</p>
                </div>
                <div className="font-mono text-sm font-medium text-gray-600">
                  {p.hsnCode || "—"}
                </div>
                <div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">
                    {p.defaultUnit || "kg"}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-xs font-black px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">
                    {p.defaultGst || "0"}%
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(p)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                    title={t("editProduct")}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.name)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add / Edit Product Modal ────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                {editingProduct ? t("editProduct") : t("addProduct")}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t("productName")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("productNamePlaceholder")}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t("hsnCode")}
                  </label>
                  <input
                    type="text"
                    value={hsnCode}
                    onChange={(e) => setHsnCode(e.target.value)}
                    placeholder="e.g. 0713"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {t("standardUnit")}
                  </label>
                  <UnitSelector
                    value={unit}
                    onChange={(val) => setUnit(val)}
                    lang={lang}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t("gstPercent")}
                </label>
                <select
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                >
                  {GST_RATES.map((g) => (
                    <option key={g} value={g}>
                      {g}% GST
                    </option>
                  ))}
                </select>
              </div>

              {/* Note about price */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed font-medium">
                {t("noRateNote")}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isPending}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? t("saving") : editingProduct ? t("update") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
