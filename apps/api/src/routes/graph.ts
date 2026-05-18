import { Router } from "express";
import { readFile } from "fs/promises";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler.js";
import type { Prisma } from "@stamped/database";
import { prisma } from "../lib/prisma.js";
import {
  getBothGraphStatuses,
  getGraphStatus,
  rebuildGraph,
} from "../services/graph/graphBuildService.js";
import { getGraphInsights } from "../services/graph/graphInsightsService.js";
import { getSigmaGraphData } from "../services/graph/graphSigmaService.js";
import {
  type GraphTarget,
  getGraphHtmlPath,
} from "../services/graph/graphPaths.js";

export const graphRouter = Router();

const targetSchema = z.enum(["project", "corpus"]);

function parseTarget(value: unknown): GraphTarget {
  const parsed = targetSchema.safeParse(value);
  return parsed.success ? parsed.data : "corpus";
}

graphRouter.get("/status", async (req, res, next) => {
  try {
    const all = req.query.all === "true";
    if (all) {
      res.json(await getBothGraphStatuses());
      return;
    }
    const target = parseTarget(req.query.target);
    res.json(await getGraphStatus(target));
  } catch (err) {
    next(err);
  }
});

graphRouter.get("/insights", async (req, res, next) => {
  try {
    const target = parseTarget(req.query.target);
    res.json(await getGraphInsights(target));
  } catch (err) {
    next(err);
  }
});

graphRouter.get("/data", async (req, res, next) => {
  try {
    const target = parseTarget(req.query.target);
    res.json(await getSigmaGraphData(target));
  } catch (err) {
    next(err);
  }
});

graphRouter.get("/view", async (req, res, next) => {
  try {
    const target = parseTarget(req.query.target);
    const html = await readFile(getGraphHtmlPath(target), "utf-8");
    res.type("html").send(html);
  } catch {
    next(
      new AppError(
        404,
        "not_found",
        "Graph not built yet. Run rebuild for this graph type.",
      ),
    );
  }
});

const rebuildSchema = z.object({
  target: targetSchema.default("corpus"),
  enrich_entities: z.boolean().optional().default(false),
});

graphRouter.post("/rebuild", async (req, res, next) => {
  try {
    const body = rebuildSchema.parse(req.body ?? {});

    const job = await prisma.ingestionJob.create({
      data: {
        jobType: `graph_rebuild_${body.target}`,
        status: "running",
        totalItems: 1,
        startedAt: new Date(),
        metadata: { target: body.target },
      },
    });

    void (async () => {
      try {
        const meta = await rebuildGraph({
          target: body.target,
          enrichEntities: body.enrich_entities,
        });
        await prisma.ingestionJob.update({
          where: { id: job.id },
          data: {
            status: "completed",
            processedItems: 1,
            completedAt: new Date(),
            metadata: meta as unknown as Prisma.InputJsonValue,
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
      target: body.target,
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
    if (!job || !job.jobType.startsWith("graph_rebuild")) {
      throw new AppError(404, "not_found", "Graph rebuild job not found");
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
