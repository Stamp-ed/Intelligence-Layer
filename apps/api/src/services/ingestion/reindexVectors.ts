import { prisma } from "../../lib/prisma.js";
import { upsertChunkVectors } from "../../lib/qdrant.js";
import { generateEmbeddings } from "./embedder.js";

const CHUNK_BATCH = 50;

export interface ReindexVectorsResult {
  documents: number;
  chunks: number;
  batches: number;
}

/**
 * Re-embed all chunks from Postgres and upsert into Qdrant (e.g. after migrating to Qdrant Cloud).
 * Does not create new documents or skip on content-hash duplicates.
 */
export async function reindexAllVectors(): Promise<ReindexVectorsResult> {
  const chunks = await prisma.chunk.findMany({
    include: {
      document: {
        select: {
          id: true,
          title: true,
          sourceType: true,
          channel: true,
          author: true,
          tags: true,
          ingestedAt: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  if (chunks.length === 0) {
    return { documents: 0, chunks: 0, batches: 0 };
  }

  const documentIds = new Set(chunks.map((c) => c.documentId));
  let batches = 0;

  for (let i = 0; i < chunks.length; i += CHUNK_BATCH) {
    const slice = chunks.slice(i, i + CHUNK_BATCH);
    const embeddings = await generateEmbeddings(slice.map((c) => c.chunkText));

    await upsertChunkVectors(
      slice.map((chunk, idx) => ({
        id: chunk.id,
        vector: embeddings[idx],
        payload: {
          chunk_id: chunk.id,
          document_id: chunk.documentId,
          source_type: chunk.document.sourceType,
          channel: chunk.document.channel ?? "",
          author: chunk.document.author ?? "",
          tags: chunk.document.tags,
          ingested_at: chunk.document.ingestedAt.toISOString(),
          title: chunk.document.title ?? "",
          chunk_text: chunk.chunkText,
        },
      })),
    );

    batches += 1;
  }

  return {
    documents: documentIds.size,
    chunks: chunks.length,
    batches,
  };
}
