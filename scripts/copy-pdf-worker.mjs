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

main().catch((error) => {
  console.error("[copy-pdf-worker] failed:", error);
  process.exitCode = 1;
});
