import { Router } from "express";
import { z } from "zod";
import {
  getEntityById,
  listEntities,
  searchEntities,
} from "../services/entities/entityService.js";

export const entitiesRouter = Router();

const listSchema = z.object({
  page: z.coerce.number().optional(),
  page_size: z.coerce.number().optional(),
  entity_type: z.string().optional(),
  search: z.string().optional(),
});

entitiesRouter.get("/", async (req, res, next) => {
  try {
    const query = listSchema.parse(req.query);
    const result = await listEntities(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

entitiesRouter.get("/search", async (req, res, next) => {
  try {
    const q = z.string().parse(req.query.q ?? "");
    const result = await searchEntities(q);
    res.json({ entities: result });
  } catch (err) {
    next(err);
  }
});

entitiesRouter.get("/:id", async (req, res, next) => {
  try {
    const entity = await getEntityById(req.params.id);
    res.json(entity);
  } catch (err) {
    next(err);
  }
});
