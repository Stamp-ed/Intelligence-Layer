import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { checkOpenAIHealth } from "../lib/openai.js";
import { checkQdrantHealth, verifyQdrantVectorSize } from "../lib/qdrant.js";
import { generateEmbedding } from "../services/ingestion/embedder.js";
import { config } from "../config.js";
import { qdrant } from "../lib/qdrant.js";
import { getGraphStatus } from "../services/graph/graphService.js";
import { reindexAllVectors } from "../services/ingestion/reindexVectors.js";

export const adminRouter = Router();

adminRouter.get("/health", async (_req, res) => {
  const [postgres, qdrant, openai, graph, retrieval] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    checkQdrantHealth(),
    checkOpenAIHealth(),
    getGraphStatus().catch(() => null),
    checkRetrievalPipeline().catch(() => false),
  ]);

  const graphCorpus =
    graph && graph.document_count > 0 && graph.node_count > 0
      ? "ok"
      : graph && graph.document_count > 0
        ? "empty"
        : "missing";

  const healthy = postgres && qdrant;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    services: {
      postgres,
      qdrant,
      openai,
      retrieval,
      graph_corpus: graphCorpus,
    },
  });
});

async function checkRetrievalPipeline(): Promise<boolean> {
  await verifyQdrantVectorSize();
  const vector = await generateEmbedding("healthcheck");
  await qdrant.search(config.qdrantCollection, {
    vector,
    limit: 1,
    with_payload: false,
  });
  return true;
}

adminRouter.post("/reindex-vectors", async (_req, res, next) => {
  try {
    const result = await reindexAllVectors();
    res.json({
      status: "completed",
      ...result,
      message: `Re-indexed ${result.chunks} chunks from ${result.documents} documents into Qdrant.`,
    });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const [documentCount, chunkCount, entityCount, relationshipCount, jobCount, messageCount, graph] =
      await Promise.all([
        prisma.document.count(),
        prisma.chunk.count(),
        prisma.entity.count(),
        prisma.relationship.count(),
        prisma.ingestionJob.count(),
        prisma.message.count({ where: { role: "user" } }),
        getGraphStatus(),
      ]);

    res.json({
      documents: documentCount,
      chunks: chunkCount,
      entities: entityCount,
      relationships: relationshipCount,
      graph_corpus_nodes: graph.node_count,
      graph_corpus_edges: graph.edge_count,
      ingestion_jobs: jobCount,
      queries: messageCount,
    });
  } catch (err) {
    next(err);
  }
});
