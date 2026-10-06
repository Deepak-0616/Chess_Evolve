import dotenv from "dotenv";
dotenv.config();

import { allWorkers, closeAllWorkers } from "./workers/index.js";
import { closeAllQueues } from "./queues/index.js";
import { disconnectPrisma } from "./utils/prisma.js";
import { closeRedis } from "./utils/redis.js";

console.log(`🚀 Chess Evolve BullMQ Worker Daemon started with ${allWorkers.length} active workers.`);

const shutdown = async (signal) => {
  console.log(`\n[Worker Daemon] Received ${signal}. Starting graceful shutdown...`);
  try {
    await closeAllWorkers();
    await closeAllQueues();
    await closeRedis();
    await disconnectPrisma();
    console.log("[Worker Daemon] Graceful shutdown complete. Exiting.");
    process.exit(0);
  } catch (err) {
    console.error("[Worker Daemon] Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
