import { z } from "zod";
import {
  isAllowedChatModel,
  isAllowedEmbeddingModel,
} from "../constants/openaiModels.js";

export const updateModelSettingsSchema = z
  .object({
    standard_model: z.string().min(1).optional(),
    strategic_model: z.string().min(1).optional(),
    embedding_model: z.string().min(1).optional(),
  })
  .refine(
    (body) =>
      body.standard_model != null ||
      body.strategic_model != null ||
      body.embedding_model != null,
    { message: "At least one model field is required" },
  )
  .refine(
    (body) =>
      body.standard_model == null || isAllowedChatModel(body.standard_model),
    { message: "Invalid standard_model", path: ["standard_model"] },
  )
  .refine(
    (body) =>
      body.strategic_model == null || isAllowedChatModel(body.strategic_model),
    { message: "Invalid strategic_model", path: ["strategic_model"] },
  )
  .refine(
    (body) =>
      body.embedding_model == null ||
      isAllowedEmbeddingModel(body.embedding_model),
    { message: "Invalid embedding_model", path: ["embedding_model"] },
  );
