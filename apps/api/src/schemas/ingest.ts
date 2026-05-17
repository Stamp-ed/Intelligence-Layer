import { z } from "zod";

export const ingestTextSchema = z.object({
  content: z.string().min(1),
  title: z.string().optional(),
  source_type: z.enum(["note", "markdown", "text"]).default("note"),
  author: z.string().optional(),
  channel: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type IngestTextInput = z.infer<typeof ingestTextSchema>;
