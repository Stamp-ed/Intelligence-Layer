import type { Prisma } from "@stamped/database";
import { prisma } from "../../lib/prisma.js";
import { deleteChunkVectors } from "../../lib/qdrant.js";
import { AppError } from "../../middleware/errorHandler.js";
import { markGraphStale } from "../graph/graphBuildService.js";

export interface DocumentListQuery {
  page?: number;
  page_size?: number;
  source_type?: string;
  channel?: string;
  tag?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: "ingested_at" | "title" | "word_count" | "source_type";
  sort_order?: "asc" | "desc";
}

export async function listDocuments(query: DocumentListQuery) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.page_size ?? 50));
  const skip = (page - 1) * pageSize;

  const where: Prisma.DocumentWhereInput = {};

  if (query.source_type) {
    where.sourceType = query.source_type;
  }
  if (query.channel) {
    where.channel = { contains: query.channel, mode: "insensitive" };
  }
  if (query.tag) {
    where.tags = { has: query.tag };
  }
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: "insensitive" } },
      { rawContent: { contains: query.search, mode: "insensitive" } },
    ];
  }
  if (query.date_from || query.date_to) {
    where.ingestedAt = {};
    if (query.date_from) where.ingestedAt.gte = new Date(query.date_from);
    if (query.date_to) where.ingestedAt.lte = new Date(query.date_to);
  }

  const sortBy = query.sort_by ?? "ingested_at";
  const sortOrder = query.sort_order ?? "desc";
  const orderBy: Prisma.DocumentOrderByWithRelationInput =
    sortBy === "title"
      ? { title: sortOrder }
      : sortBy === "word_count"
        ? { wordCount: sortOrder }
        : sortBy === "source_type"
          ? { sourceType: sortOrder }
          : { ingestedAt: sortOrder };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        sourceType: true,
        channel: true,
        author: true,
        wordCount: true,
        tags: true,
        ingestedAt: true,
        summary: true,
        ingestionStatus: true,
      },
    }),
    prisma.document.count({ where }),
  ]);

  return {
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title ?? "Untitled",
      source_type: d.sourceType,
      channel: d.channel,
      author: d.author,
      word_count: d.wordCount ?? 0,
      tags: d.tags,
      ingested_at: d.ingestedAt.toISOString(),
      summary: d.summary ?? "",
      ingestion_status: d.ingestionStatus,
    })),
    total,
    page,
    page_size: pageSize,
  };
}

export async function getDocumentById(id: string) {
  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      chunks: { orderBy: { chunkIndex: "asc" } },
    },
  });

  if (!document) {
    throw new AppError(404, "not_found", "Document not found");
  }

  return {
    id: document.id,
    source_type: document.sourceType,
    source_id: document.sourceId,
    title: document.title,
    author: document.author,
    channel: document.channel,
    url: document.url,
    content_hash: document.contentHash,
    raw_content: document.rawContent,
    summary: document.summary,
    tags: document.tags,
    word_count: document.wordCount,
    ingested_at: document.ingestedAt.toISOString(),
    updated_at: document.updatedAt.toISOString(),
    ingestion_status: document.ingestionStatus,
    metadata: document.metadata,
    chunks: document.chunks.map((c) => ({
      id: c.id,
      chunk_index: c.chunkIndex,
      chunk_text: c.chunkText,
      token_count: c.tokenCount,
      metadata: c.metadata,
      created_at: c.createdAt.toISOString(),
    })),
  };
}

export async function deleteDocument(id: string): Promise<void> {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    throw new AppError(404, "not_found", "Document not found");
  }

  const chunks = await prisma.chunk.findMany({
    where: { documentId: id },
    select: { id: true },
  });

  await deleteChunkVectors(chunks.map((c) => c.id));
  await prisma.document.delete({ where: { id } });
  markGraphStale("corpus");
}

export async function updateDocumentMetadata(
  id: string,
  data: {
    title?: string;
    author?: string;
    channel?: string;
    tags?: string[];
    summary?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, "not_found", "Document not found");
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      title: data.title,
      author: data.author,
      channel: data.channel,
      tags: data.tags,
      summary: data.summary,
      metadata: data.metadata,
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    author: updated.author,
    channel: updated.channel,
    tags: updated.tags,
    summary: updated.summary,
    metadata: updated.metadata,
  };
}

export async function getDistinctChannels(): Promise<string[]> {
  const rows = await prisma.document.findMany({
    where: { channel: { not: null } },
    select: { channel: true },
    distinct: ["channel"],
  });
  return rows
    .map((r) => r.channel)
    .filter((c): c is string => Boolean(c))
    .sort();
}

export async function getDistinctSourceTypes(): Promise<string[]> {
  const rows = await prisma.document.findMany({
    select: { sourceType: true },
    distinct: ["sourceType"],
  });
  return rows.map((r) => r.sourceType).sort();
}
