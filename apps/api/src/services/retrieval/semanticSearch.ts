import { qdrant } from "../../lib/qdrant.js";
import { config } from "../../config.js";
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

  if (must.length === 0) return undefined;
  return { must };
}

export async function semanticSearch(
  query: string,
  limit = 20,
  filters?: QueryRequest["filters"],
): Promise<SemanticSearchResult[]> {
  const vector = await generateEmbedding(query);
  const filter = buildFilter(filters);

  const results = await qdrant.search(config.qdrantCollection, {
    vector,
    limit,
    filter,
    with_payload: true,
  });

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
