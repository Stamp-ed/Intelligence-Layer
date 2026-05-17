import { z } from "zod";

export const queryFiltersSchema = z.object({
  source_types: z.array(z.string()).optional(),
  channels: z.array(z.string()).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

export const queryRequestSchema = z.object({
  query: z.string().min(1),
  conversation_id: z.string().uuid().optional(),
  filters: queryFiltersSchema.optional(),
  max_sources: z.number().int().min(1).max(20).default(5),
  synthesis_level: z.enum(["standard", "strategic"]).default("standard"),
});

export type QueryRequest = z.infer<typeof queryRequestSchema>;
