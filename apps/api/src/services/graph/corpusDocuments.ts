import type { Prisma } from "@stamped/database";
import { prisma } from "../../lib/prisma.js";

/** Documents that should appear in the uploaded-knowledge graph. */
export const corpusDocumentWhere: Prisma.DocumentWhereInput = {
  ingestionStatus: "processed",
  chunks: { some: {} },
};

export async function countCorpusDocuments(): Promise<number> {
  return prisma.document.count({ where: corpusDocumentWhere });
}

export async function listCorpusDocuments() {
  return prisma.document.findMany({
    where: corpusDocumentWhere,
    select: {
      id: true,
      title: true,
      sourceType: true,
      channel: true,
      author: true,
      ingestedAt: true,
      rawContent: true,
      chunks: {
        orderBy: { chunkIndex: "asc" },
        select: { chunkText: true },
      },
    },
  });
}

export async function resolveDocumentBody(
  doc: Awaited<ReturnType<typeof listCorpusDocuments>>[number],
): Promise<string> {
  const fromRaw = doc.rawContent?.trim();
  if (fromRaw) return fromRaw;
  return doc.chunks.map((c) => c.chunkText).join("\n\n").trim();
}
