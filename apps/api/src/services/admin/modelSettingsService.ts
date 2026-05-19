import { config } from "../../config.js";
import {
  OPENAI_CHAT_MODELS,
  OPENAI_EMBEDDING_MODELS,
} from "../../constants/openaiModels.js";
import { resolveEmbeddingDimensions } from "../../lib/embeddingConfig.js";
import { prisma } from "../../lib/prisma.js";
import { verifyQdrantVectorSizeForModel } from "../../lib/qdrant.js";
import { AppError } from "../../middleware/errorHandler.js";

const CONFIG_ID = "default";

export interface ModelSettings {
  standard_model: string;
  strategic_model: string;
  embedding_model: string;
  embedding_dimensions: number;
  updated_at: string;
  env_defaults: {
    standard_model: string;
    strategic_model: string;
    embedding_model: string;
  };
}

async function ensureConfigRow() {
  const existing = await prisma.systemConfig.findUnique({
    where: { id: CONFIG_ID },
  });
  if (existing) return existing;

  return prisma.systemConfig.create({
    data: {
      id: CONFIG_ID,
      standardModel: config.standardModel,
      strategicModel: config.strategicModel,
      embeddingModel: config.embeddingModel,
    },
  });
}

function toSettings(row: {
  standardModel: string;
  strategicModel: string;
  embeddingModel: string;
  updatedAt: Date;
}): ModelSettings {
  return {
    standard_model: row.standardModel,
    strategic_model: row.strategicModel,
    embedding_model: row.embeddingModel,
    embedding_dimensions: resolveEmbeddingDimensions(row.embeddingModel),
    updated_at: row.updatedAt.toISOString(),
    env_defaults: {
      standard_model: config.standardModel,
      strategic_model: config.strategicModel,
      embedding_model: config.embeddingModel,
    },
  };
}

export async function getModelSettings(): Promise<ModelSettings> {
  const row = await ensureConfigRow();
  return toSettings(row);
}

export function getModelCatalog() {
  return {
    chat_models: OPENAI_CHAT_MODELS,
    embedding_models: OPENAI_EMBEDDING_MODELS,
  };
}

export async function updateModelSettings(input: {
  standard_model?: string;
  strategic_model?: string;
  embedding_model?: string;
}): Promise<ModelSettings> {
  const current = await ensureConfigRow();
  const nextEmbedding =
    input.embedding_model?.trim() ?? current.embeddingModel;

  if (input.embedding_model && input.embedding_model !== current.embeddingModel) {
    try {
      await verifyQdrantVectorSizeForModel(input.embedding_model);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(400, "embedding_mismatch", message);
    }
  }

  const updated = await prisma.systemConfig.update({
    where: { id: CONFIG_ID },
    data: {
      ...(input.standard_model
        ? { standardModel: input.standard_model.trim() }
        : {}),
      ...(input.strategic_model
        ? { strategicModel: input.strategic_model.trim() }
        : {}),
      ...(input.embedding_model
        ? { embeddingModel: nextEmbedding }
        : {}),
    },
  });

  return toSettings(updated);
}

/** Resolve which chat model to use for a query request */
export async function resolveQueryModel(
  synthesisLevel: "standard" | "strategic",
): Promise<string> {
  const settings = await getModelSettings();
  return synthesisLevel === "strategic"
    ? settings.strategic_model
    : settings.standard_model;
}
