import type { QueryRequest } from "../../schemas/query.js";
import { semanticSearch, type SemanticSearchResult } from "./semanticSearch.js";

const PRIMARY_SHARE = 0.65;
const PRIMARY_BOOST = 0.18;

/**
 * When `primary_channel` is set, search that channel first, then the rest of the corpus.
 * Primary-channel hits get a score boost so reranking prefers them.
 */
export async function channelAwareSearch(
  query: string,
  limit: number,
  filters?: QueryRequest["filters"],
): Promise<SemanticSearchResult[]> {
  const primary = filters?.primary_channel?.trim();
  if (!primary) {
    return semanticSearch(query, limit, filters);
  }

  const { primary_channel: _primary, channels, ...rest } = filters ?? {};
  const primaryLimit = Math.max(8, Math.ceil(limit * PRIMARY_SHARE));

  const primaryResults = await semanticSearch(query, primaryLimit, {
    ...rest,
    channels: [primary],
  });

  const seen = new Set(primaryResults.map((r) => r.chunkId));
  const boostedPrimary = primaryResults.map((r) => ({
    ...r,
    score: r.score + PRIMARY_BOOST,
  }));

  const globalResults = await semanticSearch(query, limit, {
    ...rest,
    channels: channels?.length ? channels : undefined,
  });

  const others = globalResults
    .filter((r) => !seen.has(r.chunkId))
    .map((r) => ({
      ...r,
      score:
        r.channel === primary
          ? r.score + PRIMARY_BOOST
          : r.score * 0.94,
    }));

  return [...boostedPrimary, ...others]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit * 2);
}
