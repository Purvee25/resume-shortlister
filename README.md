# Resume Shortlister

**[▶ Live demo](https://purvee25.github.io/resume-shortlister/)** — runs entirely in your browser; resume files never leave your machine.

Upload a batch of resumes, define the role's criteria, and get a ranked
shortlist with an auditable reason for every decision.

Scoring is **deterministic, not an LLM call**. Every candidate runs through the
same weights, and the reasons list mirrors exactly what moved the score — so a
recruiter can inspect and overrule any result.

## How it works

Resumes are parsed **in the browser** (`pdfjs-dist` for PDFs, `mammoth` for
`.docx`), so the files themselves never leave the machine. Only extracted text
is posted to `/api/shortlist`, which validates with zod, scores, and returns the
ranking.

```
upload -> client-side text extraction -> POST /api/shortlist
       -> field extraction -> sub-scores -> weighted total -> decision + reasons
```

Field extraction (`lib/extract.ts`) pulls name, email, phone, links, skills,
years of experience, and education level. `lib/text.ts` provides tokenisation
and TF-IDF cosine similarity against the job description. `lib/score.ts`
combines these into sub-scores and a final decision.

## Layout

```
app/
├── page.tsx · layout.tsx · globals.css
└── api/shortlist/route.ts   # validate, guard payload size, score
components/
├── UploadZone.tsx           # drag-and-drop + client-side parsing
├── CompanyForm.tsx · CriteriaForm.tsx · SkillTagInput.tsx
└── ResultsView.tsx          # ranked table, per-candidate reasons
lib/
├── extract.ts               # name/email/phone/skills/education/experience
├── text.ts                  # tokenize, TF-IDF, cosine similarity
├── score.ts                 # weights -> sub-scores -> decision
├── csv.ts                   # shortlist export
├── textract.ts · defaults.ts · types.ts
scripts/copy-pdf-worker.mjs  # runs on postinstall
```

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · zod ·
pdfjs-dist · mammoth

## Running it

```bash
npm install
npm run dev
```

Opens on `http://localhost:3000`. `npm install` also copies the PDF.js worker
into `public/` via the `postinstall` script.

## Configuration

Entirely optional — the in-app setup screen can override every value at runtime.
The `NEXT_PUBLIC_COMPANY_*` variables in [`.env.example`](.env.example) just
prefill it for a deployed instance.

```bash
cp .env.example .env.local
```

## Guardrails

- Total extracted text is capped at 8 MB per request to protect the function's memory.
- Request bodies are validated with zod; malformed payloads get a `400` with the issues.
- Resume files stay client-side; only text is transmitted.
