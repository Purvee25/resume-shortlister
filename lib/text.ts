/** Shared text utilities for parsing and comparing resume text. */

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have",
  "he", "in", "is", "it", "its", "of", "on", "or", "our", "she", "that", "the", "their",
  "they", "this", "to", "was", "were", "will", "with", "we", "you", "your", "i", "my",
  "me", "us", "am", "been", "but", "can", "do", "does", "if", "into", "not", "so",
  "such", "than", "then", "there", "these", "those", "very", "who", "whom", "would",
  "about", "after", "all", "also", "any", "because", "over", "under", "using", "used",
  "work", "worked", "working", "experience", "years", "year", "team", "role", "job",
]);

/** Lowercases and collapses whitespace, keeping characters that matter to skills (+ # . /). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9+#./]+/)
    .map((token) => token.replace(/^[.\/]+|[.\/]+$/g, ""))
    .filter((token) => token.length > 1 && token.length < 40 && !STOP_WORDS.has(token));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-token search for a skill phrase. Uses lookarounds instead of \b because
 * skills like "c++", "node.js" and ".net" end in non-word characters.
 */
export function containsPhrase(haystack: string, phrase: string): boolean {
  const needle = normalize(phrase);
  if (!needle) return false;
  const pattern = new RegExp(
    `(?<![a-z0-9+#])${escapeRegExp(needle).replace(/\\?\s+/g, "[\\s\\-_/]+")}(?![a-z0-9+#])`,
    "i",
  );
  return pattern.test(haystack);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

/**
 * Builds inverse-document-frequency weights over the supplied documents.
 * Smoothed so a term appearing in every document still carries a small weight.
 */
export function buildIdf(documents: string[][]): Map<string, number> {
  const documentCount = documents.length || 1;
  const seenIn = new Map<string, number>();
  for (const tokens of documents) {
    for (const token of new Set(tokens)) {
      seenIn.set(token, (seenIn.get(token) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [token, count] of seenIn) {
    idf.set(token, Math.log((documentCount + 1) / (count + 1)) + 1);
  }
  return idf;
}

export function tfidfVector(
  tokens: string[],
  idf: Map<string, number>,
): Map<string, number> {
  const frequencies = termFrequency(tokens);
  const total = tokens.length || 1;
  const vector = new Map<string, number>();
  for (const [token, count] of frequencies) {
    const weight = idf.get(token);
    if (weight === undefined) continue;
    vector.set(token, (count / total) * weight);
  }
  return vector;
}

/** Cosine similarity in [0, 1] for the non-negative tf-idf vectors above. */
export function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>,
): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [token, value] of small) {
    const other = large.get(token);
    if (other !== undefined) dot += value * other;
  }
  if (dot === 0) return 0;

  let normA = 0;
  for (const value of a.values()) normA += value * value;
  let normB = 0;
  for (const value of b.values()) normB += value * value;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
