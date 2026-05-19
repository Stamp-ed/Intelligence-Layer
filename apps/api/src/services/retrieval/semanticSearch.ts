import { qdrant } from "../../lib/qdrant.js";
import { config } from "../../config.js";
import { AppError } from "../../middleware/errorHandler.js";
import { generateEmbedding } from "../ingestion/embedder.js";
import type { QueryRequest } from "../../schemas/query.js";

export interface SemanticSearchResult {
  chunkId: string;
  documentId: string;
  score: number;
  chunkText: string;
  title: string;
  sourceType: string;
  channel: string;
  author: string;
  ingestedAt: string;
  tags: string[];
}

function hasActiveFilters(filters?: QueryRequest["filters"]): boolean {
  if (!filters) return false;
  return Boolean(
    filters.source_types?.length ||
      filters.channels?.length ||
      filters.tags?.length ||
      filters.date_from ||
      filters.date_to,
  );
}

/** Apply filters in-process (Qdrant Cloud often rejects payload filters without indexes). */
export function applyPayloadFilters(
  results: SemanticSearchResult[],
  filters?: QueryRequest["filters"],
): SemanticSearchResult[] {
  if (!filters || !hasActiveFilters(filters)) return results;

  const fromMs = filters.date_from
    ? new Date(filters.date_from).getTime()
    : undefined;
  const toMs = filters.date_to ? new Date(filters.date_to).getTime() : undefined;
  const sourceTypes = filters.source_types?.length
    ? new Set(filters.source_types)
    : undefined;
  const channels = filters.channels?.length ? new Set(filters.channels) : undefined;
  const tags = filters.tags?.length ? new Set(filters.tags) : undefined;

  return results.filter((row) => {
    if (sourceTypes && !sourceTypes.has(row.sourceType)) return false;
    if (channels && !channels.has(row.channel)) return false;
    if (tags && !row.tags.some((t) => tags.has(t))) return false;
    if (fromMs != null || toMs != null) {
      const ingestedMs = Date.parse(row.ingestedAt);
      if (Number.isNaN(ingestedMs)) return false;
      if (fromMs != null && ingestedMs < fromMs) return false;
      if (toMs != null && ingestedMs > toMs) return false;
    }
    return true;
  });
}

export async function semanticSearch(
  query: string,
  limit = 20,
  filters?: QueryRequest["filters"],
): Promise<SemanticSearchResult[]> {
  let vector: number[];
  try {
    vector = await generateEmbedding(query);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError(
      502,
      "embedding_failed",
      `Failed to generate query embedding: ${message}`,
    );
  }

  const filtered = hasActiveFilters(filters);
  const searchLimit = filtered ? Math.min(Math.max(limit * 4, 40), 120) : limit;

  let rawResults;
  try {
    rawResults = await qdrant.search(config.qdrantCollection, {
      vector,
      limit: searchLimit,
      with_payload: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError(
      502,
      "retrieval_failed",
      `Qdrant search failed: ${message}`,
    );
  }

  const mapped: SemanticSearchResult[] = rawResults.map((r) => {
    const payload = r.payload ?? {};
    const rawTags = payload.tags;
    const tags = Array.isArray(rawTags)
      ? rawTags.map(String)
      : typeof rawTags === "string"
        ? [rawTags]
        : [];

    return {
      chunkId: String(payload.chunk_id ?? r.id),
      documentId: String(payload.document_id ?? ""),
      score: r.score ?? 0,
      chunkText: String(payload.chunk_text ?? ""),
      title: String(payload.title ?? ""),
      sourceType: String(payload.source_type ?? ""),
      channel: String(payload.channel ?? ""),
      author: String(payload.author ?? ""),
      ingestedAt: String(payload.ingested_at ?? ""),
      tags,
    };
  });

  return applyPayloadFilters(mapped, filters).slice(0, limit);
}
