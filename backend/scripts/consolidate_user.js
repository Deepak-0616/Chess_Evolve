import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function runWithRetry(fn, maxRetries = 5, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      console.warn(`Attempt ${i + 1} failed: ${e.message}. Retrying in ${delay}ms...`);
      if (i === maxRetries - 1) throw e;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function consolidate() {
  const oldUserId = 'b2ea5969-f4a9-4fb6-9228-10a3bd42adcf';
  const newUserId = 'b43cdda0-f3a1-4d17-8a60-d18d827e4b29';

  console.log(`Consolidating data from ${oldUserId} to ${newUserId}...`);

  const oldProfile = await runWithRetry(() => prisma.chessProfile.findUnique({ where: { userId: oldUserId } }));
  const newProfile = await runWithRetry(() => prisma.chessProfile.findUnique({ where: { userId: newUserId } }));

  console.log('Old profile:', oldProfile?.id, 'New profile:', newProfile?.id);

  if (oldProfile && newProfile) {
    const oldGames = await runWithRetry(() => prisma.game.findMany({
      where: { chessProfileId: oldProfile.id }
    }));
    console.log(`Found ${oldGames.length} games on old profile.`);

    let movedCount = 0;
    for (const g of oldGames) {
      const existsOnNew = await runWithRetry(() => prisma.game.findUnique({
        where: { id: g.id }
      }));
      if (existsOnNew && existsOnNew.chessProfileId !== newProfile.id) {
        await runWithRetry(() => prisma.game.update({
          where: { id: g.id },
          data: { chessProfileId: newProfile.id }
        }));
        movedCount++;
      }
    }
    console.log(`Moved ${movedCount} games to new profile.`);
  }

  // 2. Migrate MLModelVersion records
  const oldModels = await runWithRetry(() => prisma.mLModelVersion.findMany({
    where: { userId: oldUserId }
  }));
  console.log(`Found ${oldModels.length} models on old user.`);
  for (const m of oldModels) {
    const exists = await runWithRetry(() => prisma.mLModelVersion.findUnique({
      where: {
        userId_modelType_version: {
          userId: newUserId,
          modelType: m.modelType,
          version: m.version
        }
      }
    }));
    if (!exists) {
      await runWithRetry(() => prisma.mLModelVersion.create({
        data: {
          userId: newUserId,
          modelType: m.modelType,
          version: m.version,
          status: m.status,
          isActive: m.isActive,
          accuracy: m.accuracy,
          loss: m.loss,
          modelArtifactUri: m.modelArtifactUri,
          metrics: m.metrics || undefined,
          trainingConfig: m.trainingConfig || undefined,
          gamesUsed: m.gamesUsed,
          positionsUsed: m.positionsUsed,
          datasetVersion: m.datasetVersion,
          featureVersion: m.featureVersion,
        }
      }));
      console.log(`Created model ${m.modelType} v${m.version} on new user.`);
    }
  }

  // 3. Migrate TrainingPlan
  const oldPlans = await runWithRetry(() => prisma.trainingPlan.findMany({
    where: { userId: oldUserId }
  }));
  for (const p of oldPlans) {
    const existing = await runWithRetry(() => prisma.trainingPlan.findFirst({
      where: { userId: newUserId }
    }));
    if (!existing) {
      await runWithRetry(() => prisma.trainingPlan.create({
        data: {
          userId: newUserId,
          title: p.title,
          description: p.description,
          focusCategory: p.focusCategory,
          targetWeakness: p.targetWeakness,
          status: p.status,
          targetPositions: p.targetPositions,
          completedPositions: p.completedPositions,
          accuracy: p.accuracy,
          difficulty: p.difficulty,
          dnaVersion: p.dnaVersion,
          modelVersionId: p.modelVersionId,
        }
      }));
      console.log(`Created training plan on new user.`);
    }
  }

  // 4. Migrate ChessDNA
  const oldDna = await runWithRetry(() => prisma.chessDNA.findUnique({
    where: { userId: oldUserId }
  }));
  if (oldDna) {
    await runWithRetry(() => prisma.chessDNA.upsert({
      where: { userId: newUserId },
      create: {
        userId: newUserId,
        aggression: oldDna.aggression,
        riskTaking: oldDna.riskTaking,
        tacticalPreference: oldDna.tacticalPreference,
        positionalPreference: oldDna.positionalPreference,
        defensiveAbility: oldDna.defensiveAbility,
        sacrificeTendency: oldDna.sacrificeTendency,
        tradingTendency: oldDna.tradingTendency,
        openingDiversity: oldDna.openingDiversity,
        endgameAbility: oldDna.endgameAbility,
        kingSafety: oldDna.kingSafety,
        attackPreference: oldDna.attackPreference,
        simplificationPreference: oldDna.simplificationPreference,
        timePressureBehavior: oldDna.timePressureBehavior,
        topStrengths: oldDna.topStrengths || [],
        topWeaknesses: oldDna.topWeaknesses || [],
      },
      update: {
        aggression: oldDna.aggression,
        riskTaking: oldDna.riskTaking,
        tacticalPreference: oldDna.tacticalPreference,
        positionalPreference: oldDna.positionalPreference,
        defensiveAbility: oldDna.defensiveAbility,
        sacrificeTendency: oldDna.sacrificeTendency,
        tradingTendency: oldDna.tradingTendency,
        openingDiversity: oldDna.openingDiversity,
        endgameAbility: oldDna.endgameAbility,
        kingSafety: oldDna.kingSafety,
        attackPreference: oldDna.attackPreference,
        simplificationPreference: oldDna.simplificationPreference,
        timePressureBehavior: oldDna.timePressureBehavior,
        topStrengths: oldDna.topStrengths || [],
        topWeaknesses: oldDna.topWeaknesses || [],
      }
    }));
    console.log(`Synced ChessDNA to new user.`);
  }

  console.log('Consolidation complete!');
}

consolidate().catch(console.error).finally(() => prisma.$disconnect());
