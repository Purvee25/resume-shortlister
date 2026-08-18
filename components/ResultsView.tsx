"use client";

import { useMemo, useState } from "react";
import { downloadCsv } from "@/lib/csv";
import {
  EDUCATION_LABELS,
  type CandidateResult,
  type Decision,
  type ShortlistResponse,
} from "@/lib/types";

interface Props {
  report: ShortlistResponse;
  onBack: () => void;
}

const DECISION_STYLES: Record<Decision, { chip: string; label: string }> = {
  shortlisted: { chip: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Shortlisted" },
  review: { chip: "bg-amber-50 text-amber-700 border-amber-200", label: "Borderline" },
  rejected: { chip: "bg-red-50 text-red-700 border-red-200", label: "Not a match" },
};

const FILTERS: Array<{ key: Decision | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "review", label: "Borderline" },
  { key: "rejected", label: "Not a match" },
];

function ScoreBar({ value }: { value: number }) {
  const tone = value >= 70 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="h-1.5 w-full rounded-full bg-ink-100" role="presentation">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function CandidateRow({
  result,
  rank,
  anonymised,
}: {
  result: CandidateResult;
  rank: number;
  anonymised: boolean;
}) {
  const [open, setOpen] = useState(false);
  const style = DECISION_STYLES[result.decision];
  const displayName = anonymised
    ? `Candidate #${rank}`
    : (result.name ?? result.fileName);

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="w-8 shrink-0 text-sm tabular-nums text-ink-400">{rank}</span>

        <div className="min-w-48 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink-900">{displayName}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${style.chip}`}>
              {style.label}
            </span>
          </div>
          <div className="mt-0.5 truncate text-xs text-ink-400">
            {anonymised ? "Identity hidden" : (result.email ?? result.fileName)}
          </div>
        </div>

        <div className="w-40 shrink-0">
          <div className="flex items-baseline justify-between text-xs text-ink-500">
            <span>Score</span>
            <span className="font-semibold tabular-nums text-ink-900">{result.score}</span>
          </div>
          <ScoreBar value={result.score} />
        </div>

        <div className="w-28 shrink-0 text-xs text-ink-500">
          {result.yearsExperience === null ? "Exp. unknown" : `${result.yearsExperience} yrs`}
          <span className="block">{EDUCATION_LABELS[result.educationLevel]}</span>
        </div>

        <button
          type="button"
          className="shrink-0 rounded-md border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-50"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          {open ? "Hide" : "Why?"}
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded-lg bg-ink-50 p-3 text-sm">
          <ul className="list-disc space-y-1 pl-5 text-ink-700">
            {result.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-ink-600 sm:grid-cols-5">
            {Object.entries(result.subScores).map(([key, value]) => (
              <div key={key}>
                <dt className="text-ink-400">{key}</dt>
                <dd className="tabular-nums">{Math.round(value * 100)}%</dd>
              </div>
            ))}
          </dl>
          {!anonymised && result.links.length > 0 && (
            <p className="mt-3 break-all text-xs text-ink-500">{result.links.join(" · ")}</p>
          )}
        </div>
      )}
    </li>
  );
}

export default function ResultsView({ report, onBack }: Props) {
  const [filter, setFilter] = useState<Decision | "all">("all");
  const [anonymised, setAnonymised] = useState(false);

  const visible = useMemo(
    () =>
      filter === "all"
        ? report.results
        : report.results.filter((result) => result.decision === filter),
    [report.results, filter],
  );

  return (
    <section className="space-y-4">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">
              {report.criteria.title || "Role"} — shortlist
            </h2>
            <p className="text-sm text-ink-500">
              {report.company.name} · {report.results.length} resumes scored ·{" "}
              {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 no-print">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
            >
              Edit criteria
            </button>
            <button
              type="button"
              onClick={() => downloadCsv(report)}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {(["shortlisted", "review", "rejected"] as const).map((key) => (
            <div key={key} className="rounded-lg border border-ink-200 p-3">
              <div className="text-2xl font-semibold tabular-nums text-ink-900">
                {report.totals[key]}
              </div>
              <div className="text-xs text-ink-500">{DECISION_STYLES[key].label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-4 py-3 no-print">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                className={`rounded-full px-3 py-1 text-sm ${
                  filter === option.key
                    ? "bg-ink-900 text-white"
                    : "text-ink-600 hover:bg-ink-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <input
              type="checkbox"
              className="size-4 accent-brand-600"
              checked={anonymised}
              onChange={(event) => setAnonymised(event.target.checked)}
            />
            Blind review (hide names &amp; contacts)
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-500">
            No candidates in this bucket.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100">
            {visible.map((result) => (
              <CandidateRow
                key={result.id}
                result={result}
                rank={report.results.indexOf(result) + 1}
                anonymised={anonymised}
              />
            ))}
          </ul>
        )}
      </div>

      <p className="px-1 text-xs text-ink-400">
        Scores rank resumes against the criteria you set — they are a triage aid, not a hiring
        decision. Review borderline candidates manually before rejecting anyone.
      </p>
    </section>
  );
}
