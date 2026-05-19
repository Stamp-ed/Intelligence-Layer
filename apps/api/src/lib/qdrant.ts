import { QdrantClient } from "@qdrant/js-client-rest";
import { config, getQdrantClientOptions } from "../config.js";

export const qdrant = new QdrantClient(getQdrantClientOptions());

function readCollectionVectorSize(
  vectors: { size: number } | Record<string, { size: number }> | undefined,
): number | undefined {
  if (!vectors) return undefined;
  if ("size" in vectors && typeof vectors.size === "number") {
    return vectors.size;
  }
  const first = Object.values(vectors)[0];
  return first?.size;
}

export async function ensureQdrantCollection(): Promise<void> {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.some(
    (c) => c.name === config.qdrantCollection,
  );

  if (!exists) {
    await qdrant.createCollection(config.qdrantCollection, {
      vectors: { size: config.embeddingDimensions, distance: "Cosine" },
    });
    return;
  }

  await verifyQdrantVectorSize();
}

export async function verifyQdrantVectorSize(): Promise<void> {
  const info = await qdrant.getCollection(config.qdrantCollection);
  const size = readCollectionVectorSize(
    info.config?.params?.vectors as
      | { size: number }
      | Record<string, { size: number }>
      | undefined,
  );
  if (size != null && size !== config.embeddingDimensions) {
    throw new Error(
      `Qdrant collection "${config.qdrantCollection}" uses vector size ${size}, but ` +
        `EMBEDDING_MODEL=${config.embeddingModel} expects ${config.embeddingDimensions}. ` +
        "Recreate the collection or run POST /api/v1/admin/reindex-vectors after aligning EMBEDDING_MODEL.",
    );
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
