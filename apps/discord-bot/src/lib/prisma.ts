import { PrismaClient } from "@stamped/database";

const globalForPrisma = globalThis as unknown as { discordPrisma: PrismaClient };

export const prisma =
  globalForPrisma.discordPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.discordPrisma = prisma;
}
