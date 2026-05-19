import { config as loadEnv } from "dotenv";
import { resolve } from "path";

const repoRoot = resolve(process.cwd(), "../..");

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), "../../.env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), "../../.env") });

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://intelligence-layer.vercel.app",
  "https://intelligence-layer-seven.vercel.app",
];

function parseAllowedOrigins(): string[] {
  const fromEnv = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...fromEnv])];
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? process.env.API_PORT ?? "8000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",

  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  standardModel: process.env.STANDARD_MODEL ?? "gpt-4o-mini",
  strategicModel: process.env.STRATEGIC_MODEL ?? "gpt-4o",
  maxTokensAnswer: parseInt(process.env.MAX_TOKENS_ANSWER ?? "2048", 10),

  databaseUrl: process.env.DATABASE_URL ?? "",

  qdrantUrl: getQdrantUrl(),
  qdrantApiKey: process.env.QDRANT_API_KEY?.trim() || undefined,
  qdrantCollection: process.env.QDRANT_COLLECTION ?? "stamped_chunks",
  qdrantCloud: isQdrantCloudUrl(getQdrantUrl()),

  apiSecretKey: process.env.API_SECRET_KEY ?? "",
  allowedOrigins: parseAllowedOrigins(),

  chunkSize: parseInt(process.env.CHUNK_SIZE ?? "512", 10),
  chunkOverlap: parseInt(process.env.CHUNK_OVERLAP ?? "64", 10),
  minChunkSize: 100,

  uploadMaxBytes: 50 * 1024 * 1024,

  ingestBatchRoots: (process.env.INGEST_BATCH_ROOTS ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean),

  repoRoot,

  retrievalMinScore: parseFloat(process.env.RETRIEVAL_MIN_SCORE ?? "0.28"),
  retrievalSemanticLimit: parseInt(process.env.RETRIEVAL_SEMANTIC_LIMIT ?? "30", 10),
};

function normalizeQdrantUrl(raw: string): string {
  let url = raw.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(url)) {
    const isLocal =
      url === "localhost" ||
      url.startsWith("localhost:") ||
      url.startsWith("127.0.0.1") ||
      url === "qdrant";
    url = `${isLocal ? "http" : "https"}://${url}`;
  }
  return url;
}

function isQdrantCloudUrl(url: string): boolean {
  return /cloud\.qdrant\.io|\.qdrant\.io/i.test(url) && !/localhost|127\.0\.0\.1/i.test(url);
}

/** Qdrant connection: prefer QDRANT_URL (Cloud); else QDRANT_HOST + QDRANT_PORT (local Docker). */
export function getQdrantUrl(): string {
  const explicit = process.env.QDRANT_URL?.trim();
  if (explicit) {
    return normalizeQdrantUrl(explicit);
  }

  const host = process.env.QDRANT_HOST ?? "localhost";
  const port = process.env.QDRANT_PORT ?? "6333";
  const protocol =
    host === "localhost" || host === "127.0.0.1" || host === "qdrant"
      ? "http"
      : "https";
  return `${protocol}://${host}:${port}`;
}

export function getQdrantClientOptions(): {
  url: string;
  apiKey?: string;
  checkCompatibility: boolean;
} {
  const apiKey = process.env.QDRANT_API_KEY?.trim() || undefined;
  const url = getQdrantUrl();

  if (isQdrantCloudUrl(url) && !apiKey) {
    console.warn(
      "QDRANT_API_KEY is not set — Qdrant Cloud requires an API key from the cluster dashboard.",
    );
  }

  return {
    url,
    ...(apiKey ? { apiKey } : {}),
    // Node 22+ undici can throw "invalid onError method" on the compatibility probe fetch
    checkCompatibility: process.env.QDRANT_CHECK_COMPATIBILITY === "true",
  };
}
