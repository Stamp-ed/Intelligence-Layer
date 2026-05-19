import { createApp } from "./app.js";
import { config, getQdrantClientOptions } from "./config.js";
import { connectPrisma, disconnectPrisma } from "./lib/prisma.js";
import { ensureQdrantCollection } from "./lib/qdrant.js";

async function main() {
  await connectPrisma();
  await ensureQdrantCollection();

  const app = createApp();

  const server = app.listen(config.port, () => {
    const qdrant = getQdrantClientOptions();
    const qdrantLabel = config.qdrantCloud ? "Qdrant Cloud" : "Qdrant";
    console.log(
      `Stamped Intelligence API listening on port ${config.port} (${qdrantLabel}: ${qdrant.url})`,
    );
  });

  const shutdown = async () => {
    console.log("Shutting down...");
    server.close();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
