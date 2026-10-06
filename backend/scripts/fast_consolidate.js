import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const oldUserId = 'b2ea5969-f4a9-4fb6-9228-10a3bd42adcf';
  const newUserId = 'b43cdda0-f3a1-4d17-8a60-d18d827e4b29';

  console.log(`Starting fast consolidation from ${oldUserId} to ${newUserId}...`);

  // 1. Move games from old profile to new profile
  const oldProfile = await prisma.chessProfile.findUnique({ where: { userId: oldUserId } });
  const newProfile = await prisma.chessProfile.findUnique({ where: { userId: newUserId } });

  if (oldProfile && newProfile) {
    const updatedGames = await prisma.$executeRawUnsafe(`
      UPDATE "Game" 
      SET "chessProfileId" = '${newProfile.id}' 
      WHERE "chessProfileId" = '${oldProfile.id}'
      AND "id" NOT IN (SELECT "id" FROM "Game" WHERE "chessProfileId" = '${newProfile.id}')
    `);
    console.log(`Updated games to new profile:`, updatedGames);
  }

  // 2. Transfer MLModelVersions
  const updatedModels = await prisma.$executeRawUnsafe(`
    UPDATE "MLModelVersion"
    SET "userId" = '${newUserId}'
    WHERE "userId" = '${oldUserId}'
  `);
  console.log(`Updated MLModelVersions:`, updatedModels);

  // 3. Transfer TrainingPlan
  const updatedPlans = await prisma.$executeRawUnsafe(`
    UPDATE "TrainingPlan"
    SET "userId" = '${newUserId}'
    WHERE "userId" = '${oldUserId}'
  `);
  console.log(`Updated TrainingPlans:`, updatedPlans);

  // 4. Transfer TrainingSessions
  const updatedSessions = await prisma.$executeRawUnsafe(`
    UPDATE "TrainingSession"
    SET "userId" = '${newUserId}'
    WHERE "userId" = '${oldUserId}'
  `);
  console.log(`Updated TrainingSessions:`, updatedSessions);

  // 5. Transfer ChessDNA if new user doesn't have it, or update it
  const oldDna = await prisma.chessDNA.findUnique({ where: { userId: oldUserId } });
  if (oldDna) {
    await prisma.chessDNA.deleteMany({ where: { userId: newUserId } });
    await prisma.$executeRawUnsafe(`
      UPDATE "ChessDNA"
      SET "userId" = '${newUserId}'
      WHERE "userId" = '${oldUserId}'
    `);
    console.log(`Transferred ChessDNA`);
  }

  // 6. Check counts on new user
  const newGamesCount = await prisma.game.count({ where: { chessProfile: { userId: newUserId } } });
  const newModels = await prisma.mLModelVersion.findMany({ where: { userId: newUserId } });
  const newPlans = await prisma.trainingPlan.count({ where: { userId: newUserId } });
  const hasDna = await prisma.chessDNA.findUnique({ where: { userId: newUserId } });

  console.log({
    newGamesCount,
    models: newModels.map(m => ({ type: m.modelType, version: m.version, status: m.status, isActive: m.isActive })),
    newPlans,
    hasDna: !!hasDna
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
