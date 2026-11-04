/**
 * Copies the pdf.js worker bundle into public/ so the browser can load it from a
 * same-origin URL. Running pdf.js without a worker blocks the main thread on
 * large PDFs, and a CDN worker would break offline/CSP-restricted deployments.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const CANDIDATES = [
  "pdfjs-dist/build/pdf.worker.min.mjs",
  "pdfjs-dist/build/pdf.worker.mjs",
];

async function main() {
  let source = null;
  for (const candidate of CANDIDATES) {
    try {
      source = require.resolve(candidate);
      break;
    } catch {
      // Try the next filename; pdfjs-dist renames this file between majors.
    }
  }

  if (!source) {
    console.warn("[copy-pdf-worker] pdfjs-dist worker not found; skipping.");
    return;
  }

  const publicDir = path.join(process.cwd(), "public");
  if (!existsSync(publicDir)) {
    await mkdir(publicDir, { recursive: true });
  }

  const target = path.join(publicDir, "pdf.worker.min.mjs");
  await copyFile(source, target);
  console.log(`[copy-pdf-worker] ${path.basename(source)} -> public/pdf.worker.min.mjs`);
}

/**
 * OCR assets for scanned resumes. Self-hosted for the same reason as the pdf.js
 * worker: Tesseract.js otherwise fetches its worker, WASM core and language
 * model from a CDN at runtime.
 */
const TESSERACT_ASSETS = [
  ["tesseract.js/dist/worker.min.js", "tesseract/worker.min.js"],
  ["tesseract.js-core/tesseract-core-lstm.wasm.js", "tesseract/core/tesseract-core-lstm.wasm.js"],
  ["tesseract.js-core/tesseract-core-simd-lstm.wasm.js", "tesseract/core/tesseract-core-simd-lstm.wasm.js"],
  ["@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz", "tesseract/lang/eng.traineddata.gz"],
];

async function copyTesseractAssets() {
  for (const [specifier, relativeTarget] of TESSERACT_ASSETS) {
    let source;
    try {
      source = require.resolve(specifier);
    } catch {
      console.warn(`[copy-assets] ${specifier} not found; OCR will be unavailable.`);
      continue;
    }
    const target = path.join(process.cwd(), "public", relativeTarget);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  console.log("[copy-assets] tesseract worker, core and eng model -> public/tesseract/");
}

main()
  .then(copyTesseractAssets)
  .catch((error) => {
    console.error("[copy-assets] failed:", error);
    process.exitCode = 1;
  });
