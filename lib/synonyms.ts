/**
 * Groups of terms that name the same skill. Matching any member of a group
 * satisfies a criterion written as any other member, so "Go" matches a resume
 * that says "Golang" and vice versa. Keep entries lowercase.
 */
const SKILL_GROUPS: string[][] = [
  ["go", "golang"],
  ["javascript", "js", "ecmascript"],
  ["kubernetes", "k8s"],
  ["postgresql", "postgres", "psql"],
  ["node.js", "nodejs", "node"],
  ["react", "react.js", "reactjs"],
  ["vue", "vue.js", "vuejs"],
  ["next.js", "nextjs"],
  ["c#", "csharp", "c sharp"],
  ["c++", "cpp"],
  ["machine learning", "ml"],
  ["natural language processing", "nlp"],
  ["artificial intelligence", "ai"],
  ["amazon web services", "aws"],
  ["google cloud platform", "gcp", "google cloud"],
  ["microsoft azure", "azure"],
  ["scikit-learn", "sklearn", "scikit learn"],
  ["tensorflow", "tensor flow"],
  ["pytorch", "torch"],
  ["ci/cd", "cicd", "continuous integration"],
  ["rest api", "restful api", "rest apis", "restful apis"],
  ["mongodb", "mongo"],
  ["power bi", "powerbi"],
];

const LOOKUP = new Map<string, string[]>();
for (const group of SKILL_GROUPS) {
  for (const term of group) LOOKUP.set(term, group);
}

/** All spellings to try for a skill, starting with the skill as written. */
export function skillAliases(skill: string): string[] {
  const key = skill.trim().toLowerCase();
  const group = LOOKUP.get(key);
  if (!group) return [skill];
  return [skill, ...group.filter((term) => term !== key)];
}
