import { z } from "zod";

/** Education levels, ordered from lowest to highest. Index doubles as the rank. */
export const EDUCATION_LEVELS = [
  "none",
  "diploma",
  "bachelors",
  "masters",
  "phd",
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const EDUCATION_LABELS: Record<EducationLevel, string> = {
  none: "No degree required",
  diploma: "Diploma",
  bachelors: "Bachelor's",
  masters: "Master's",
  phd: "PhD",
};

export const WORK_MODES = ["onsite", "hybrid", "remote"] as const;
export type WorkMode = (typeof WORK_MODES)[number];

export const companyProfileSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(120),
  website: z.string().trim().max(200).optional().default(""),
  industry: z.string().trim().max(120).optional().default(""),
  hiringEmail: z.string().trim().max(200).optional().default(""),
  location: z.string().trim().max(160).optional().default(""),
  about: z.string().trim().max(2000).optional().default(""),
});

export type CompanyProfile = z.infer<typeof companyProfileSchema>;

export const weightsSchema = z.object({
  requiredSkills: z.number().min(0).max(100),
  preferredSkills: z.number().min(0).max(100),
  experience: z.number().min(0).max(100),
  education: z.number().min(0).max(100),
  jdSimilarity: z.number().min(0).max(100),
});

export type Weights = z.infer<typeof weightsSchema>;

export const jobCriteriaSchema = z.object({
  title: z.string().trim().min(1, "Role title is required").max(160),
  department: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().max(160).optional().default(""),
  workMode: z.enum(WORK_MODES).default("onsite"),
  description: z.string().trim().max(20000).optional().default(""),
  requiredSkills: z.array(z.string().trim().min(1)).max(60).default([]),
  preferredSkills: z.array(z.string().trim().min(1)).max(60).default([]),
  minExperienceYears: z.number().min(0).max(50).default(0),
  idealExperienceYears: z.number().min(0).max(50).default(0),
  minEducation: z.enum(EDUCATION_LEVELS).default("none"),
  weights: weightsSchema,
  shortlistThreshold: z.number().min(0).max(100).default(70),
  reviewThreshold: z.number().min(0).max(100).default(50),
  rejectMissingRequiredSkills: z.boolean().default(false),
});

export type JobCriteria = z.infer<typeof jobCriteriaSchema>;

export const resumeInputSchema = z.object({
  fileName: z.string().min(1).max(400),
  /** Plain text extracted in the browser; the server never sees the raw file. */
  text: z.string().max(400_000),
});

export type ResumeInput = z.infer<typeof resumeInputSchema>;

export const shortlistRequestSchema = z.object({
  company: companyProfileSchema,
  criteria: jobCriteriaSchema,
  resumes: z.array(resumeInputSchema).min(1, "Upload at least one resume").max(300),
});

export type ShortlistRequest = z.infer<typeof shortlistRequestSchema>;

export type Decision = "shortlisted" | "review" | "rejected";

export interface SubScores {
  requiredSkills: number;
  preferredSkills: number;
  experience: number;
  education: number;
  jdSimilarity: number;
}

export interface CandidateResult {
  id: string;
  fileName: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  links: string[];
  yearsExperience: number | null;
  educationLevel: EducationLevel;
  matchedRequired: string[];
  missingRequired: string[];
  matchedPreferred: string[];
  subScores: SubScores;
  score: number;
  decision: Decision;
  reasons: string[];
  wordCount: number;
}

export interface ShortlistResponse {
  company: CompanyProfile;
  criteria: JobCriteria;
  generatedAt: string;
  totals: Record<Decision, number>;
  results: CandidateResult[];
}
