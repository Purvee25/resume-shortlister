/** Heuristic field extraction from plain resume text. */
import { EDUCATION_LEVELS, type EducationLevel } from "./types";
import { containsPhrase, normalize } from "./text";

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/;
const LINK_RE = /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|github\.com|gitlab\.com|kaggle\.com)\/[^\s,;()<>"']+/gi;

/** Common non-name lines that sit at the top of a resume. */
const HEADER_NOISE = /resume|curriculum vitae|\bcv\b|profile|portfolio|@|http|\+?\d{3}/i;

const EDUCATION_PATTERNS: Array<{ level: EducationLevel; phrases: string[] }> = [
  {
    level: "phd",
    phrases: ["phd", "ph.d", "doctorate", "doctoral", "d.phil"],
  },
  {
    level: "masters",
    phrases: [
      "masters", "master of", "master's", "m.s", "ms in", "msc", "m.sc",
      "m.tech", "mtech", "m.e", "mba", "m.a", "postgraduate",
    ],
  },
  {
    level: "bachelors",
    phrases: [
      "bachelor", "bachelors", "bachelor's", "b.s", "bs in", "bsc", "b.sc",
      "b.tech", "btech", "b.e", "be in", "b.a", "undergraduate",
    ],
  },
  { level: "diploma", phrases: ["diploma", "associate degree", "polytechnic"] },
];

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export function extractEmail(text: string): string | null {
  return text.match(EMAIL_RE)?.[0].toLowerCase() ?? null;
}

export function extractPhone(text: string): string | null {
  return text.match(PHONE_RE)?.[0].trim() ?? null;
}

export function extractLinks(text: string): string[] {
  const matches = text.match(LINK_RE) ?? [];
  return [...new Set(matches.map((link) => link.replace(/[.,;]+$/, "")))].slice(0, 5);
}

/**
 * Takes the first plausible line as the candidate name. Resumes overwhelmingly
 * lead with the name, and anything richer needs an NER model we deliberately avoid.
 */
export function extractName(text: string, fileName: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  for (const line of lines) {
    if (line.length > 60 || HEADER_NOISE.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 5) continue;
    if (!/^[A-Za-z][A-Za-z'.\-\s]+$/.test(line)) continue;
    return line.replace(/\s+/g, " ");
  }

  const fromFile = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\b(resume|cv|final|updated|\d+)\b/gi, "")
    .trim();
  return fromFile.length >= 3 ? fromFile : null;
}

export function extractEducationLevel(text: string): EducationLevel {
  const haystack = normalize(text);
  for (const { level, phrases } of EDUCATION_PATTERNS) {
    if (phrases.some((phrase) => containsPhrase(haystack, phrase))) return level;
  }
  return "none";
}

export function educationRank(level: EducationLevel): number {
  return EDUCATION_LEVELS.indexOf(level);
}

/** Explicit self-reported totals, e.g. "5+ years of experience". */
function statedYears(text: string): number | null {
  const matches = [
    ...text.matchAll(/(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b[^.\n]{0,40}?(?:experience|exp\b)/gi),
    ...text.matchAll(/experience[^.\n]{0,20}?(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)/gi),
  ];
  const values = matches
    .map((match) => Number.parseFloat(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value <= 50);
  return values.length ? Math.max(...values) : null;
}

interface DateRange {
  start: number;
  end: number;
}

/** Months since epoch, so ranges can be merged with plain number comparisons. */
function toMonthIndex(year: number, month: number): number {
  return year * 12 + month;
}

function parseRanges(text: string, now: Date): DateRange[] {
  const nowIndex = toMonthIndex(now.getFullYear(), now.getMonth());
  const ranges: DateRange[] = [];

  const pattern =
    /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*,?\s*)?(\d{4})\s*(?:-|–|—|to|until|through)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*,?\s*)?(present|current|now|\d{4})/gi;

  for (const match of text.matchAll(pattern)) {
    const startMonth = match[1] ? MONTHS[match[1].toLowerCase()] : 0;
    const startYear = Number.parseInt(match[2], 10);
    if (startYear < 1960 || startYear > now.getFullYear()) continue;

    const endToken = match[4].toLowerCase();
    const isOngoing = /present|current|now/.test(endToken);
    const endYear = isOngoing ? now.getFullYear() : Number.parseInt(endToken, 10);
    if (!isOngoing && (endYear < startYear || endYear > now.getFullYear() + 1)) continue;

    const endMonth = isOngoing
      ? now.getMonth()
      : match[3]
        ? MONTHS[match[3].toLowerCase()]
        : 11;

    const start = toMonthIndex(startYear, startMonth);
    const end = Math.min(toMonthIndex(endYear, endMonth), nowIndex);
    if (end > start) ranges.push({ start, end });
  }

  return ranges;
}

/** Union of overlapping ranges, so parallel roles are not double-counted. */
function mergedMonths(ranges: DateRange[]): number {
  if (ranges.length === 0) return 0;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let total = 0;
  let { start, end } = sorted[0];

  for (const range of sorted.slice(1)) {
    if (range.start <= end) {
      end = Math.max(end, range.end);
    } else {
      total += end - start;
      ({ start, end } = range);
    }
  }
  return total + (end - start);
}

/**
 * Years of experience, preferring an explicit claim and falling back to merged
 * employment date ranges. Returns null when the resume gives no usable signal.
 */
export function extractYearsExperience(text: string, now: Date = new Date()): number | null {
  const stated = statedYears(text);
  if (stated !== null) return stated;

  const months = mergedMonths(parseRanges(text, now));
  if (months <= 0) return null;
  return Math.round((months / 12) * 10) / 10;
}

export function findSkills(text: string, skills: string[]): { matched: string[]; missing: string[] } {
  const haystack = normalize(text);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of skills) {
    (containsPhrase(haystack, skill) ? matched : missing).push(skill);
  }
  return { matched, missing };
}
