import type { ShortlistResponse } from "./types";

const HEADERS = [
  "Rank",
  "Score",
  "Decision",
  "Name",
  "Email",
  "Phone",
  "Years experience",
  "Education",
  "Matched required",
  "Missing required",
  "Matched preferred",
  "Links",
  "File",
] as const;

/** RFC 4180 quoting; a leading = + - @ is prefixed to defuse spreadsheet formula injection. */
function cell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(report: ShortlistResponse): string {
  const rows = report.results.map((result, index) =>
    [
      index + 1,
      result.score,
      result.decision,
      result.name ?? "",
      result.email ?? "",
      result.phone ?? "",
      result.yearsExperience ?? "",
      result.educationLevel,
      result.matchedRequired.join("; "),
      result.missingRequired.join("; "),
      result.matchedPreferred.join("; "),
      result.links.join("; "),
      result.fileName,
    ]
      .map(cell)
      .join(","),
  );

  return [HEADERS.map(cell).join(","), ...rows].join("\r\n");
}

export function downloadCsv(report: ShortlistResponse): void {
  const slug = `${report.company.name || "shortlist"}-${report.criteria.title || "role"}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const blob = new Blob(["﻿", toCsv(report)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slug}-${report.generatedAt.slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
