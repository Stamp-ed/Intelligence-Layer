import { z } from "zod";

export const documentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  page_size: z.coerce.number().int().min(1).max(100).optional(),
  source_type: z.string().optional(),
  channel: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sort_by: z.enum(["ingested_at", "title", "word_count", "source_type"]).optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
});

export const documentPatchSchema = z.object({
  title: z.string().min(1).optional(),
  author: z.string().optional(),
  channel: z.string().optional(),
  tags: z.array(z.string()).optional(),
  summary: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const batchIngestSchema = z.object({
  folder_path: z.string().min(1),
});
