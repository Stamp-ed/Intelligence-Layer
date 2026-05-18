import { config as loadEnv } from "dotenv";
import { resolve } from "path";

const repoRoot = resolve(process.cwd(), "../..");

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), "../../.env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), "../../.env") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.API_PORT ?? "8000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",

  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  embeddingModel: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  standardModel: process.env.STANDARD_MODEL ?? "gpt-4o-mini",
  strategicModel: process.env.STRATEGIC_MODEL ?? "gpt-4o",
  maxTokensAnswer: parseInt(process.env.MAX_TOKENS_ANSWER ?? "2048", 10),

  databaseUrl: process.env.DATABASE_URL ?? "",

  qdrantHost: process.env.QDRANT_HOST ?? "localhost",
  qdrantPort: parseInt(process.env.QDRANT_PORT ?? "6333", 10),
  qdrantCollection: process.env.QDRANT_COLLECTION ?? "stamped_chunks",

  apiSecretKey: process.env.API_SECRET_KEY ?? "",
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

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

export function getQdrantUrl(): string {
  return `http://${config.qdrantHost}:${config.qdrantPort}`;
}
