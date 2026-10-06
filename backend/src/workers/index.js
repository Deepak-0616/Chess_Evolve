import { syncWorker } from "./syncWorker.js";
import { featureWorker } from "./featureWorker.js";
import { datasetWorker } from "./datasetWorker.js";
import { trainingWorker } from "./trainingWorker.js";
import { retrainingWorker } from "./retrainingWorker.js";

export const allWorkers = [
  syncWorker,
  featureWorker,
  datasetWorker,
  trainingWorker,
  retrainingWorker,
];

export async function closeAllWorkers() {
  console.log("[Workers] Shutting down workers gracefully...");
  await Promise.allSettled(allWorkers.map((w) => w.close()));
  console.log("[Workers] All BullMQ workers closed cleanly.");
}

export {
  syncWorker,
  featureWorker,
  datasetWorker,
  trainingWorker,
  retrainingWorker,
};
