"use client";

import { useEffect, useState } from "react";
import CompanyForm from "@/components/CompanyForm";
import CriteriaForm from "@/components/CriteriaForm";
import ResultsView from "@/components/ResultsView";
import UploadZone from "@/components/UploadZone";
import { DEFAULT_COMPANY, DEFAULT_CRITERIA } from "@/lib/defaults";
import { scoreResumes } from "@/lib/score";
import type { ExtractedResume } from "@/lib/textract";
import type { CompanyProfile, JobCriteria, ShortlistResponse } from "@/lib/types";

const STORAGE_KEY = "resume-shortlister:setup";

interface StoredSetup {
  company: CompanyProfile;
  criteria: JobCriteria;
}

export default function HomePage() {
  const [company, setCompany] = useState<CompanyProfile>(DEFAULT_COMPANY);
  const [criteria, setCriteria] = useState<JobCriteria>(DEFAULT_CRITERIA);
  const [resumes, setResumes] = useState<ExtractedResume[]>([]);
  const [report, setReport] = useState<ShortlistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Restore after mount so server and client render the same initial markup.
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as Partial<StoredSetup>;
      if (stored.company) setCompany({ ...DEFAULT_COMPANY, ...stored.company });
      if (stored.criteria) setCriteria({ ...DEFAULT_CRITERIA, ...stored.criteria });
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ company, criteria }));
  }, [company, criteria]);

  const missing: string[] = [];
  if (!company.name.trim()) missing.push("company name");
  if (!criteria.title.trim()) missing.push("role title");
  if (resumes.length === 0) missing.push("at least one resume");

  const runShortlist = async () => {
    setRunning(true);
    setError(null);
    try {
      if (criteria.reviewThreshold > criteria.shortlistThreshold) {
        throw new Error("Review threshold cannot be higher than the shortlist threshold.");
      }

      // Scoring is a pure function over already-extracted text, so it runs in the
      // browser. Nothing leaves the machine, and the app deploys as a static site.
      // The /api/shortlist route stays available for programmatic callers.
      const data = scoreResumes(company, criteria, resumes);
      setReport(data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
          {company.name.trim() || "Your company"}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink-900">
          Automated resume shortlisting
        </h1>
        <p className="mt-2 max-w-2xl text-ink-500">
          Enter your company and role criteria, drop in a batch of resumes, and get a ranked
          shortlist with a written reason behind every score.
        </p>
      </header>

      {report ? (
        <ResultsView report={report} onBack={() => setReport(null)} />
      ) : (
        <div className="space-y-6">
          <CompanyForm value={company} onChange={setCompany} />
          <CriteriaForm value={criteria} onChange={setCriteria} />
          <UploadZone resumes={resumes} onChange={setResumes} />

          {error && (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white/95 p-4 shadow-sm backdrop-blur">
            <p className="text-sm text-ink-500">
              {missing.length > 0
                ? `Still needed: ${missing.join(", ")}.`
                : `Ready to score ${resumes.length} resume${resumes.length === 1 ? "" : "s"}.`}
            </p>
            <button
              type="button"
              disabled={missing.length > 0 || running}
              onClick={() => void runShortlist()}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-300"
            >
              {running ? "Scoring…" : "Run shortlist"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
