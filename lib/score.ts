/**
 * Deterministic, explainable scoring. Every candidate is scored with the same
 * weights and the reasons list mirrors exactly what moved the score, so a
 * recruiter can audit (and overrule) any decision.
 */
import {
  type CandidateResult,
  type Decision,
  type JobCriteria,
  type ResumeInput,
  type ShortlistResponse,
  type CompanyProfile,
  type SubScores,
  type Weights,
  EDUCATION_LABELS,
} from "./types";
import {
  educationRank,
  extractEducationLevel,
  extractEmail,
  extractLinks,
  extractName,
  extractPhone,
  extractYearsExperience,
  findSkills,
} from "./extract";
import { buildIdf, cosineSimilarity, tfidfVector, tokenize } from "./text";

/** Similarity above this counts as a full match; raw cosine on short JDs stays low. */
const SIMILARITY_CEILING = 0.35;

function ratio(matched: number, total: number): number {
  return total === 0 ? 1 : matched / total;
}

/**
 * Full credit at or above the minimum, partial credit below it, and a small
 * bonus toward the ideal so a deeper match outranks a bare pass.
 */
function scoreExperience(
  years: number | null,
  minYears: number,
  idealYears: number,
): number {
  if (years === null) return minYears === 0 ? 0.6 : 0.3;
  if (minYears === 0 && idealYears === 0) return 1;
  if (years < minYears) return Math.max(0, years / Math.max(minYears, 1)) * 0.6;

  const stretch = Math.max(idealYears - minYears, 0);
  if (stretch === 0) return 1;
  return 0.8 + 0.2 * Math.min((years - minYears) / stretch, 1);
}

function scoreEducation(candidate: number, required: number): number {
  if (required <= 0) return 1;
  if (candidate >= required) return 1;
  if (candidate <= 0) return 0;
  return candidate / required;
}

function weightedTotal(sub: SubScores, weights: Weights): number {
  const pairs: Array<[number, number]> = [
    [sub.requiredSkills, weights.requiredSkills],
    [sub.preferredSkills, weights.preferredSkills],
    [sub.experience, weights.experience],
    [sub.education, weights.education],
    [sub.jdSimilarity, weights.jdSimilarity],
  ];
  const totalWeight = pairs.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight === 0) return 0;
  const raw = pairs.reduce((sum, [value, weight]) => sum + value * weight, 0);
  return Math.round((raw / totalWeight) * 1000) / 10;
}

function decide(
  score: number,
  criteria: JobCriteria,
  missingRequired: string[],
): Decision {
  if (criteria.rejectMissingRequiredSkills && missingRequired.length > 0) {
    return "rejected";
  }
  if (score >= criteria.shortlistThreshold) return "shortlisted";
  if (score >= criteria.reviewThreshold) return "review";
  return "rejected";
}

function buildReasons(
  result: Omit<CandidateResult, "reasons">,
  criteria: JobCriteria,
): string[] {
  const reasons: string[] = [];

  if (criteria.requiredSkills.length > 0) {
    reasons.push(
      `Matched ${result.matchedRequired.length}/${criteria.requiredSkills.length} required skills` +
        (result.matchedRequired.length ? `: ${result.matchedRequired.join(", ")}` : ""),
    );
    if (result.missingRequired.length > 0) {
      reasons.push(`Missing required: ${result.missingRequired.join(", ")}`);
    }
  }

  if (criteria.preferredSkills.length > 0) {
    reasons.push(
      result.matchedPreferred.length > 0
        ? `Preferred skills found: ${result.matchedPreferred.join(", ")}`
        : "No preferred skills found",
    );
  }

  if (result.yearsExperience === null) {
    reasons.push("Could not detect years of experience from the resume");
  } else {
    const verdict =
      result.yearsExperience >= criteria.minExperienceYears ? "meets" : "below";
    reasons.push(
      `${result.yearsExperience} yrs experience — ${verdict} the ${criteria.minExperienceYears} yr minimum`,
    );
  }

  if (criteria.minEducation !== "none") {
    const meets =
      educationRank(result.educationLevel) >= educationRank(criteria.minEducation);
    reasons.push(
      `Education: ${EDUCATION_LABELS[result.educationLevel]} — ${meets ? "meets" : "below"} ${EDUCATION_LABELS[criteria.minEducation]}`,
    );
  }

  if (criteria.description.trim().length > 0) {
    reasons.push(
      `Job-description similarity ${Math.round(result.subScores.jdSimilarity * 100)}%`,
    );
  }

  if (result.wordCount < 80) {
    reasons.push("Very little text extracted — the file may be a scan or image-only PDF");
  }

  return reasons;
}

export function scoreResumes(
  company: CompanyProfile,
  criteria: JobCriteria,
  resumes: ResumeInput[],
  now: Date = new Date(),
): ShortlistResponse {
  const resumeTokens = resumes.map((resume) => tokenize(resume.text));
  const descriptionTokens = tokenize(criteria.description);
  const hasDescription = descriptionTokens.length > 0;

  // Fit the idf on the resume pool plus the JD so common resume boilerplate is
  // down-weighted relative to role-specific vocabulary.
  const idf = buildIdf(hasDescription ? [...resumeTokens, descriptionTokens] : resumeTokens);
  const descriptionVector = hasDescription
    ? tfidfVector(descriptionTokens, idf)
    : new Map<string, number>();

  const requiredRank = educationRank(criteria.minEducation);

  const results: CandidateResult[] = resumes.map((resume, index) => {
    const { text, fileName } = resume;
    const tokens = resumeTokens[index];

    const required = findSkills(text, criteria.requiredSkills);
    const preferred = findSkills(text, criteria.preferredSkills);
    const yearsExperience = extractYearsExperience(text, now);
    const educationLevel = extractEducationLevel(text);

    const similarity = hasDescription
      ? Math.min(
          cosineSimilarity(tfidfVector(tokens, idf), descriptionVector) / SIMILARITY_CEILING,
          1,
        )
      : 0;

    const subScores: SubScores = {
      requiredSkills: ratio(required.matched.length, criteria.requiredSkills.length),
      preferredSkills: ratio(preferred.matched.length, criteria.preferredSkills.length),
      experience: scoreExperience(
        yearsExperience,
        criteria.minExperienceYears,
        criteria.idealExperienceYears,
      ),
      education: scoreEducation(educationRank(educationLevel), requiredRank),
      jdSimilarity: similarity,
    };

    // Drop the similarity term entirely when no JD was supplied, rather than
    // scoring every candidate 0 on a criterion the recruiter never set.
    const effectiveWeights: Weights = hasDescription
      ? criteria.weights
      : { ...criteria.weights, jdSimilarity: 0 };

    const score = weightedTotal(subScores, effectiveWeights);
    const partial: Omit<CandidateResult, "reasons"> = {
      id: `${index}-${fileName}`,
      fileName,
      name: extractName(text, fileName),
      email: extractEmail(text),
      phone: extractPhone(text),
      links: extractLinks(text),
      yearsExperience,
      educationLevel,
      matchedRequired: required.matched,
      missingRequired: required.missing,
      matchedPreferred: preferred.matched,
      subScores,
      score,
      decision: decide(score, criteria, required.missing),
      wordCount: tokens.length,
    };

    return { ...partial, reasons: buildReasons(partial, criteria) };
  });

  results.sort((a, b) => b.score - a.score || a.fileName.localeCompare(b.fileName));

  const totals: Record<Decision, number> = { shortlisted: 0, review: 0, rejected: 0 };
  for (const result of results) totals[result.decision] += 1;

  return {
    company,
    criteria,
    generatedAt: now.toISOString(),
    totals,
    results,
  };
}
