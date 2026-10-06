import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    include: {
      chessProfile: {
        include: {
          _count: {
            select: { games: true }
          }
        }
      },
      _count: {
        select: {
          modelVersions: true,
          trainingPlans: true,
          trainingSessions: true,
          playSessions: true,
        }
      },
      currentDna: true,
    }
  });

  console.log('All Users:');
  for (const u of users) {
    console.log({
      id: u.id,
      email: u.email,
      chessUsername: u.chessProfile?.chessUsername,
      gamesCount: u.chessProfile?._count?.games || 0,
      profileId: u.chessProfile?.id,
      syncStatus: u.chessProfile?.syncStatus,
      modelsCount: u._count.modelVersions,
      trainingPlansCount: u._count.trainingPlans,
      trainingSessionsCount: u._count.trainingSessions,
      hasDNA: !!u.currentDna,
    });
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
