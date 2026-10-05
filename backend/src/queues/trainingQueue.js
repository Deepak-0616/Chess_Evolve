import { Queue } from 'bullmq';
import { redisConfig } from '../utils/redis.js';

export const currentSelfTrainingQueue = new Queue('current-self-training', {
  connection: redisConfig
});
