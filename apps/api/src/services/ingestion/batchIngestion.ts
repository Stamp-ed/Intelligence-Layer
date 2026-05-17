import type { Prisma } from "@stamped/database";
import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/errorHandler.js";
import { config } from "../../config.js";
import { parseFileBuffer, SUPPORTED_EXTENSIONS, getFileExtension } from "./parsers/fileParser.js";
import { ingestParsedContent, type IngestOptions } from "./ingestionService.js";
import type { ParsedDocument } from "./parsers/textParser.js";

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
    } else if (entry.isFile()) {
      const ext = getFileExtension(entry.name);
      if (SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function resolveSafePath(folderPath: string): string {
  const resolved = path.resolve(folderPath);
  const allowedRoots = config.ingestBatchRoots.map((r) => path.resolve(r));

  if (allowedRoots.length === 0) {
    return resolved;
  }

  const allowed = allowedRoots.some(
    (root) => resolved === root || resolved.startsWith(root + path.sep),
  );

  if (!allowed) {
    throw new AppError(
      403,
      "path_not_allowed",
      "Folder path is outside allowed ingest roots",
    );
  }

  return resolved;
}

export interface BatchFileResult {
  file: string;
  status: "completed" | "failed" | "duplicate" | "skipped";
  document_id?: string;
  chunk_count?: number;
  error?: string;
}

export async function runBatchIngestion(folderPath: string): Promise<{
  jobId: string;
  results: BatchFileResult[];
}> {
  const root = resolveSafePath(folderPath);
  const rootStat = await stat(root).catch(() => null);
  if (!rootStat?.isDirectory()) {
    throw new AppError(400, "invalid_path", "Folder path does not exist or is not a directory");
  }

  const files = await collectFiles(root);
  const job = await prisma.ingestionJob.create({
    data: {
      jobType: "folder_scan",
      status: "running",
      totalItems: files.length,
      startedAt: new Date(),
      metadata: { folderPath: root },
    },
  });

  const results: BatchFileResult[] = [];
  let processed = 0;
  let failed = 0;

  for (const filePath of files) {
    const relativeFile = path.relative(root, filePath);
    try {
      const buffer = await readFile(filePath);
      const parsed = await parseFileBuffer(buffer, path.basename(filePath));
      const ingestResult = await ingestParsedContent(
        parsed as ParsedDocument,
        {
          sourceId: relativeFile,
          metadata: {
            batch_job_id: job.id,
            file_path: relativeFile,
            ...(parsed.metadata ?? {}),
          },
        },
        { jobType: "folder_scan", skipJobCreation: true },
      );

      results.push({
        file: relativeFile,
        status: ingestResult.duplicate ? "duplicate" : "completed",
        document_id: ingestResult.documentId,
        chunk_count: ingestResult.chunkCount,
      });
      processed += 1;
    } catch (err) {
      failed += 1;
      results.push({
        file: relativeFile,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }

    await prisma.ingestionJob.update({
      where: { id: job.id },
      data: {
        processedItems: processed + failed,
        failedItems: failed,
        metadata: { folderPath: root, results } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  await prisma.ingestionJob.update({
    where: { id: job.id },
    data: {
      status: failed === files.length && files.length > 0 ? "failed" : "completed",
      processedItems: processed,
      failedItems: failed,
      completedAt: new Date(),
      metadata: { folderPath: root, results } as unknown as Prisma.InputJsonValue,
      errorLog: failed > 0 ? `${failed} file(s) failed` : null,
    },
  });

  return { jobId: job.id, results };
}
