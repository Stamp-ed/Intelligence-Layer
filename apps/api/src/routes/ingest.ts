import type { Prisma } from "@stamped/database";
import { Router } from "express";
import multer from "multer";
import { config } from "../config.js";
import { AppError } from "../middleware/errorHandler.js";
import { ingestTextSchema, batchIngestSchema } from "../schemas/ingest.js";
import { parseDiscordExport } from "../services/ingestion/parsers/discordParser.js";
import { parseFileBuffer, SUPPORTED_EXTENSIONS, getFileExtension } from "../services/ingestion/parsers/fileParser.js";
import { parseText } from "../services/ingestion/parsers/textParser.js";
import { prisma } from "../lib/prisma.js";
import { runBatchIngestion } from "../services/ingestion/batchIngestion.js";
import { ingestFromBuffer, ingestParsedContent } from "../services/ingestion/ingestionService.js";

const ALLOWED_UPLOAD = [...SUPPORTED_EXTENSIONS, ".json"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploadMaxBytes },
  fileFilter: (_req, file, cb) => {
    const ext = getFileExtension(file.originalname);
    if (!ALLOWED_UPLOAD.includes(ext as (typeof ALLOWED_UPLOAD)[number])) {
      cb(new Error("Only .txt, .md, .pdf, .docx, and .json files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const ingestRouter = Router();

ingestRouter.post("/text", async (req, res, next) => {
  try {
    const body = ingestTextSchema.parse(req.body);
    const sourceType =
      body.source_type === "markdown"
        ? "markdown"
        : body.source_type === "discord"
          ? "discord"
          : "note";

    const parsed = parseText(body.content, {
      title: body.title,
      sourceType,
    });

    const result = await ingestParsedContent(
      parsed,
      {
        sourceId: body.source_id,
        author: body.author,
        channel: body.channel,
        url: body.url,
        metadata: body.metadata as Prisma.InputJsonValue | undefined,
      },
      { jobType: body.source_type === "discord" ? "discord_live" : "text_upload" },
    );

    res.status(result.duplicate ? 200 : 201).json({
      document_id: result.documentId,
      job_id: result.jobId,
      chunk_count: result.chunkCount,
      duplicate: result.duplicate,
      replaced: result.replaced ?? false,
    });
  } catch (err) {
    next(err);
  }
});

ingestRouter.post("/file", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(400, "missing_file", "No file uploaded");
    }

    const fileName = req.file.originalname;
    const ext = getFileExtension(fileName);

    if (ext === ".json") {
      throw new AppError(
        400,
        "invalid_file_type",
        "Use POST /api/v1/ingest/discord for Discord JSON exports",
      );
    }

    const parsed = await parseFileBuffer(req.file.buffer, fileName);
    let extraMeta: Record<string, unknown> = {};
    const rawMeta = req.body?.metadata;
    if (typeof rawMeta === "string" && rawMeta.trim()) {
      try {
        extraMeta = JSON.parse(rawMeta) as Record<string, unknown>;
      } catch {
        extraMeta = {};
      }
    } else if (rawMeta && typeof rawMeta === "object") {
      extraMeta = rawMeta as Record<string, unknown>;
    }

    const result = await ingestFromBuffer(parsed, {
      fileName,
      sourceId: (req.body?.source_id as string) || undefined,
      author: (req.body?.author as string) || undefined,
      channel: (req.body?.channel as string) || undefined,
      url: (req.body?.url as string) || undefined,
      metadata: {
        file_name: fileName,
        ...(parsed.metadata ?? {}),
        ...extraMeta,
      } as Prisma.InputJsonValue,
    });

    res.status(result.duplicate ? 200 : 201).json({
      document_id: result.documentId,
      job_id: result.jobId,
      chunk_count: result.chunkCount,
      duplicate: result.duplicate,
      replaced: result.replaced ?? false,
    });
  } catch (err) {
    next(err);
  }
});

ingestRouter.post("/discord", upload.single("file"), async (req, res, next) => {
  try {
    let jsonRaw: string;

    if (req.file) {
      jsonRaw = req.file.buffer.toString("utf8");
    } else if (typeof req.body?.content === "string") {
      jsonRaw = req.body.content;
    } else {
      throw new AppError(400, "missing_content", "Provide a JSON file or content field");
    }

    const parsed = parseDiscordExport(jsonRaw, {
      title: (req.body?.title as string) || undefined,
    });

    const result = await ingestParsedContent(parsed, {
      sourceId: `discord:${parsed.channel}:${parsed.title}`,
      channel: parsed.channel,
      metadata: parsed.metadata as Prisma.InputJsonValue,
    }, { jobType: "discord_batch" });

    res.status(result.duplicate ? 200 : 201).json({
      document_id: result.documentId,
      job_id: result.jobId,
      chunk_count: result.chunkCount,
      duplicate: result.duplicate,
      replaced: result.replaced ?? false,
      message_count: parsed.messageCount,
    });
  } catch (err) {
    next(err);
  }
});

ingestRouter.post("/batch", async (req, res, next) => {
  try {
    const body = batchIngestSchema.parse(req.body);
    const { jobId, results } = await runBatchIngestion(body.folder_path);
    res.status(202).json({
      job_id: jobId,
      total_files: results.length,
      results,
    });
  } catch (err) {
    next(err);
  }
});

ingestRouter.get("/jobs", async (_req, res, next) => {
  try {
    const jobs = await prisma.ingestionJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ jobs });
  } catch (err) {
    next(err);
  }
});

ingestRouter.get("/jobs/:id", async (req, res, next) => {
  try {
    const job = await prisma.ingestionJob.findUnique({
      where: { id: req.params.id },
    });
    if (!job) {
      throw new AppError(404, "not_found", "Ingestion job not found");
    }
    res.json(job);
  } catch (err) {
    next(err);
  }
});
