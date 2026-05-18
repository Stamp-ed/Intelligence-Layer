import type { QueryRequest } from "../../schemas/query.js";

export function buildRetrievalQuery(
  query: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): string {
  const trimmed = query.trim();
  if (history.length === 0) return trimmed;

  const isFollowUp =
    trimmed.length < 80 ||
    /^(it|that|this|they|those|what about|how about|and |also |why|who|when|where)\b/i.test(
      trimmed,
    );

  if (!isFollowUp) return trimmed;

  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) return trimmed;

  return `${lastUser.content}\n\nFollow-up: ${trimmed}`;
}
