/** Vector sizes for OpenAI embedding models used with Qdrant */
const DIMENSIONS_BY_MODEL: Record<string, number> = {
  "text-embedding-3-small": 1536,
  "text-embedding-3-large": 3072,
  "text-embedding-ada-002": 1536,
};

export function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

export function resolveEmbeddingDimensions(model: string): number {
  const fromEnv = process.env.EMBEDDING_DIMENSIONS?.trim();
  if (fromEnv) {
    const parsed = parseInt(fromEnv, 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return DIMENSIONS_BY_MODEL[model] ?? 1536;
}
