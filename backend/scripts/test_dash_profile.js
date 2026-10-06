import { prisma } from '../src/utils/prisma.js';

async function testProfile() {
  const userId = 'b43cdda0-f3a1-4d17-8a60-d18d827e4b29';
  const profile = await prisma.chessProfile.findUnique({ where: { userId } });
  console.log('DB Profile:', {
    username: profile.chessUsername,
    status: profile.syncStatus,
    lastSyncedAt: profile.lastSyncedAt,
    progress: profile.syncProgress
  });

  const res = await fetch(`https://api.chess.com/pub/player/${profile.chessUsername}/stats`);
  const data = await res.json();
  console.log('Rapid stats:', data.chess_rapid?.record, 'last rating:', data.chess_rapid?.last?.rating, 'best:', data.chess_rapid?.best?.rating);
}

testProfile().catch(console.error).finally(() => prisma.$disconnect());
