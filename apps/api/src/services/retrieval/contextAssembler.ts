import type { SemanticSearchResult } from "./semanticSearch.js";

export function assembleContext(chunks: SemanticSearchResult[]): string {
  return chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}] Title: ${c.title}\nChannel: ${c.channel || "N/A"}\nType: ${c.sourceType}\n---\n${c.chunkText}`,
    )
    .join("\n\n");
}
