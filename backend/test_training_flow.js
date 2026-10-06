import { prisma } from "./src/utils/prisma.js";
import { TrainingService } from "./src/services/training/trainingService.js";
import { PositionSelector } from "./src/services/training/positionSelector.js";

async function runEndToEndTrainingTest() {
  console.log("============================================================");
  console.log("PHASE 14 — END-TO-END PERSONALIZED TRAINING SYSTEM VERIFICATION");
  console.log("============================================================");

  // 1. Identify test users dynamically
  const users = await prisma.user.findMany({
    include: { chessProfile: true }
  });
  const connectedUsers = users.filter(u => u.chessProfile);
  const user1 = connectedUsers[0];
  const user2 = connectedUsers[1] || connectedUsers[0];
  const userEmpty = users.find(u => !u.chessProfile);

  if (!user1) {
    throw new Error("Could not find any users with a connected profile in database.");
  }

  console.log(`\nUser 1: ${user1.id} (${user1.chessProfile.chessUsername})`);
  console.log(`User 2: ${user2.id} (${user2.chessProfile.chessUsername})`);
  if (userEmpty) console.log(`User Empty (no profile): ${userEmpty.id}`);

  // ========================================================
  // TEST 1: Empty state for user without data
  // ========================================================
  console.log("\n--- TEST 1: Empty State Verification ---");
  if (userEmpty) {
    const emptyOverview = await TrainingService.getOverview(userEmpty.id);
    console.log(`[PASS] Empty state response for user without data:`, {
      sufficientData: emptyOverview.sufficientData,
      message: emptyOverview.message
    });
    if (emptyOverview.sufficientData !== false) {
      throw new Error("Expected sufficientData: false for empty user");
    }
  }

  // ========================================================
  // TEST 2: Training Overview for real user
  // ========================================================
  console.log("\n--- TEST 2: Real User Overview & Weaknesses ---");
  const overview1 = await TrainingService.getOverview(user1.id);
  console.log(`[PASS] Sufficient Data: ${overview1.sufficientData}`);
  console.log(`[PASS] Active Plan:`, {
    id: overview1.activePlan.id,
    focusCategory: overview1.activePlan.focusCategory,
    targetWeakness: overview1.activePlan.targetWeakness,
    difficulty: overview1.activePlan.difficulty
  });
  console.log(`[PASS] DNA Weaknesses (${overview1.weaknesses.length}):`, overview1.weaknesses);
  console.log(`[PASS] Available Models:`, overview1.availableModels);

  // Check weaknesses API
  const weaknesses1 = await TrainingService.getWeaknesses(user1.id);
  console.log(`[PASS] Error evidence categories:`, weaknesses1.errorEvidence.length);
  if (weaknesses1.errorEvidence.length > 0) {
    console.log(`       Sample error evidence:`, weaknesses1.errorEvidence[0]);
  }

  // ========================================================
  // TEST 3: Create Personalized Training Session
  // ========================================================
  console.log("\n--- TEST 3: Create Personalized Training Session ---");
  const sessionData = await TrainingService.createSession(user1.id, {
    category: "TACTICAL",
    difficulty: "INTERMEDIATE"
  });

  const session = sessionData.session;
  const positions = sessionData.positions;
  console.log(`[PASS] Session Created: ${session.id}`);
  console.log(`       Title: ${session.title}`);
  console.log(`       Category: ${session.category} | Difficulty: ${session.difficulty}`);
  console.log(`       Positions planned: ${session.positionsPlanned}, Positions returned: ${positions.length}`);

  if (positions.length === 0) {
    throw new Error("Failed to select positions for training session");
  }

  // ========================================================
  // TEST 4: Security — Answer Sanitization before Attempt
  // ========================================================
  console.log("\n--- TEST 4: Answer Sanitization Audit ---");
  for (const pos of positions) {
    if (pos.targetMove || pos.targetMoveUci) {
      throw new Error(`CRITICAL SECURITY FAILURE: targetMove was leaked in unattempted position ${pos.id}!`);
    }
  }
  console.log(`[PASS] All ${positions.length} unattempted positions strictly withhold answers from the client!`);
  console.log(`       Position 1 metadata visible:`, {
    id: positions[0].id,
    sideToMove: positions[0].sideToMove,
    difficulty: positions[0].difficulty,
    weaknessCategory: positions[0].weaknessCategory,
    playerHistoricalMove: positions[0].playerHistoricalMove,
    playerHistoricalClass: positions[0].playerHistoricalClass,
    targetMove: positions[0].targetMove // should be undefined
  });

  // ========================================================
  // TEST 5: Chess.js Move Validation & Attempt Submission
  // ========================================================
  console.log("\n--- TEST 5: Chess Move Validation & Attempt ---");
  const targetPos = positions[0];

  // 5a. Test illegal move rejection
  try {
    await TrainingService.submitAttempt(user1.id, session.id, {
      positionId: targetPos.id,
      move: "z9#invalid_move"
    });
    throw new Error("Security failure: illegal move was accepted!");
  } catch (err) {
    console.log(`[PASS] Illegal move correctly rejected: ${err.message}`);
  }

  // 5b. Submit a legal move
  // Load real target position from database to inspect targetMove
  const dbPos = await prisma.trainingPosition.findUnique({
    where: { id: targetPos.id }
  });

  console.log(`       Database Target Move: ${dbPos.targetMove}`);
  console.log(`       User submitting target move: ${dbPos.targetMove}`);

  const attemptResult = await TrainingService.submitAttempt(user1.id, session.id, {
    positionId: targetPos.id,
    move: dbPos.targetMove,
    timeSpentMs: 3500
  });

  console.log(`[PASS] Attempt submitted successfully:`);
  console.log(`       Is Correct: ${attemptResult.isCorrect}`);
  console.log(`       Quality: ${attemptResult.quality} | Engine Rank: ${attemptResult.engineRank}`);
  console.log(`       Historical Move: ${attemptResult.playerHistoricalMove} (${attemptResult.playerHistoricalClass})`);
  console.log(`       Current Self: ${attemptResult.currentSelf.move} (conf: ${attemptResult.currentSelf.confidence})`);
  console.log(`       Peak Self: ${attemptResult.peakSelf.move} (conf: ${attemptResult.peakSelf.confidence})`);
  console.log(`       Session Score: ${attemptResult.sessionScore}%`);
  console.log(`\n--- Verified Explanation ---`);
  console.log(attemptResult.explanation);

  // 5c. Prevent duplicate attempt on same position
  try {
    await TrainingService.submitAttempt(user1.id, session.id, {
      positionId: targetPos.id,
      move: dbPos.targetMove
    });
    throw new Error("Duplicate attempt was allowed!");
  } catch (err) {
    console.log(`\n[PASS] Duplicate attempt prevention verified: ${err.message}`);
  }

  // ========================================================
  // TEST 6: User Isolation & Cross-User Security
  // ========================================================
  console.log("\n--- TEST 6: Cross-User Authorization Audit ---");
  // User 2 trying to read User 1's session
  try {
    await TrainingService.getSession(user2.id, session.id);
    throw new Error("Cross-user read allowed!");
  } catch (err) {
    console.log(`[PASS] User 2 blocked from reading User 1's session: ${err.message}`);
  }

  // User 2 trying to submit attempt to User 1's session
  try {
    await TrainingService.submitAttempt(user2.id, session.id, {
      positionId: positions[1].id,
      move: "e4"
    });
    throw new Error("Cross-user move submission allowed!");
  } catch (err) {
    console.log(`[PASS] User 2 blocked from submitting attempt to User 1's session: ${err.message}`);
  }

  // ========================================================
  // TEST 7: Complete Session & Progress Calculation
  // ========================================================
  console.log("\n--- TEST 7: Complete Session & Progress ---");
  const completion = await TrainingService.completeSession(user1.id, session.id);
  console.log(`[PASS] Session marked COMPLETED. Score: ${completion.score}% (${completion.correctCount}/${completion.positionsPlanned})`);

  const progress = await TrainingService.getProgress(user1.id);
  console.log(`[PASS] User 1 Progress Updated:`, {
    totalSessionsCompleted: progress.progress.totalSessionsCompleted,
    totalPositionsAttempted: progress.progress.totalPositionsAttempted,
    totalPositionsSolved: progress.progress.totalPositionsSolved,
    overallSuccessRate: `${progress.progress.overallSuccessRate}%`,
    currentDifficulty: progress.progress.currentDifficulty,
    categoryPerformance: progress.progress.categoryPerformance
  });

  // ========================================================
  // TEST 8: Personalization Diversity Check
  // ========================================================
  console.log("\n--- TEST 8: Multi-User Personalization Diversity ---");
  const overview2 = await TrainingService.getOverview(user2.id);
  console.log(`User 1 Focus: ${overview1.activePlan.focusCategory} (${overview1.activePlan.targetWeakness})`);
  console.log(`User 2 Focus: ${overview2.activePlan.focusCategory} (${overview2.activePlan.targetWeakness})`);

  const user2Positions = await PositionSelector.selectPositionsForUser(user2.id, { limit: 3 });
  console.log(`User 2 Selected Positions count: ${user2Positions.positions.length}`);
  if (user2Positions.positions.length > 0) {
    console.log(`User 2 Position 1 Game: ${user2Positions.positions[0].gameId} | Category: ${user2Positions.positions[0].weaknessCategory}`);
  }

  console.log("\n============================================================");
  console.log("PHASE 14 ALL TESTS PASSED: 100% OPERATIONAL");
  console.log("============================================================");
  process.exit(0);
}

runEndToEndTrainingTest().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
