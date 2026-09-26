"use client";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const DB_NAME = "rupala_enterprise_pdf_db";
const STORE_NAME = "directory_handles";
const KEY = "saved_bills_directory";
export const STORAGE_FOLDER_NAME_KEY = "rupala_pdf_folder_name";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB not available"));
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getSavedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setSavedDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(handle, KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearSavedDirectoryHandle(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const req = tx.objectStore(STORE_NAME).delete(KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    localStorage.removeItem(STORAGE_FOLDER_NAME_KEY);
  } catch {
    // Ignore error
  }
}

export function isDirectoryPickerSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickSaveDirectory(): Promise<{
  supported: boolean;
  name?: string;
  cancelled?: boolean;
}> {
  if (!isDirectoryPickerSupported()) {
    return { supported: false };
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: "readwrite",
      startIn: "documents",
    });

    if (handle) {
      await setSavedDirectoryHandle(handle);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_FOLDER_NAME_KEY, handle.name);
      }
      return { supported: true, name: handle.name };
    }
    return { supported: true, cancelled: true };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { supported: true, cancelled: true };
    }
    console.error("Error picking directory:", err);
    return { supported: true, cancelled: true };
  }
}

export function getSavedDirectoryName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_FOLDER_NAME_KEY);
}

export async function verifyHandlePermission(
  handle: FileSystemDirectoryHandle,
  readWrite = true
): Promise<boolean> {
  try {
    const options = { mode: readWrite ? "readwrite" : "read" };
    if ((await (handle as any).queryPermission(options)) === "granted") {
      return true;
    }
    if ((await (handle as any).requestPermission(options)) === "granted") {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Generates a PDF blob from the invoice element.
 *
 * Uses an isolated off-screen 794px-wide container (A4 width at 96 dpi) so
 * the canvas render matches the print layout exactly. Scale 4x ≈ 384 DPI.
 * Existing files in the destination folder are OVERWRITTEN (no duplicates).
 */
export async function generateInvoicePdfBlob(elementId = "invoice-print"): Promise<Blob> {
  const element = document.getElementById(elementId) as HTMLElement | null;
  if (!element) throw new Error("Invoice element not found");

  // ── Create an isolated, fixed off-screen 794px-wide rendering container ──
  // This avoids any influence from the surrounding flex layout, zoom, or
  // viewport-dependent widths on the canvas output.
  const offscreen = document.createElement("div");
  offscreen.style.cssText = [
    "position:fixed",
    "top:-99999px",
    "left:0",
    "width:794px",
    "min-width:794px",
    "max-width:794px",
    "background:#ffffff",
    "overflow:visible",
    "zoom:1",
    "transform:none",
    "padding:0",
    "margin:0",
  ].join(";");
  document.body.appendChild(offscreen);

  try {
    // Deep-clone the invoice element into the offscreen container
    const clone = element.cloneNode(true) as HTMLElement;

    // Override any screen-specific inline styles that were set by the UI
    clone.style.zoom = "1";
    clone.style.transform = "none";
    clone.style.boxShadow = "none";
    (clone.style as any).webkitBoxShadow = "none";
    clone.style.width = "794px";
    clone.style.minWidth = "794px";
    clone.style.maxWidth = "794px";
    clone.style.margin = "0";
    clone.style.padding = "0";
    clone.style.border = "1.5px solid #000000";
    clone.style.backgroundColor = "#ffffff";
    clone.style.overflow = "visible";

    // Remove all interactive / screen-only elements from the clone
    // (action clusters, hover pencil buttons, etc.)
    clone.querySelectorAll("button").forEach((el) => el.remove());
    clone.querySelectorAll("[class*='print:hidden']").forEach((el) => el.remove());
    clone.querySelectorAll(".print-hidden").forEach((el) => el.remove());

    offscreen.appendChild(clone);

    const canvas = await html2canvas(clone, {
      scale: 4,           // 4× → ~384 DPI — very sharp on A4
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      // Render from (0,0) of the offscreen container — no scroll offset needed
      scrollX: 0,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // Match the @page { margin: 6mm 6mm } from globals.css
    const marginMm = 6;
    const pageWidthMm = 210;
    const usableWidthMm = pageWidthMm - marginMm * 2; // 198 mm

    const imgProps = pdf.getImageProperties(imgData);
    const usableHeightMm = (imgProps.height * usableWidthMm) / imgProps.width;

    pdf.addImage(imgData, "PNG", marginMm, marginMm, usableWidthMm, usableHeightMm, undefined, "FAST");

    return pdf.output("blob");
  } finally {
    // Always remove the offscreen container
    if (offscreen.parentNode) {
      document.body.removeChild(offscreen);
    }
  }
}

export function getCleanInvoiceFilename(invoiceNumber: string, customerName?: string): string {
  const cleanInv = (invoiceNumber || "INVOICE").trim().replace(/[/\\?%*:|"<>]/g, "_");
  const cleanCust = (customerName || "")
    .trim()
    .replace(/[^a-zA-Z0-9_\u0A80-\u0AFF-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 35);

  return cleanCust ? `${cleanInv}_${cleanCust}.pdf` : `${cleanInv}.pdf`;
}

/**
 * Saves the invoice PDF to the user's pre-selected folder using the
 * File System Access API (overwrites existing file — no duplicates).
 *
 * If no folder is configured and promptIfNoDir=true, the user is prompted to
 * pick one. If promptIfNoDir=false and no folder is set, the function falls
 * back to a browser download (or skips if skipFallback=true).
 */
export async function saveInvoicePdf({
  invoiceNumber,
  customerName,
  elementId = "invoice-print",
  promptIfNoDir = true,
  skipFallback = false,
}: {
  invoiceNumber: string;
  customerName?: string;
  elementId?: string;
  promptIfNoDir?: boolean;
  /** When true, skips the browser-download fallback if no folder is set. */
  skipFallback?: boolean;
}): Promise<{
  success: boolean;
  folderName?: string;
  filename: string;
  directDownload?: boolean;
  cancelled?: boolean;
  skipped?: boolean;
}> {
  const filename = getCleanInvoiceFilename(invoiceNumber, customerName);

  const supported = isDirectoryPickerSupported();
  let dirHandle = await getSavedDirectoryHandle();

  if (supported && !dirHandle && promptIfNoDir) {
    const pickResult = await pickSaveDirectory();
    if (pickResult.name) {
      dirHandle = await getSavedDirectoryHandle();
    }
    // If cancelled → dirHandle stays null → fallback below
  }

  if (dirHandle) {
    try {
      const hasPerm = await verifyHandlePermission(dirHandle, true);
      if (hasPerm) {
        // Generate the blob only if we have a valid folder handle
        const blob = await generateInvoicePdfBlob(elementId);

        // getFileHandle({ create: true }) → creates or GETS the existing file handle.
        // createWritable() defaults to keepExistingData: false → TRUNCATES the file.
        // Result: existing files are silently overwritten — no "(1)" or "copy" suffixes.
        const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
        const writable = await (fileHandle as any).createWritable();
        await writable.write(blob);
        await writable.close();

        return {
          success: true,
          folderName: dirHandle.name,
          filename,
        };
      }
    } catch (err) {
      console.warn("Direct folder write failed, falling back:", err);
    }
  }

  // ── No folder / no permission ──
  if (skipFallback) {
    // Caller does not want a browser download — just report that save was skipped
    return { success: false, filename, skipped: true };
  }

  // Browser download fallback (only when user explicitly requests Save PDF
  // without a configured folder). Note: the browser may append "(1)" to avoid
  // overwriting existing downloads. This is a browser behaviour we cannot
  // override without the File System Access API.
  const blob = await generateInvoicePdfBlob(elementId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    success: true,
    filename,
    directDownload: true,
  };
}
