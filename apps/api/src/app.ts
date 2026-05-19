import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { isAllowedCorsOrigin } from "./lib/cors.js";
import { requireApiKey } from "./middleware/apiAuth.js";
import { AppError, errorHandler } from "./middleware/errorHandler.js";
import { ingestRouter } from "./routes/ingest.js";
import { queryRouter } from "./routes/query.js";
import { adminRouter } from "./routes/admin.js";
import { documentsRouter } from "./routes/documents.js";
import { graphRouter } from "./routes/graph.js";
import { entitiesRouter } from "./routes/entities.js";
import { conversationsRouter } from "./routes/conversations.js";

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedCorsOrigin(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1/ingest", requireApiKey, ingestRouter);
  app.use("/api/v1/query", queryRouter);
  app.use("/api/v1/conversations", conversationsRouter);
  app.use("/api/v1/documents", documentsRouter);
  app.use("/api/v1/graph", graphRouter);
  app.use("/api/v1/entities", entitiesRouter);
  app.use("/api/v1/admin", adminRouter);

  app.use((err: unknown, _req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (err instanceof Error && err.message.includes("allowed")) {
      next(new AppError(400, "invalid_file_type", err.message));
      return;
    }
    next(err);
  });

  app.use(errorHandler);

  return app;
}
