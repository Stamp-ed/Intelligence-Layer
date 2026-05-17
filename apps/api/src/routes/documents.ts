import type { Prisma } from "@stamped/database";
import { Router } from "express";
import {
  deleteDocument,
  getDistinctChannels,
  getDistinctSourceTypes,
  getDocumentById,
  listDocuments,
  updateDocumentMetadata,
} from "../services/documents/documentService.js";
import {
  documentListQuerySchema,
  documentPatchSchema,
} from "../schemas/documents.js";

export const documentsRouter = Router();

documentsRouter.get("/", async (req, res, next) => {
  try {
    const query = documentListQuerySchema.parse(req.query);
    const result = await listDocuments(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

documentsRouter.get("/filters", async (_req, res, next) => {
  try {
    const [source_types, channels] = await Promise.all([
      getDistinctSourceTypes(),
      getDistinctChannels(),
    ]);
    res.json({ source_types, channels });
  } catch (err) {
    next(err);
  }
});

documentsRouter.get("/:id", async (req, res, next) => {
  try {
    const document = await getDocumentById(req.params.id);
    res.json(document);
  } catch (err) {
    next(err);
  }
});

documentsRouter.patch("/:id", async (req, res, next) => {
  try {
    const body = documentPatchSchema.parse(req.body);
    const updated = await updateDocumentMetadata(req.params.id, {
      ...body,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

documentsRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteDocument(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
