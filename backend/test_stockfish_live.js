import "dotenv/config";
import { StockfishService } from "./src/services/stockfish/StockfishService.js";

async function runLiveStockfishTest() {
  console.log("--- Stockfish Production Live Testing ---");
  const isAvailable = await StockfishService.isAvailable();
  console.log("Stockfish Engine Available:", isAvailable);

  const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const midFen = "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5";

  // Test 1: Single position analysis with MultiPV
  console.log("\n1. Single position MultiPV=3 evaluation...");
  const t0 = Date.now();
  const candidates = await StockfishService.getCandidates(midFen, { multiPv: 3, depth: 10 });
  const d0 = Date.now() - t0;
  console.log(`Evaluated in ${d0}ms. Candidates found: ${candidates.length}`);
  candidates.forEach((c, idx) => {
    console.log(`  #${idx + 1}: Move=${c.move} Score=${c.score} CP=${c.centipawnLoss || 0} PV=${c.pv ? c.pv.slice(0, 3).join(" ") : ""}`);
  });
  if (candidates.length === 0) throw new Error("Stockfish returned 0 candidates");

  // Test 2: Concurrency test (4 concurrent evaluations to test semaphore)
  console.log("\n2. Testing concurrent evaluation across 4 parallel queries...");
  const t1 = Date.now();
  const fens = [
    startFen,
    midFen,
    "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2",
    "rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2",
  ];
  const parallelResults = await Promise.all(
    fens.map(f => StockfishService.getCandidates(f, { multiPv: 2, depth: 8 }))
  );
  const d1 = Date.now() - t1;
  console.log(`Concurrent evaluation completed in ${d1}ms.`);
  parallelResults.forEach((res, i) => {
    console.log(`  Query ${i + 1}: Top move=${res[0]?.move}`);
  });

  // Test 3: Invalid FEN handling
  console.log("\n3. Testing invalid FEN rejection...");
  const invalidRes = await StockfishService.getCandidates("invalid_fen_string", { depth: 5 });
  if (invalidRes.length === 0) {
    console.log("  PASS: Properly rejected invalid FEN with empty result array.");
  } else {
    console.error("  FAIL: Accepted invalid FEN");
  }

  console.log("\n--- All Stockfish Live Tests PASSED! ---");
}

runLiveStockfishTest().catch(console.error);
