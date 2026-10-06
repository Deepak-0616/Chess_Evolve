import { PrismaClient } from "@prisma/client";

// Global singleton pattern to prevent multiple PrismaClient instances in hot-reloading or multi-module environments
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log:
      process.env.LOG_LEVEL === "debug"
        ? ["query", "error", "warn"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
    console.log("[Prisma] Database connection closed cleanly.");
  } catch (err) {
    console.error("[Prisma] Error disconnecting:", err.message);
  }
}
