"use client";

import type { CompanyProfile } from "@/lib/types";

interface Props {
  value: CompanyProfile;
  onChange: (company: CompanyProfile) => void;
}

const FIELDS: Array<{
  key: keyof CompanyProfile;
  label: string;
  placeholder: string;
  required?: boolean;
  wide?: boolean;
}> = [
  { key: "name", label: "Company name", placeholder: "Acme Technologies", required: true },
  { key: "industry", label: "Industry", placeholder: "Software / SaaS" },
  { key: "website", label: "Website", placeholder: "https://acme.com" },
  { key: "hiringEmail", label: "Hiring contact email", placeholder: "careers@acme.com" },
  { key: "location", label: "Headquarters", placeholder: "Bengaluru, India", wide: true },
];

export default function CompanyForm({ value, onChange }: Props) {
  const set = (key: keyof CompanyProfile, next: string) =>
    onChange({ ...value, [key]: next });

  return (
    <section className="card p-6">
      <header className="mb-5">
        <h2 className="text-lg font-semibold text-ink-900">Company details</h2>
        <p className="text-sm text-ink-500">
          These brand every shortlist report exported from this instance.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key} className={field.wide ? "sm:col-span-2" : undefined}>
            <label htmlFor={`company-${field.key}`} className="label-text">
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
            </label>
            <input
              id={`company-${field.key}`}
              className="field"
              value={value[field.key] ?? ""}
              placeholder={field.placeholder}
              required={field.required}
              onChange={(event) => set(field.key, event.target.value)}
            />
          </div>
        ))}

        <div className="sm:col-span-2">
          <label htmlFor="company-about" className="label-text">
            About the company
          </label>
          <textarea
            id="company-about"
            className="field min-h-24"
            value={value.about ?? ""}
            placeholder="One or two lines used as context in the exported report."
            onChange={(event) => set("about", event.target.value)}
          />
        </div>
      </div>
    </section>
  );
}
