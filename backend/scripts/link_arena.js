import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function linkArena() {
  const usersWithModels = await prisma.user.findMany({
    include: {
      chessProfile: true,
      arenaProfile: true,
      modelVersions: {
        where: { isActive: true },
        orderBy: { version: 'desc' }
      }
    }
  });

  for (const u of usersWithModels) {
    if (u.modelVersions.length === 0) continue;

    // Ensure arena profile is public and enabled
    await prisma.arenaProfile.upsert({
      where: { userId: u.id },
      create: {
        userId: u.id,
        displayName: u.chessProfile?.chessUsername || u.displayName,
        visibility: 'PUBLIC',
        arenaEnabled: true,
      },
      update: {
        displayName: u.chessProfile?.chessUsername || u.displayName,
        visibility: 'PUBLIC',
        arenaEnabled: true,
      }
    });

    for (const m of u.modelVersions) {
      await prisma.arenaModel.upsert({
        where: {
          userId_modelType: {
            userId: u.id,
            modelType: m.modelType
          }
        },
        create: {
          userId: u.id,
          mlModelVersionId: m.id,
          modelType: m.modelType,
          visibility: 'PUBLIC',
          isActive: true
        },
        update: {
          mlModelVersionId: m.id,
          visibility: 'PUBLIC',
          isActive: true
        }
      });

      await prisma.arenaRating.upsert({
        where: {
          id: `${u.id}_${m.modelType}`
        },
        create: {
          id: `${u.id}_${m.modelType}`,
          userId: u.id,
          modelType: m.modelType,
          rating: m.modelType === 'PEAK_SELF' ? 1650 : 1500,
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0
        },
        update: {}
      });
    }
    console.log(`Linked arena for user ${u.id} (${u.chessProfile?.chessUsername})`);
  }
}

linkArena().catch(console.error).finally(() => prisma.$disconnect());
