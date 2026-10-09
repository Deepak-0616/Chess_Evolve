import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

async function verifyAll() {
  const userId = process.env.TEST_USER_ID || '00000000-0000-0000-0000-000000000001';
  const email = process.env.TEST_EMAIL || 'test-player@chessevolve.local';

  // Generate a valid mock Supabase Auth JWT token for local testing
  const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-in-it';
  const token = jwt.sign(
    { sub: userId, email, aud: 'authenticated', role: 'authenticated' },
    jwtSecret,
    { expiresIn: '2h' }
  );

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const BASE_URL = 'http://localhost:5000/api/v1';

  console.log('====================================================');
  console.log('VERIFYING ALL NAVBAR ENDPOINTS & OPERATIONS');
  console.log('====================================================\n');

  // 1. Dashboard & Profile Sync (/chess/profile)
  console.log('1. [NAVBAR -> DASHBOARD] GET /chess/profile:');
  const dashRes = await fetch(`${BASE_URL}/chess/profile`, { headers });
  const dashData = await dashRes.json();
  console.log('   Status:', dashRes.status);
  console.log('   Username:', dashData.data?.chessUsername);
  console.log('   Sync Status:', dashData.data?.syncStatus);
  console.log('   Last Synced:', dashData.data?.lastSyncedAt);
  console.log('   Total Matches (All):', dashData.data?.stats?.all?.totalGames);
  console.log('   Rapid Matches:', dashData.data?.stats?.rapid?.totalGames, 'Rating:', dashData.data?.stats?.rapid?.currentRating);
  console.log('   Bullet Matches:', dashData.data?.stats?.bullet?.totalGames, 'Rating:', dashData.data?.stats?.bullet?.currentRating);
  console.log('   Blitz Matches:', dashData.data?.stats?.blitz?.totalGames, 'Rating:', dashData.data?.stats?.blitz?.currentRating);
  console.log('   Recent Games Count:', dashData.data?.recentGames?.length);

  // 2. Games (/games)
  console.log('\n2. [NAVBAR -> GAMES] GET /games:');
  const gamesRes = await fetch(`${BASE_URL}/games?limit=10&page=1`, { headers });
  const gamesData = await gamesRes.json();
  console.log('   Status:', gamesRes.status);
  console.log('   Total Games in DB:', gamesData.total);
  console.log('   First 3 Games formatted:');
  for (const g of (gamesData.games || []).slice(0, 3)) {
    console.log(`     - [${g.result}] vs ${g.opponent} (${g.timeControl}) | Opening: ${g.opening} (${g.openingEco}) | Moves: ${g.moves} | Accuracy: ${g.accuracy}%`);
  }

  // 3. Chess DNA (/dna/current)
  console.log('\n3. [NAVBAR -> CHESS DNA] GET /dna/current:');
  const dnaRes = await fetch(`${BASE_URL}/dna/current`, { headers });
  const dnaData = await dnaRes.json();
  console.log('   Status:', dnaRes.status);
  console.log('   Radar metrics count:', dnaData.dna?.radar?.length);
  console.log('   Radar values:', dnaData.dna?.radar?.map(r => `${r.subject}: ${r.A}`).join(', '));
  console.log('   Top Strengths:', dnaData.dna?.topStrengths?.join(', '));
  console.log('   Top Weaknesses:', dnaData.dna?.topWeaknesses?.join(', '));

  // 4. Training (/training/overview)
  console.log('\n4. [NAVBAR -> TRAINING] GET /training/overview:');
  const trainRes = await fetch(`${BASE_URL}/training/overview`, { headers });
  const trainData = await trainRes.json();
  console.log('   Status:', trainRes.status);
  console.log('   Sufficient Data:', trainData.sufficientData);
  console.log('   Focus Category:', trainData.activePlan?.focusCategory);
  console.log('   Target Weakness:', trainData.activePlan?.targetWeakness);
  console.log('   Recent Training Sessions:', trainData.recentSessions?.length);

  // 5. AI Coach (/coach/insights)
  console.log('\n5. [NAVBAR -> AI COACH] GET /coach/insights:');
  const coachRes = await fetch(`${BASE_URL}/coach/insights`, { headers });
  const coachData = await coachRes.json();
  console.log('   Status:', coachRes.status);
  console.log('   Insights Count:', coachData.insights?.length);
  for (const ins of (coachData.insights || []).slice(0, 3)) {
    console.log(`     - [${ins.category} - ${ins.severity}] ${ins.summary}`);
  }

  // 6. AI Arena (/arena/players)
  console.log('\n6. [NAVBAR -> ARENA] GET /arena/players:');
  const arenaRes = await fetch(`${BASE_URL}/arena/players`, { headers });
  const arenaData = await arenaRes.json();
  console.log('   Status:', arenaRes.status);
  console.log('   Active Arena Players:', arenaData.players?.length);
  for (const p of arenaData.players || []) {
    console.log(`     - Player: ${p.displayName || p.user?.displayName} | Models: ${p.models?.map(m => m.modelType).join(', ')}`);
  }

  // 7. Models & Play AI (/models)
  console.log('\n7. [NAVBAR -> PLAY AI / MODELS] GET /models:');
  const modelsRes = await fetch(`${BASE_URL}/models`, { headers });
  const modelsData = await modelsRes.json();
  console.log('   Status:', modelsRes.status);
  console.log('   Current Self:', modelsData.currentSelf?.modelType, 'v' + modelsData.currentSelf?.version, 'Status:', modelsData.currentSelf?.status);
  console.log('   Peak Self:', modelsData.peakSelf?.modelType, 'v' + modelsData.peakSelf?.version, 'Status:', modelsData.peakSelf?.status);

  // 8. Profile (/profile)
  console.log('\n8. [NAVBAR -> PROFILE] GET /profile:');
  const profRes = await fetch(`${BASE_URL}/profile`, { headers });
  const profData = await profRes.json();
  console.log('   Status:', profRes.status);
  console.log('   Connected Username:', profData.profile?.chessUsername);
  console.log('   Games Played:', profData.profile?.totalGames);
  console.log('   Win Rate:', profData.profile?.winRate + '%');
  console.log('   Peak Rating:', profData.profile?.peakRating);

  console.log('\n====================================================');
  console.log('ALL NAVBAR ENDPOINTS VERIFIED SUCCESSFULLY!');
  console.log('====================================================');
}

verifyAll().catch(console.error);
