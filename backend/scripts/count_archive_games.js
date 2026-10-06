import { ChessComClient } from '../src/services/chesscom/client.js';

async function countGames() {
  const archives = await ChessComClient.getArchives('kakarot0616');
  let total = 0;
  for (const url of archives) {
    const games = await ChessComClient.getGamesFromArchive(url);
    total += games.length;
    console.log(`${url.slice(-7)}: ${games.length} games`);
  }
  console.log('TOTAL GAMES ACROSS ALL ARCHIVES:', total);
}

countGames().catch(console.error);
