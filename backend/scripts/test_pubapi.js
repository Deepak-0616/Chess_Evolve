import { ChessComClient } from '../src/services/chesscom/client.js';

async function test() {
  const username = 'KAKAROT0616';
  const profile = await ChessComClient.getProfile(username);
  console.log('Profile:', {
    username: profile.username,
    url: profile.url,
    followers: profile.followers,
    joined: new Date(profile.joined * 1000).toISOString()
  });

  const stats = await ChessComClient.getStats(username);
  console.log('Stats:');
  for (const [k, v] of Object.entries(stats)) {
    if (k.startsWith('chess_')) {
      console.log(`  ${k}: rating=${v.last?.rating}, best=${v.best?.rating}, record=${JSON.stringify(v.record)}`);
    }
  }

  const archives = await ChessComClient.getArchives(username);
  console.log('Total Archives:', archives.length);
  console.log('Latest 3 Archives:', archives.slice(-3));
}

test().catch(console.error);
