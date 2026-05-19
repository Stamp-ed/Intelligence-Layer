import { openai } from "../../lib/openai.js";
import { resolveEmbeddingDimensions } from "../../lib/embeddingConfig.js";
import { getModelSettings } from "../admin/modelSettingsService.js";

const BATCH_SIZE = 100;

export async function generateEmbedding(text: string): Promise<number[]> {
  const settings = await getModelSettings();
  const response = await openai.embeddings.create({
    model: settings.embedding_model,
    input: text,
    dimensions: resolveEmbeddingDimensions(settings.embedding_model),
  });
  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const settings = await getModelSettings();
  const dimensions = resolveEmbeddingDimensions(settings.embedding_model);
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: settings.embedding_model,
      input: batch,
      dimensions,
    });
    const sorted = [...response.data].sort((a, b) => a.index - b.index);
    results.push(...sorted.map((d) => d.embedding));
  }

  return results;
}
