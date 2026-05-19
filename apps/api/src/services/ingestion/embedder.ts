import { openai } from "../../lib/openai.js";
import { config } from "../../config.js";

const BATCH_SIZE = 100;

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: config.embeddingModel,
    input: text,
    dimensions: config.embeddingDimensions,
  });
  return response.data[0].embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: config.embeddingModel,
      input: batch,
      dimensions: config.embeddingDimensions,
    });
    const sorted = [...response.data].sort((a, b) => a.index - b.index);
    results.push(...sorted.map((d) => d.embedding));
  }

  return results;
}
