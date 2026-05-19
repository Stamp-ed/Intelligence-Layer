export interface OpenAiModelOption {
  id: string;
  label: string;
  description: string;
  /** Used for grouping in the admin UI */
  category: "general" | "reasoning" | "embedding";
}

/** Chat models for queries, summaries, and entity extraction */
export const OPENAI_CHAT_MODELS: OpenAiModelOption[] = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    description: "Fast and cost-effective — default for everyday Q&A",
    category: "general",
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    description: "Strong balance of quality, speed, and cost",
    category: "general",
  },
  {
    id: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    description: "Previous-generation flagship chat model",
    category: "general",
  },
  {
    id: "gpt-4.1-mini",
    label: "GPT-4.1 mini",
    description: "Newer efficient model for high-volume Q&A",
    category: "general",
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    description: "Newer high-quality model for complex answers",
    category: "general",
  },
  {
    id: "gpt-4.1-nano",
    label: "GPT-4.1 nano",
    description: "Lightweight option for simple retrieval Q&A",
    category: "general",
  },
  {
    id: "o4-mini",
    label: "o4-mini",
    description: "Reasoning-focused — slower, best for hard synthesis",
    category: "reasoning",
  },
  {
    id: "o3-mini",
    label: "o3-mini",
    description: "Reasoning-focused — multi-step analysis",
    category: "reasoning",
  },
  {
    id: "o1-mini",
    label: "o1-mini",
    description: "Reasoning-focused — compact reasoning model",
    category: "reasoning",
  },
];

export const OPENAI_EMBEDDING_MODELS: OpenAiModelOption[] = [
  {
    id: "text-embedding-3-small",
    label: "text-embedding-3-small",
    description: "1536 dimensions — default for semantic search",
    category: "embedding",
  },
  {
    id: "text-embedding-3-large",
    label: "text-embedding-3-large",
    description: "3072 dimensions — higher quality (requires reindex)",
    category: "embedding",
  },
  {
    id: "text-embedding-ada-002",
    label: "text-embedding-ada-002",
    description: "Legacy 1536-dim embeddings",
    category: "embedding",
  },
];

const CHAT_MODEL_IDS = new Set(OPENAI_CHAT_MODELS.map((m) => m.id));
const EMBEDDING_MODEL_IDS = new Set(OPENAI_EMBEDDING_MODELS.map((m) => m.id));

export function isAllowedChatModel(id: string): boolean {
  return CHAT_MODEL_IDS.has(id);
}

export function isAllowedEmbeddingModel(id: string): boolean {
  return EMBEDDING_MODEL_IDS.has(id);
}

export function isReasoningChatModel(model: string): boolean {
  return /^o\d/i.test(model) || model.startsWith("o1");
}
