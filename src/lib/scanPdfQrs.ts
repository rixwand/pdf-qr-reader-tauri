import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import {
  prepareZXingModule,
  readBarcodes,
  type ReadResult,
} from "zxing-wasm/reader";
import zxingReaderWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const zxingReady = prepareZXingModule({
  fireImmediately: true,
  overrides: {
    locateFile: (path: string) =>
      path.endsWith(".wasm") ? zxingReaderWasmUrl : path,
  },
});

export interface QrCodeResult {
  pageNumber: number;
  text: string;
  format: string;
}

export interface ScanPdfQrsProgress {
  pageNumber: number;
  pageCount: number;
  qrCodeCount: number;
}

export interface ScanPdfQrsOptions {
  /** PDF rendering scale. Higher values improve detection of small codes at the cost of memory and time. */
  scale?: number;
  onProgress?: (progress: ScanPdfQrsProgress) => void;
  signal?: AbortSignal;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("QR scan was cancelled.", "AbortError");
  }
}

function toPdfData(input: Blob | ArrayBuffer | Uint8Array) {
  if (input instanceof Blob) {
    return input.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  }

  return Promise.resolve(
    input instanceof Uint8Array ? new Uint8Array(input) : new Uint8Array(input),
  );
}

function toQrCodeResult(pageNumber: number, result: ReadResult): QrCodeResult {
  return {
    pageNumber,
    text: result.text,
    format: result.format,
  };
}

/**
 * Renders every page of a PDF in the browser and decodes every QR code found.
 *
 * This helper is intended for the Tauri WebView: PDF.js renders pages to a
 * canvas and the browser-compatible ZXing WebAssembly reader analyzes pixels.
 */
export async function scanPdfQrs(
  input: Blob | ArrayBuffer | Uint8Array,
  { scale = 3, onProgress, signal }: ScanPdfQrsOptions = {},
): Promise<QrCodeResult[]> {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError("The PDF render scale must be greater than zero.");
  }

  throwIfAborted(signal);
  await zxingReady;

  const loadingTask = getDocument({ data: await toPdfData(input) });
  const pdf = await loadingTask.promise;
  const qrCodes: QrCodeResult[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      throwIfAborted(signal);

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        throw new Error("Unable to create a canvas context for PDF rendering.");
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      try {
        await page.render({ canvas, viewport }).promise;
        throwIfAborted(signal);

        const imageData = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const pageResults = await readBarcodes(imageData, {
          formats: ["QRCode"],
          maxNumberOfSymbols: 0,
          tryHarder: true,
          tryInvert: true,
          tryRotate: true,
        });

        const validCodes = pageResults
          .filter((result) => result.isValid && result.text.length > 0)
          .map((result) => toQrCodeResult(pageNumber, result));

        qrCodes.push(...validCodes);
        onProgress?.({
          pageNumber,
          pageCount: pdf.numPages,
          qrCodeCount: validCodes.length,
        });
      } finally {
        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  } finally {
    await pdf.cleanup();
    await loadingTask.destroy();
  }

  return qrCodes;
}
