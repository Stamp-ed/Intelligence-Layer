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
}

function buildFilter(filters?: QueryRequest["filters"]) {
  if (!filters) return undefined;

  const must: Array<Record<string, unknown>> = [];

  if (filters.source_types?.length) {
    must.push({
      key: "source_type",
      match: { any: filters.source_types },
    });
  }

  if (filters.channels?.length) {
    must.push({
      key: "channel",
      match: { any: filters.channels },
    });
  }

  if (filters.tags?.length) {
    must.push({
      key: "tags",
      match: { any: filters.tags },
    });
  }

  if (filters.date_from || filters.date_to) {
    const range: Record<string, string> = {};
    if (filters.date_from) {
      range.gte = new Date(filters.date_from).toISOString();
    }
    if (filters.date_to) {
      range.lte = new Date(filters.date_to).toISOString();
    }
    must.push({ key: "ingested_at", range });
  }

  if (must.length === 0) return undefined;
  return { must };
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

  const filter = buildFilter(filters);

  let results;
  try {
    results = await qdrant.search(config.qdrantCollection, {
      vector,
      limit,
      with_payload: true,
      ...(filter ? { filter } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AppError(
      502,
      "retrieval_failed",
      `Qdrant search failed: ${message}`,
    );
  }

  return results.map((r) => {
    const payload = r.payload ?? {};
    return {
      chunkId: String(payload.chunk_id ?? r.id),
      documentId: String(payload.document_id ?? ""),
      score: r.score ?? 0,
      chunkText: String(payload.chunk_text ?? ""),
      title: String(payload.title ?? ""),
      sourceType: String(payload.source_type ?? ""),
      channel: String(payload.channel ?? ""),
      author: String(payload.author ?? ""),
    };
  });
}
