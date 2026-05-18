import { Router } from "express";
import {
  deleteConversation,
  getConversation,
  listConversations,
} from "../services/ai/conversationService.js";

export const conversationsRouter = Router();

conversationsRouter.get("/", async (_req, res, next) => {
  try {
    const conversations = await listConversations();
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

conversationsRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await getConversation(req.params.id));
  } catch (err) {
    next(err);
  }
});

conversationsRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteConversation(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
