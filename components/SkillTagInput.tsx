"use client";

import { useState } from "react";

interface Props {
  id: string;
  label: string;
  hint?: string;
  value: string[];
  onChange: (skills: string[]) => void;
}

/** Comma- or Enter-separated tag entry; also accepts a pasted comma-separated list. */
export default function SkillTagInput({ id, label, hint, value, onChange }: Props) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const additions = raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => !value.some((existing) => existing.toLowerCase() === item.toLowerCase()));

    if (additions.length > 0) onChange([...value, ...additions]);
    setDraft("");
  };

  const remove = (skill: string) => onChange(value.filter((item) => item !== skill));

  return (
    <div>
      <label htmlFor={id} className="label-text">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2" aria-live="polite">
        {value.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-100 px-2.5 py-1 text-xs font-medium text-brand-700"
          >
            {skill}
            <button
              type="button"
              onClick={() => remove(skill)}
              aria-label={`Remove ${skill}`}
              className="text-brand-500 hover:text-brand-700 leading-none text-sm"
            >
              ×
            </button>
          </span>
        ))}
        {value.length === 0 && <span className="text-xs text-ink-400">None added yet</span>}
      </div>
      <input
        id={id}
        className="field"
        value={draft}
        placeholder="Type a skill and press Enter"
        onChange={(event) => {
          const next = event.target.value;
          // A pasted list ending in a comma should tokenise immediately.
          if (next.includes(",")) commit(next);
          else setDraft(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(draft);
          } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
            remove(value[value.length - 1]);
          }
        }}
        onBlur={() => commit(draft)}
      />
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}
