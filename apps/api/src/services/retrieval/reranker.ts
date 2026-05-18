import type { SemanticSearchResult } from "./semanticSearch.js";

function queryTerms(query: string): string[] {
  return [...new Set(query.toLowerCase().match(/\b[\w'-]{3,}\b/g) ?? [])];
}

export function keywordOverlapScore(query: string, text: string): number {
  const terms = queryTerms(query);
  if (terms.length === 0) return 0;
  const haystack = text.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (haystack.includes(term)) hits += 1;
  }
  return hits / terms.length;
}

export function rerankSearchResults(
  query: string,
  results: SemanticSearchResult[],
  options: {
    maxChunks?: number;
    minScore?: number;
    maxChunksPerDocument?: number;
    primaryChannel?: string;
  } = {},
): SemanticSearchResult[] {
  const maxChunks = options.maxChunks ?? 8;
  const minScore = options.minScore ?? 0.28;
  const maxPerDoc = options.maxChunksPerDocument ?? 2;

  const primary = options.primaryChannel?.trim();

  const boosted = results
    .map((r) => {
      const overlap = keywordOverlapScore(
        query,
        `${r.title} ${r.chunkText} ${r.channel}`,
      );
      let score = r.score + overlap * 0.12;
      if (primary && r.channel === primary) {
        score += 0.08;
      }
      return { ...r, score };
    })
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score);

  const perDoc = new Map<string, SemanticSearchResult[]>();
  const merged: SemanticSearchResult[] = [];

  for (const row of boosted) {
    const list = perDoc.get(row.documentId) ?? [];
    if (list.length >= maxPerDoc) continue;
    list.push(row);
    perDoc.set(row.documentId, list);
    merged.push(row);
    if (merged.length >= maxChunks) break;
  }

  return merged;
}
