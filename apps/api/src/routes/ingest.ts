import type { Prisma } from "@stamped/database";
import { Router } from "express";
import multer from "multer";
import { config } from "../config.js";
import { AppError } from "../middleware/errorHandler.js";
import { ingestTextSchema } from "../schemas/ingest.js";
import { parseMarkdown } from "../services/ingestion/parsers/markdownParser.js";
import { parseText } from "../services/ingestion/parsers/textParser.js";
import { prisma } from "../lib/prisma.js";
import { ingestFromBuffer, ingestTextContent } from "../services/ingestion/ingestionService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploadMaxBytes },
  fileFilter: (_req, file, cb) => {
    const allowed = [".txt", ".md", ".markdown"];
    const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    if (!allowed.includes(ext)) {
      cb(new Error("Only .txt and .md files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const ingestRouter = Router();

ingestRouter.post("/text", async (req, res, next) => {
  try {
    const body = ingestTextSchema.parse(req.body);
    const parsed = parseText(body.content, {
      title: body.title,
      sourceType: body.source_type === "markdown" ? "markdown" : "note",
    });

    const result = await ingestTextContent(parsed, {
      author: body.author,
      channel: body.channel,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
    });

    res.status(result.duplicate ? 200 : 201).json({
      document_id: result.documentId,
      job_id: result.jobId,
      chunk_count: result.chunkCount,
      duplicate: result.duplicate,
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

    const content = req.file.buffer.toString("utf8");
    const fileName = req.file.originalname;
    const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";

    const parsed =
      ext === ".md" || ext === ".markdown"
        ? parseMarkdown(content, { fileName })
        : parseText(content, { title: fileName, sourceType: "markdown" });

    const result = await ingestFromBuffer(content, parsed, {
      fileName,
      author: (req.body?.author as string) || undefined,
      channel: (req.body?.channel as string) || undefined,
    });

    res.status(result.duplicate ? 200 : 201).json({
      document_id: result.documentId,
      job_id: result.jobId,
      chunk_count: result.chunkCount,
      duplicate: result.duplicate,
    });
  } catch (err) {
    next(err);
  }
});

ingestRouter.get("/jobs", async (_req, res, next) => {
  try {
    const jobs = await prisma.ingestionJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
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
