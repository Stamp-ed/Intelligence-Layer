import { Router } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import type { Prisma } from "@stamped/database";
import { prisma } from "../lib/prisma.js";
import {
  enrichCorpusEntities,
  getGraphStatus,
} from "../services/graph/graphService.js";
import { getSigmaGraphData } from "../services/graph/graphSigmaService.js";

export const graphRouter = Router();

graphRouter.get("/status", async (_req, res, next) => {
  try {
    res.json(await getGraphStatus());
  } catch (err) {
    next(err);
  }
});

graphRouter.get("/data", async (_req, res, next) => {
  try {
    res.json(await getSigmaGraphData());
  } catch (err) {
    next(err);
  }
});

const enrichSchema = z.object({
  enrich_entities: z.boolean().optional().default(true),
});

graphRouter.post("/rebuild", async (req, res, next) => {
  try {
    enrichSchema.parse(req.body ?? {});

    const job = await prisma.ingestionJob.create({
      data: {
        jobType: "graph_enrich_entities",
        status: "running",
        totalItems: 1,
        startedAt: new Date(),
      },
    });

    void (async () => {
      try {
        const result = await enrichCorpusEntities();
        await prisma.ingestionJob.update({
          where: { id: job.id },
          data: {
            status: "completed",
            processedItems: 1,
            completedAt: new Date(),
            metadata: result as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
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
    })();

    res.status(202).json({
      job_id: job.id,
      status: "running",
    });
  } catch (err) {
    next(err);
  }
});

graphRouter.get("/rebuild/:jobId", async (req, res, next) => {
  try {
    const job = await prisma.ingestionJob.findUnique({
      where: { id: req.params.jobId },
    });
    if (
      !job ||
      (job.jobType !== "graph_enrich_entities" &&
        !job.jobType.startsWith("graph_rebuild"))
    ) {
      throw new AppError(404, "not_found", "Graph job not found");
    }
    res.json({
      id: job.id,
      status: job.status,
      error_log: job.errorLog,
      metadata: job.metadata,
      completed_at: job.completedAt?.toISOString() ?? null,
    });
  } catch (err) {
    next(err);
  }
});
