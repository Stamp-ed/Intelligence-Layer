import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { checkOpenAIHealth } from "../lib/openai.js";
import { checkQdrantHealth } from "../lib/qdrant.js";
import { getBothGraphStatuses } from "../services/graph/graphBuildService.js";
import { getGraphJsonPath } from "../services/graph/graphPaths.js";
import { access } from "fs/promises";
import { constants } from "fs";

export const adminRouter = Router();

adminRouter.get("/health", async (_req, res) => {
  const [postgres, qdrant, openai, graphs] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    checkQdrantHealth(),
    checkOpenAIHealth(),
    getBothGraphStatuses(),
  ]);

  async function graphHealth(
    target: "project" | "corpus",
  ): Promise<"ok" | "missing" | "stale"> {
    try {
      await access(getGraphJsonPath(target), constants.F_OK);
      return graphs[target].needs_rebuild ? "stale" : "ok";
    } catch {
      return "missing";
    }
  }

  const [graphProject, graphCorpus] = await Promise.all([
    graphHealth("project"),
    graphHealth("corpus"),
  ]);

  const healthy = postgres && qdrant;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    services: {
      postgres,
      qdrant,
      openai,
      graph_project: graphProject,
      graph_corpus: graphCorpus,
    },
  });
});

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const [documentCount, chunkCount, entityCount, relationshipCount, jobCount, messageCount, graphs] =
      await Promise.all([
        prisma.document.count(),
        prisma.chunk.count(),
        prisma.entity.count(),
        prisma.relationship.count(),
        prisma.ingestionJob.count(),
        prisma.message.count({ where: { role: "user" } }),
        getBothGraphStatuses(),
      ]);

    res.json({
      documents: documentCount,
      chunks: chunkCount,
      entities: entityCount,
      relationships: relationshipCount,
      graph_project_nodes: graphs.project.node_count,
      graph_project_edges: graphs.project.edge_count,
      graph_corpus_nodes: graphs.corpus.node_count,
      graph_corpus_edges: graphs.corpus.edge_count,
      ingestion_jobs: jobCount,
      queries: messageCount,
    });
  } catch (err) {
    next(err);
  }
});
