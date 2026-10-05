import "dotenv/config";
import { prisma } from "./src/utils/prisma.js";
import { MLServiceBridge } from "./src/services/ml/mlService.js";

async function run() {
  const users = await prisma.user.findMany();
  for (const u of users) {
    console.log("Triggering PEAK_SELF for user:", u.id);
    try {
      await MLServiceBridge.triggerModelTraining(u.id, "PEAK_SELF");
      console.log("Triggered!");
    } catch (e) {
      console.error(e.message);
    }
  }
  prisma.$disconnect();
}

run();
