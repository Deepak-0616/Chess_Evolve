import { AccountSyncManager } from '../src/services/jobs/syncJob.js';
import { prisma } from '../src/utils/prisma.js';

async function main() {
  const userId = 'b43cdda0-f3a1-4d17-8a60-d18d827e4b29';
  const username = 'kakarot0616';

  console.log(`Starting executeFullSync for ${username} (${userId})...`);
  const result = await AccountSyncManager.executeFullSync(userId, username);
  console.log('Sync Result:', JSON.stringify(result, null, 2));

  const profile = await prisma.chessProfile.findUnique({
    where: { userId },
    include: {
      _count: { select: { games: true } }
    }
  });

  console.log('Profile after sync:', {
    status: profile.syncStatus,
    lastSyncedAt: profile.lastSyncedAt,
    totalGamesInDb: profile._count.games,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
