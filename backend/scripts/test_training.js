import { TrainingService } from '../src/services/training/trainingService.js';
import { prisma } from '../src/utils/prisma.js';

async function testTraining() {
  const userId = 'b43cdda0-f3a1-4d17-8a60-d18d827e4b29';
  console.log('Testing TrainingService.getOverview for', userId);
  const overview = await TrainingService.getOverview(userId);
  console.log('Training Overview:', {
    sufficientData: overview.sufficientData,
    plan: overview.activePlan?.title,
    focusCategory: overview.activePlan?.focusCategory,
    targetWeakness: overview.activePlan?.targetWeakness,
    recentSessions: overview.recentSessions?.length,
    streak: overview.streak,
  });

  console.log('Testing TrainingService.getWeaknesses for', userId);
  const weaknesses = await TrainingService.getWeaknesses(userId);
  console.log('Weaknesses:', weaknesses);
}

testTraining().catch(console.error).finally(() => prisma.$disconnect());
