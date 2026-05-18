import { prisma } from "../../lib/prisma.js";
import { summarizeDocument } from "../ai/summarizer.js";
import { extractEntitiesForDocument } from "./entityExtractionService.js";
import { scheduleCorpusGraphRebuild } from "../graph/graphBuildService.js";

export async function enrichDocument(documentId: string): Promise<void> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      title: true,
      rawContent: true,
      summary: true,
    },
  });

  if (!document?.rawContent) return;

  try {
    if (!document.summary) {
      const summary = await summarizeDocument(
        document.title ?? "Untitled",
        document.rawContent,
      );
      await prisma.document.update({
        where: { id: documentId },
        data: { summary },
      });
    }
  } catch (err) {
    console.error(`Summary failed for ${documentId}:`, err);
  }

  try {
    await extractEntitiesForDocument(documentId);
  } catch (err) {
    console.error(`Entity extraction failed for ${documentId}:`, err);
  }

  scheduleCorpusGraphRebuild();
}
