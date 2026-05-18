import type { Prisma } from "@stamped/database";
import { prisma } from "../../lib/prisma.js";
import { upsertChunkVectors, deleteChunkVectors } from "../../lib/qdrant.js";
import { sha256 } from "../../utils/hash.js";
import { countWords } from "../../utils/text.js";
import { chunkText } from "./chunker.js";
import { generateEmbeddings } from "./embedder.js";
import { deleteDocument } from "../documents/documentService.js";
import type { ParsedDocument } from "./parsers/textParser.js";

export interface IngestOptions {
  sourceId?: string;
  author?: string;
  channel?: string;
  url?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface IngestJobOptions {
  jobType?: string;
  skipJobCreation?: boolean;
}

export interface IngestResult {
  documentId: string;
  jobId: string;
  chunkCount: number;
  duplicate: boolean;
  replaced?: boolean;
}

async function resolveDuplicate(
  contentHash: string,
  sourceId?: string,
): Promise<{ existingId: string; duplicate: true } | { replaced: true } | null> {
  const byHash = await prisma.document.findFirst({
    where: { contentHash },
  });
  if (byHash) {
    return { existingId: byHash.id, duplicate: true };
  }

  if (!sourceId) return null;

  const bySource = await prisma.document.findFirst({
    where: { sourceId },
  });

  if (bySource && bySource.contentHash !== contentHash) {
    await deleteDocument(bySource.id);
    return { replaced: true };
  }

  return null;
}

export async function ingestParsedContent(
  parsed: ParsedDocument,
  options: IngestOptions = {},
  jobOptions: IngestJobOptions = {},
): Promise<IngestResult> {
  const contentHash = sha256(parsed.content);

  const duplicateCheck = await resolveDuplicate(contentHash, options.sourceId);
  if (duplicateCheck && "existingId" in duplicateCheck) {
    return {
      documentId: duplicateCheck.existingId,
      jobId: "",
      chunkCount: await prisma.chunk.count({
        where: { documentId: duplicateCheck.existingId },
      }),
      duplicate: true,
    };
  }

  const replaced = duplicateCheck?.replaced === true;

  const job = jobOptions.skipJobCreation
    ? null
    : await prisma.ingestionJob.create({
        data: {
          jobType: jobOptions.jobType ?? "file_upload",
          status: "running",
          totalItems: 1,
          startedAt: new Date(),
        },
      });

  try {
    const textChunks = chunkText(parsed.content);
    if (textChunks.length === 0) {
      throw new Error("No valid chunks produced from content");
    }

    const embeddings = await generateEmbeddings(textChunks.map((c) => c.text));

    const document = await prisma.document.create({
      data: {
        sourceType: parsed.sourceType,
        sourceId: options.sourceId,
        title: parsed.title,
        author: options.author,
        channel: options.channel ?? (parsed as ParsedDocument & { channel?: string }).channel,
        url: options.url,
        contentHash,
        rawContent: parsed.content,
        wordCount: countWords(parsed.content),
        ingestionStatus: "pending",
        metadata: (options.metadata ?? {}) as Prisma.InputJsonValue,
        tags: [],
      },
    });

    const chunkRecords = await prisma.$transaction(
      textChunks.map((tc) =>
        prisma.chunk.create({
          data: {
            documentId: document.id,
            chunkIndex: tc.index,
            chunkText: tc.text,
            embeddingId: null,
            tokenCount: tc.tokenCount,
            metadata: {},
          },
        }),
      ),
    );

    const ingestedAt = document.ingestedAt.toISOString();

    try {
      await upsertChunkVectors(
        chunkRecords.map((chunk, i) => ({
          id: chunk.id,
          vector: embeddings[i],
          payload: {
            chunk_id: chunk.id,
            document_id: document.id,
            source_type: document.sourceType,
            channel: document.channel ?? "",
            author: document.author ?? "",
            tags: document.tags,
            ingested_at: ingestedAt,
            title: document.title ?? "",
            chunk_text: chunk.chunkText,
          },
        })),
      );
    } catch (qdrantErr) {
      await prisma.chunk.deleteMany({ where: { documentId: document.id } });
      await prisma.document.delete({ where: { id: document.id } });
      throw qdrantErr;
    }

    await prisma.$transaction([
      ...chunkRecords.map((chunk) =>
        prisma.chunk.update({
          where: { id: chunk.id },
          data: { embeddingId: chunk.id },
        }),
      ),
      prisma.document.update({
        where: { id: document.id },
        data: { ingestionStatus: "processed" },
      }),
      ...(job
        ? [
            prisma.ingestionJob.update({
              where: { id: job.id },
              data: {
                status: "completed",
                processedItems: 1,
                completedAt: new Date(),
                metadata: { documentId: document.id, replaced },
              },
            }),
          ]
        : []),
    ]);

    void import("../entities/documentEnrichment.js").then(({ enrichDocument }) =>
      enrichDocument(document.id),
    );

    void import("../graph/graphBuildService.js").then(({ scheduleCorpusGraphRebuild }) =>
      scheduleCorpusGraphRebuild(),
    );

    return {
      documentId: document.id,
      jobId: job?.id ?? "",
      chunkCount: chunkRecords.length,
      duplicate: false,
      replaced,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (job) {
      await prisma.ingestionJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          failedItems: 1,
          errorLog: message,
          completedAt: new Date(),
        },
      });
    }
    throw err;
  }
}

export async function ingestTextContent(
  parsed: ParsedDocument,
  options: IngestOptions = {},
): Promise<IngestResult> {
  return ingestParsedContent(parsed, options);
}

export async function ingestFromBuffer(
  parsed: ParsedDocument,
  options: IngestOptions & { fileName?: string } = {},
): Promise<IngestResult> {
  return ingestParsedContent(parsed, {
    ...options,
    sourceId: options.sourceId ?? options.fileName,
  });
}

export async function deleteDocumentVectors(documentId: string): Promise<void> {
  const chunks = await prisma.chunk.findMany({
    where: { documentId },
    select: { id: true },
  });
  await deleteChunkVectors(chunks.map((c) => c.id));
}
