import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { checkOpenAIHealth } from "../lib/openai.js";
import { checkQdrantHealth } from "../lib/qdrant.js";

export const adminRouter = Router();

adminRouter.get("/health", async (_req, res) => {
  const [postgres, qdrant, openai] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    checkQdrantHealth(),
    checkOpenAIHealth(),
  ]);

  const healthy = postgres && qdrant;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    services: {
      postgres,
      qdrant,
      openai,
    },
  });
});

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const [documentCount, chunkCount, entityCount, jobCount, messageCount] =
      await Promise.all([
        prisma.document.count(),
        prisma.chunk.count(),
        prisma.entity.count(),
        prisma.ingestionJob.count(),
        prisma.message.count({ where: { role: "user" } }),
      ]);

    res.json({
      documents: documentCount,
      chunks: chunkCount,
      entities: entityCount,
      ingestion_jobs: jobCount,
      queries: messageCount,
    });
  } catch (err) {
    next(err);
  }
});
