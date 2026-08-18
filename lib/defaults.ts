import type { CompanyProfile, JobCriteria, Weights } from "./types";

/**
 * A deployed instance is branded through env vars, so the same build can serve
 * any company without a code change. The setup screen overrides these locally.
 */
export const DEFAULT_COMPANY: CompanyProfile = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME ?? "",
  website: process.env.NEXT_PUBLIC_COMPANY_WEBSITE ?? "",
  industry: process.env.NEXT_PUBLIC_COMPANY_INDUSTRY ?? "",
  hiringEmail: process.env.NEXT_PUBLIC_COMPANY_HIRING_EMAIL ?? "",
  location: process.env.NEXT_PUBLIC_COMPANY_LOCATION ?? "",
  about: process.env.NEXT_PUBLIC_COMPANY_ABOUT ?? "",
};

export const DEFAULT_WEIGHTS: Weights = {
  requiredSkills: 40,
  preferredSkills: 15,
  experience: 20,
  education: 10,
  jdSimilarity: 15,
};

export const DEFAULT_CRITERIA: JobCriteria = {
  title: "",
  department: "",
  location: "",
  workMode: "onsite",
  description: "",
  requiredSkills: [],
  preferredSkills: [],
  minExperienceYears: 0,
  idealExperienceYears: 3,
  minEducation: "bachelors",
  weights: DEFAULT_WEIGHTS,
  shortlistThreshold: 70,
  reviewThreshold: 50,
  rejectMissingRequiredSkills: false,
};

export interface RolePreset {
  label: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperienceYears: number;
  idealExperienceYears: number;
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    label: "Machine Learning Engineer",
    requiredSkills: ["Python", "PyTorch", "Machine Learning", "SQL", "Git"],
    preferredSkills: ["TensorFlow", "MLflow", "Kubernetes", "AWS", "Docker", "NLP"],
    minExperienceYears: 2,
    idealExperienceYears: 5,
  },
  {
    label: "Backend Engineer",
    requiredSkills: ["Python", "REST API", "PostgreSQL", "Git", "Docker"],
    preferredSkills: ["FastAPI", "Redis", "Kubernetes", "AWS", "CI/CD"],
    minExperienceYears: 2,
    idealExperienceYears: 5,
  },
  {
    label: "Frontend Engineer",
    requiredSkills: ["JavaScript", "React", "HTML", "CSS", "Git"],
    preferredSkills: ["TypeScript", "Next.js", "Tailwind", "Testing", "Accessibility"],
    minExperienceYears: 1,
    idealExperienceYears: 4,
  },
  {
    label: "Data Analyst",
    requiredSkills: ["SQL", "Excel", "Python", "Data Visualization"],
    preferredSkills: ["Tableau", "Power BI", "pandas", "Statistics", "dbt"],
    minExperienceYears: 1,
    idealExperienceYears: 3,
  },
  {
    label: "DevOps Engineer",
    requiredSkills: ["Linux", "Docker", "Kubernetes", "CI/CD", "Terraform"],
    preferredSkills: ["AWS", "Prometheus", "Ansible", "Python", "Networking"],
    minExperienceYears: 2,
    idealExperienceYears: 6,
  },
];
