import { describe, expect, it } from "vitest";
import { activeWeights, scoreResumes } from "@/lib/score";
import { DEFAULT_WEIGHTS } from "@/lib/defaults";
import type { CompanyProfile, JobCriteria } from "@/lib/types";

const NOW = new Date("2026-11-01T00:00:00Z");
const COMPANY: CompanyProfile = {
  name: "Acme",
  website: "",
  industry: "",
  hiringEmail: "",
  location: "",
  about: "",
};

function criteria(overrides: Partial<JobCriteria> = {}): JobCriteria {
  return {
    title: "ML Engineer",
    department: "",
    location: "",
    workMode: "onsite",
    description: "",
    requiredSkills: [],
    preferredSkills: [],
    minExperienceYears: 0,
    idealExperienceYears: 0,
    minEducation: "none",
    weights: DEFAULT_WEIGHTS,
    shortlistThreshold: 70,
    reviewThreshold: 50,
    rejectMissingRequiredSkills: false,
    ...overrides,
  };
}

function scoreOne(text: string, c: JobCriteria) {
  return scoreResumes(COMPANY, c, [{ fileName: "r.txt", text }], NOW).results[0];
}

describe("activeWeights", () => {
  it("zeroes every criterion the recruiter left unset", () => {
    expect(activeWeights(criteria(), false)).toEqual({
      requiredSkills: 0,
      preferredSkills: 0,
      experience: 0,
      education: 0,
      jdSimilarity: 0,
    });
  });

  it("keeps the weights of criteria that are set", () => {
    const w = activeWeights(
      criteria({
        requiredSkills: ["Python"],
        preferredSkills: ["Docker"],
        minExperienceYears: 2,
        minEducation: "bachelors",
      }),
      true,
    );
    expect(w).toEqual(DEFAULT_WEIGHTS);
  });

  it("counts an ideal-only experience target as set", () => {
    expect(activeWeights(criteria({ idealExperienceYears: 3 }), false).experience).toBe(
      DEFAULT_WEIGHTS.experience,
    );
  });
});

describe("scoreResumes", () => {
  it("does not inflate a candidate who matches no required skills (regression)", () => {
    // Before the fix, unset criteria gave free full marks and this scored 52.9 ("review").
    const result = scoreOne(
      "Priya S\nSoftware Engineer at Google (Jan 2016 - Mar 2021)\nSkills: JavaScript, C\nB.E.",
      criteria({ requiredSkills: ["Java", "C++", "Rust"], minExperienceYears: 3 }),
    );
    expect(result.matchedRequired).toEqual([]);
    expect(result.decision).toBe("rejected");
    expect(result.score).toBeLessThan(50);
  });

  it("scores a perfect match at 100 when only skills are set", () => {
    const result = scoreOne("Skills: Python, SQL", criteria({ requiredSkills: ["Python", "SQL"] }));
    expect(result.score).toBe(100);
    expect(result.decision).toBe("shortlisted");
  });

  it("scores half the required skills at 50 when only skills are set", () => {
    const result = scoreOne("Skills: Python", criteria({ requiredSkills: ["Python", "SQL"] }));
    expect(result.score).toBe(50);
  });

  it("credits synonyms in scoring", () => {
    const result = scoreOne("Skills: Golang, k8s", criteria({ requiredSkills: ["Go", "Kubernetes"] }));
    expect(result.score).toBe(100);
  });

  it("scores 0 and explains why when no criteria are set", () => {
    const result = scoreOne("Anything at all", criteria());
    expect(result.score).toBe(0);
    expect(result.reasons[0]).toMatch(/No scoring criteria set/);
  });

  it("auto-rejects on a missing required skill when the strict gate is on", () => {
    const result = scoreOne(
      "Skills: Python. 10 years of experience. PhD",
      criteria({
        requiredSkills: ["Python", "Rust"],
        minExperienceYears: 2,
        minEducation: "bachelors",
        rejectMissingRequiredSkills: true,
      }),
    );
    expect(result.decision).toBe("rejected");
  });

  it("ranks candidates by score, highest first", () => {
    const c = criteria({ requiredSkills: ["Python", "SQL", "Docker"] });
    const { results, totals } = scoreResumes(
      COMPANY,
      c,
      [
        { fileName: "weak.txt", text: "Skills: Excel" },
        { fileName: "strong.txt", text: "Skills: Python, SQL, Docker" },
        { fileName: "mid.txt", text: "Skills: Python, SQL" },
      ],
      NOW,
    );
    expect(results.map((r) => r.fileName)).toEqual(["strong.txt", "mid.txt", "weak.txt"]);
    expect(totals).toEqual({ shortlisted: 1, review: 1, rejected: 1 });
  });

  it("reports the weights it actually used", () => {
    const { activeWeights: used } = scoreResumes(
      COMPANY,
      criteria({ requiredSkills: ["Python"] }),
      [{ fileName: "r.txt", text: "Python" }],
      NOW,
    );
    expect(used).toEqual({
      requiredSkills: DEFAULT_WEIGHTS.requiredSkills,
      preferredSkills: 0,
      experience: 0,
      education: 0,
      jdSimilarity: 0,
    });
  });

  it("flags OCR'd resumes for verification", () => {
    const { results } = scoreResumes(
      COMPANY,
      criteria({ requiredSkills: ["Python"] }),
      [{ fileName: "scan.pdf", text: "Python", ocr: true }],
      NOW,
    );
    expect(results[0].ocr).toBe(true);
    expect(results[0].reasons.some((r) => /OCR/.test(r))).toBe(true);
  });

  it("does not call a short, text-based resume a scan", () => {
    const result = scoreOne("Skills: Python", criteria({ requiredSkills: ["Python"] }));
    expect(result.reasons.join(" ")).not.toMatch(/scan|OCR/i);
    expect(result.reasons.join(" ")).toMatch(/Only \d+ words extracted/);
  });

  it("does not warn about length for a normal-length resume", () => {
    const text = "Python engineer. ".repeat(40);
    const result = scoreOne(text, criteria({ requiredSkills: ["Python"] }));
    expect(result.reasons.join(" ")).not.toMatch(/words extracted/);
  });

  it("is deterministic", () => {
    const c = criteria({ requiredSkills: ["Python"], description: "Python NLP engineer" });
    const a = scoreOne("Python NLP work", c);
    const b = scoreOne("Python NLP work", c);
    expect(a.score).toBe(b.score);
  });
});
