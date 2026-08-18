"use client";

import SkillTagInput from "./SkillTagInput";
import { ROLE_PRESETS } from "@/lib/defaults";
import {
  EDUCATION_LABELS,
  EDUCATION_LEVELS,
  WORK_MODES,
  type EducationLevel,
  type JobCriteria,
  type WorkMode,
  type Weights,
} from "@/lib/types";

interface Props {
  value: JobCriteria;
  onChange: (criteria: JobCriteria) => void;
}

const WEIGHT_LABELS: Array<{ key: keyof Weights; label: string; help: string }> = [
  { key: "requiredSkills", label: "Required skills", help: "Share of must-have skills present" },
  { key: "preferredSkills", label: "Preferred skills", help: "Share of nice-to-have skills present" },
  { key: "experience", label: "Experience", help: "Years detected vs the minimum you set" },
  { key: "education", label: "Education", help: "Highest degree vs the minimum you set" },
  { key: "jdSimilarity", label: "JD similarity", help: "TF-IDF overlap with the job description" },
];

export default function CriteriaForm({ value, onChange }: Props) {
  const set = <K extends keyof JobCriteria>(key: K, next: JobCriteria[K]) =>
    onChange({ ...value, [key]: next });

  const setWeight = (key: keyof Weights, next: number) =>
    onChange({ ...value, weights: { ...value.weights, [key]: next } });

  const applyPreset = (label: string) => {
    const preset = ROLE_PRESETS.find((item) => item.label === label);
    if (!preset) return;
    onChange({
      ...value,
      title: value.title.trim() || preset.label,
      requiredSkills: preset.requiredSkills,
      preferredSkills: preset.preferredSkills,
      minExperienceYears: preset.minExperienceYears,
      idealExperienceYears: preset.idealExperienceYears,
    });
  };

  const weightTotal = Object.values(value.weights).reduce((sum, weight) => sum + weight, 0);

  return (
    <section className="card p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Role &amp; shortlisting criteria</h2>
          <p className="text-sm text-ink-500">
            Every candidate is scored against exactly these rules.
          </p>
        </div>
        <div>
          <label htmlFor="preset" className="label-text">
            Start from a preset
          </label>
          <select
            id="preset"
            className="field w-56"
            defaultValue=""
            onChange={(event) => {
              applyPreset(event.target.value);
              event.target.value = "";
            }}
          >
            <option value="" disabled>
              Choose a role…
            </option>
            {ROLE_PRESETS.map((preset) => (
              <option key={preset.label} value={preset.label}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="role-title" className="label-text">
            Role title <span className="text-red-500">*</span>
          </label>
          <input
            id="role-title"
            className="field"
            value={value.title}
            placeholder="Machine Learning Engineer"
            onChange={(event) => set("title", event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="role-department" className="label-text">
            Department
          </label>
          <input
            id="role-department"
            className="field"
            value={value.department ?? ""}
            placeholder="Data Science"
            onChange={(event) => set("department", event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="role-location" className="label-text">
            Job location
          </label>
          <input
            id="role-location"
            className="field"
            value={value.location ?? ""}
            placeholder="Pune, India"
            onChange={(event) => set("location", event.target.value)}
          />
        </div>

        <div>
          <label htmlFor="role-mode" className="label-text">
            Work mode
          </label>
          <select
            id="role-mode"
            className="field"
            value={value.workMode}
            onChange={(event) => set("workMode", event.target.value as WorkMode)}
          >
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode[0].toUpperCase() + mode.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <SkillTagInput
            id="required-skills"
            label="Required skills (must have)"
            hint="Matched case-insensitively against the whole resume."
            value={value.requiredSkills}
            onChange={(skills) => set("requiredSkills", skills)}
          />
        </div>

        <div className="sm:col-span-2">
          <SkillTagInput
            id="preferred-skills"
            label="Preferred skills (nice to have)"
            value={value.preferredSkills}
            onChange={(skills) => set("preferredSkills", skills)}
          />
        </div>

        <div>
          <label htmlFor="min-exp" className="label-text">
            Minimum experience (years)
          </label>
          <input
            id="min-exp"
            type="number"
            min={0}
            max={50}
            step={0.5}
            className="field"
            value={value.minExperienceYears}
            onChange={(event) =>
              set("minExperienceYears", Number(event.target.value) || 0)
            }
          />
        </div>

        <div>
          <label htmlFor="ideal-exp" className="label-text">
            Ideal experience (years)
          </label>
          <input
            id="ideal-exp"
            type="number"
            min={0}
            max={50}
            step={0.5}
            className="field"
            value={value.idealExperienceYears}
            onChange={(event) =>
              set("idealExperienceYears", Number(event.target.value) || 0)
            }
          />
        </div>

        <div>
          <label htmlFor="min-education" className="label-text">
            Minimum education
          </label>
          <select
            id="min-education"
            className="field"
            value={value.minEducation}
            onChange={(event) => set("minEducation", event.target.value as EducationLevel)}
          >
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {EDUCATION_LABELS[level]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-brand-600"
              checked={value.rejectMissingRequiredSkills}
              onChange={(event) =>
                set("rejectMissingRequiredSkills", event.target.checked)
              }
            />
            <span>
              Auto-reject when any required skill is missing
              <span className="block text-xs text-ink-400">
                Strict gate — overrides the score.
              </span>
            </span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="jd" className="label-text">
            Job description
          </label>
          <textarea
            id="jd"
            className="field min-h-36"
            value={value.description ?? ""}
            placeholder="Paste the full JD. Used for the similarity score — leave blank to skip that criterion."
            onChange={(event) => set("description", event.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 border-t border-ink-200 pt-6">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Scoring weights</h3>
          <span className="text-xs text-ink-400">
            Normalised automatically · total {weightTotal}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {WEIGHT_LABELS.map(({ key, label, help }) => (
            <div key={key} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3">
              <div>
                <div className="text-sm font-medium text-ink-800">{label}</div>
                <div className="text-xs text-ink-400">{help}</div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                className="w-full accent-brand-600"
                aria-label={`${label} weight`}
                value={value.weights[key]}
                onChange={(event) => setWeight(key, Number(event.target.value))}
              />
              <span className="text-right text-sm tabular-nums text-ink-600">
                {value.weights[key]}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="shortlist-threshold" className="label-text">
              Shortlist at or above ({value.shortlistThreshold})
            </label>
            <input
              id="shortlist-threshold"
              type="range"
              min={0}
              max={100}
              className="w-full accent-emerald-600"
              value={value.shortlistThreshold}
              onChange={(event) => {
                const next = Number(event.target.value);
                onChange({
                  ...value,
                  shortlistThreshold: next,
                  reviewThreshold: Math.min(value.reviewThreshold, next),
                });
              }}
            />
          </div>
          <div>
            <label htmlFor="review-threshold" className="label-text">
              Borderline review at or above ({value.reviewThreshold})
            </label>
            <input
              id="review-threshold"
              type="range"
              min={0}
              max={100}
              className="w-full accent-amber-500"
              value={value.reviewThreshold}
              onChange={(event) =>
                set(
                  "reviewThreshold",
                  Math.min(Number(event.target.value), value.shortlistThreshold),
                )
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}
