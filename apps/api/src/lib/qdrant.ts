import { QdrantClient } from "@qdrant/js-client-rest";
import { config, getQdrantUrl } from "../config.js";

const VECTOR_SIZE = 1536;

export const qdrant = new QdrantClient({ url: getQdrantUrl() });

export async function ensureQdrantCollection(): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(
    (c) => c.name === config.qdrantCollection,
  );

  if (!exists) {
    await qdrant.createCollection(config.qdrantCollection, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
  }
}

export async function checkQdrantHealth(): Promise<boolean> {
  try {
    await qdrant.getCollections();
    return true;
  } catch {
    return false;
  }
}

export interface ChunkPayload {
  chunk_id: string;
  document_id: string;
  source_type: string;
  channel: string;
  author: string;
  tags: string[];
  ingested_at: string;
  title: string;
  chunk_text: string;
}

export async function upsertChunkVectors(
  points: Array<{
    id: string;
    vector: number[];
    payload: ChunkPayload;
  }>,
): Promise<void> {
  await qdrant.upsert(config.qdrantCollection, {
    wait: true,
    points: points.map((p) => ({
      id: p.id,
      vector: p.vector,
      payload: p.payload as unknown as Record<string, unknown>,
    })),
  });
}

export async function deleteChunkVectors(chunkIds: string[]): Promise<void> {
  if (chunkIds.length === 0) return;
  await qdrant.delete(config.qdrantCollection, {
    wait: true,
    points: chunkIds,
  });
}
