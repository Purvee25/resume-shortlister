"use client";

import { useCallback, useRef, useState } from "react";
import {
  ACCEPTED_EXTENSIONS,
  ExtractionError,
  extractText,
  type ExtractedResume,
} from "@/lib/textract";

interface Props {
  resumes: ExtractedResume[];
  onChange: (resumes: ExtractedResume[]) => void;
}

interface FileError {
  fileName: string;
  message: string;
}

export default function UploadZone({ resumes, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FileError[]>([]);

  const ingest = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setBusy(true);
      setErrors([]);

      const accepted: ExtractedResume[] = [];
      const failed: FileError[] = [];

      for (const file of Array.from(files)) {
        try {
          accepted.push(await extractText(file));
        } catch (error) {
          failed.push({
            fileName: file.name,
            message:
              error instanceof ExtractionError
                ? error.message
                : "Unexpected error while reading this file",
          });
        }
      }

      // Re-uploading a file replaces the earlier copy rather than duplicating it.
      const byName = new Map(resumes.map((resume) => [resume.fileName, resume]));
      for (const resume of accepted) byName.set(resume.fileName, resume);

      onChange([...byName.values()]);
      setErrors(failed);
      setBusy(false);
    },
    [resumes, onChange],
  );

  return (
    <section className="card p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Resumes</h2>
          <p className="text-sm text-ink-500">
            Files are read in your browser — only the extracted text is sent for scoring.
          </p>
        </div>
        {resumes.length > 0 && (
          <button
            type="button"
            className="text-sm text-ink-500 underline hover:text-ink-800"
            onClick={() => onChange([])}
          >
            Clear all
          </button>
        )}
      </header>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void ingest(event.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-brand-500 bg-brand-50" : "border-ink-300 bg-ink-50"
        }`}
      >
        <p className="text-sm text-ink-600">
          Drag &amp; drop resumes here, or{" "}
          <button
            type="button"
            className="font-medium text-brand-600 underline"
            onClick={() => inputRef.current?.click()}
          >
            browse files
          </button>
        </p>
        <p className="mt-1 text-xs text-ink-400">
          {ACCEPTED_EXTENSIONS.join(", ")} · up to 10 MB each
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={(event) => {
            void ingest(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {busy && <p className="mt-3 text-sm text-ink-500">Extracting text…</p>}

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {errors.map((error) => (
            <li key={error.fileName}>
              <span className="font-medium">{error.fileName}</span>: {error.message}
            </li>
          ))}
        </ul>
      )}

      {resumes.length > 0 && (
        <ul className="mt-4 divide-y divide-ink-100 rounded-lg border border-ink-200">
          {resumes.map((resume) => (
            <li
              key={resume.fileName}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="truncate text-ink-800">{resume.fileName}</span>
              <span className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-ink-400">
                  {resume.text.split(/\s+/).length} words
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${resume.fileName}`}
                  className="text-ink-400 hover:text-red-600"
                  onClick={() =>
                    onChange(resumes.filter((item) => item.fileName !== resume.fileName))
                  }
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
