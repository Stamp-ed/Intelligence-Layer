import { Router } from "express";
import { queryRequestSchema } from "../schemas/query.js";
import { retrieveAndAnswer } from "../services/ai/queryEngine.js";

export const queryRouter = Router();

queryRouter.post("/", async (req, res, next) => {
  try {
    const body = queryRequestSchema.parse(req.body);
    const response = await retrieveAndAnswer(body);
    res.json(response);
  } catch (err) {
    next(err);
  }
});
