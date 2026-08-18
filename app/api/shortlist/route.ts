import { NextResponse } from "next/server";
import { scoreResumes } from "@/lib/score";
import { shortlistRequestSchema } from "@/lib/types";

export const runtime = "nodejs";

/** Guards against a single oversized payload exhausting the function's memory. */
const MAX_TOTAL_TEXT_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = shortlistRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { company, criteria, resumes } = parsed.data;

  const totalBytes = resumes.reduce((sum, resume) => sum + resume.text.length, 0);
  if (totalBytes > MAX_TOTAL_TEXT_BYTES) {
    return NextResponse.json(
      { error: "Too much resume text in one batch. Upload fewer files at a time." },
      { status: 413 },
    );
  }

  if (criteria.reviewThreshold > criteria.shortlistThreshold) {
    return NextResponse.json(
      { error: "Review threshold cannot be higher than the shortlist threshold." },
      { status: 400 },
    );
  }

  const response = scoreResumes(company, criteria, resumes);
  return NextResponse.json(response);
}
