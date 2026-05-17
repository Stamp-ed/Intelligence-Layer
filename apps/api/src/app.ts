import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { AppError, errorHandler } from "./middleware/errorHandler.js";
import { ingestRouter } from "./routes/ingest.js";
import { queryRouter } from "./routes/query.js";
import { adminRouter } from "./routes/admin.js";

export function createApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.allowedOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1/ingest", ingestRouter);
  app.use("/api/v1/query", queryRouter);
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
