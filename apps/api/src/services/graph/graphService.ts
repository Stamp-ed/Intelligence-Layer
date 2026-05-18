import { prisma } from "../../lib/prisma.js";
import {
  corpusDocumentWhere,
  countCorpusDocuments,
} from "./corpusDocuments.js";
import { buildCorpusSigmaGraph } from "./graphSigmaService.js";

export interface GraphStatus {
  graph_type: "corpus";
  built_at: string | null;
  node_count: number;
  edge_count: number;
  corpus_file_count: number;
  document_count: number;
  needs_rebuild: boolean;
  source: string;
}

export async function getGraphStatus(): Promise<GraphStatus> {
  const documentCount = await countCorpusDocuments();
  const graph = await buildCorpusSigmaGraph();

  return {
    graph_type: "corpus",
    built_at: null,
    node_count: graph.nodes.length,
    edge_count: graph.edges.length,
    corpus_file_count: documentCount,
    document_count: documentCount,
    needs_rebuild: false,
    source: "postgres",
  };
}

export async function enrichCorpusEntities(): Promise<{
  documents_processed: number;
}> {
  const docs = await prisma.document.findMany({
    where: {
      AND: [
        corpusDocumentWhere,
        {
          OR: [
            { summary: null },
            { chunks: { some: { entityMentions: { none: {} } } } },
          ],
        },
      ],
    },
    select: { id: true },
  });

  const { enrichDocument } = await import("../entities/documentEnrichment.js");
  for (const doc of docs) {
    await enrichDocument(doc.id);
  }

  return { documents_processed: docs.length };
}
