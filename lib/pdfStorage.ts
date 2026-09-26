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

export async function generateInvoicePdfBlob(elementId = "invoice-print"): Promise<Blob> {
  const element = document.getElementById(elementId) as HTMLElement | null;
  if (!element) throw new Error("Invoice element not found");

  // Save original zoom and styles on live element
  const prevZoom = element.style.zoom;
  const prevTransform = element.style.transform;
  const prevBoxShadow = element.style.boxShadow;

  try {
    // Reset live element zoom to 1 so getComputedStyle reads unscaled natural font metrics & layout
    element.style.zoom = "1";
    element.style.transform = "none";
    element.style.boxShadow = "none";

    const canvas = await html2canvas(element, {
      scale: 3, // 3x resolution = ~300 DPI print-shop clarity
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      ignoreElements: (el) => {
        return (
          el.classList.contains("print:hidden") ||
          el.classList.contains("print-hidden") ||
          el.tagName === "BUTTON"
        );
      },
      onclone: (clonedDoc) => {
        // Strip out any interactive buttons, hover action clusters, or toolbar controls
        clonedDoc
          .querySelectorAll("button, .print\\:hidden, .print-hidden")
          .forEach((el) => el.remove());

        const clonedEl = clonedDoc.getElementById(elementId);
        if (clonedEl) {
          clonedEl.style.zoom = "1";
          clonedEl.style.transform = "none";
          clonedEl.style.boxShadow = "none";
          clonedEl.style.width = "794px";
          clonedEl.style.maxWidth = "794px";
          clonedEl.style.minWidth = "794px";
          clonedEl.style.margin = "0 auto";
          clonedEl.style.border = "1.5px solid #000000";
        }
      },
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    // Match exact @page { margin: 6mm 6mm } standard print margins
    const marginMm = 6;
    const pageWidthMm = 210;
    const targetWidthMm = pageWidthMm - marginMm * 2; // 198mm

    const imgProps = pdf.getImageProperties(imgData);
    const targetHeightMm = (imgProps.height * targetWidthMm) / imgProps.width;

    pdf.addImage(
      imgData,
      "PNG",
      marginMm,
      marginMm,
      targetWidthMm,
      targetHeightMm,
      undefined,
      "FAST"
    );

    return pdf.output("blob");
  } finally {
    // Restore original zoom and styles on screen
    element.style.zoom = prevZoom;
    element.style.transform = prevTransform;
    element.style.boxShadow = prevBoxShadow;
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

export async function saveInvoicePdf({
  invoiceNumber,
  customerName,
  elementId = "invoice-print",
  promptIfNoDir = true,
}: {
  invoiceNumber: string;
  customerName?: string;
  elementId?: string;
  promptIfNoDir?: boolean;
}): Promise<{
  success: boolean;
  folderName?: string;
  filename: string;
  directDownload?: boolean;
  cancelled?: boolean;
}> {
  const filename = getCleanInvoiceFilename(invoiceNumber, customerName);
  const blob = await generateInvoicePdfBlob(elementId);

  const supported = isDirectoryPickerSupported();
  let dirHandle = await getSavedDirectoryHandle();

  if (supported && !dirHandle && promptIfNoDir) {
    const pickResult = await pickSaveDirectory();
    if (pickResult.cancelled) {
      // User cancelled picker, fall back to browser download
    } else if (pickResult.name) {
      dirHandle = await getSavedDirectoryHandle();
    }
  }

  if (dirHandle) {
    try {
      const hasPerm = await verifyHandlePermission(dirHandle, true);
      if (hasPerm) {
        // Create/overwrite exact filename to eliminate duplicate copies on disk
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
      console.warn("Direct folder write failed, falling back to download:", err);
    }
  }

  // Fallback: direct browser download
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
