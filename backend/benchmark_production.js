import "dotenv/config";
import { StockfishService } from "./src/services/stockfish/StockfishService.js";

async function measureEndpoint(name, fn, iterations = 25) {
  const times = [];
  let errors = 0;
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    try {
      await fn();
      times.push(performance.now() - t0);
    } catch (e) {
      errors++;
    }
  }
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)] || 0;
  const p95 = times[Math.floor(times.length * 0.95)] || 0;
  const p99 = times[Math.floor(times.length * 0.99)] || 0;
  const avg = times.reduce((s, x) => s + x, 0) / (times.length || 1);
  const errorRate = (errors / iterations) * 100;
  return { name, iterations, avg: avg.toFixed(2), p50: p50.toFixed(2), p95: p95.toFixed(2), p99: p99.toFixed(2), errorRate: errorRate.toFixed(1) + "%" };
}

async function runBenchmark() {
  console.log("=== Chess Evolve Phase 18 Production Performance Benchmark ===");

  const midFen = "r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5";
  const candidates = [
    { move: "b1c3", score: -1.1, centipawn_loss: 0, engine_rank: 1 },
    { move: "c4d5", score: -1.15, centipawn_loss: 5, engine_rank: 2 },
    { move: "e1g1", score: -1.22, centipawn_loss: 12, engine_rank: 3 },
  ];

  const results = [];

  // 1. Backend /health
  results.push(await measureEndpoint("Backend Liveness (/health)", async () => {
    const res = await fetch("http://localhost:5000/health");
    if (!res.ok) throw new Error("HTTP " + res.status);
  }, 50));

  // 2. Backend /ready
  results.push(await measureEndpoint("Backend Readiness (/ready)", async () => {
    const res = await fetch("http://localhost:5000/ready");
    if (!res.ok) throw new Error("HTTP " + res.status);
  }, 20));

  // 3. ML Service /health
  results.push(await measureEndpoint("ML Engine Liveness (/health)", async () => {
    const res = await fetch("http://localhost:8000/health");
    if (!res.ok) throw new Error("HTTP " + res.status);
  }, 50));

  // 4. ML Service /ready
  results.push(await measureEndpoint("ML Engine Readiness (/ready)", async () => {
    const res = await fetch("http://localhost:8000/ready");
    if (!res.ok) throw new Error("HTTP " + res.status);
  }, 20));

  // 5. Stockfish Candidate Extraction MultiPV=3
  results.push(await measureEndpoint("Stockfish MultiPV=3 (Depth 10)", async () => {
    const c = await StockfishService.getCandidates(midFen, { depth: 10, multiPv: 3 });
    if (!c || c.length === 0) throw new Error("No candidates");
  }, 10));

  // 6. Current Self ML Inference
  const userId = "b2ea5969-f4a9-4fb6-9228-10a3bd42adcf";
  results.push(await measureEndpoint("Current Self Neural Move Inference", async () => {
    const res = await fetch("http://localhost:8000/api/v1/ml/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        model_type: "CURRENT_SELF",
        model_version_id: "178b09cd-ea92-43f7-9561-c000a3985f2e",
        fen: midFen,
        candidates,
        move_number: 5,
        game_phase: "OPENING",
      }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!data.recommendedMove) throw new Error("No move");
  }, 20));

  // 7. Peak Self ML Inference (with Current Self dependency resolution)
  results.push(await measureEndpoint("Peak Self Neural Style Inference", async () => {
    const res = await fetch("http://localhost:8000/api/v1/ml/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        model_type: "PEAK_SELF",
        model_version_id: "6745b5b8-c216-4521-81d2-558f02090088",
        fen: midFen,
        candidates,
        move_number: 5,
        game_phase: "OPENING",
      }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    if (!data.recommendedMove) throw new Error("No move");
  }, 20));

  console.table(results);
  return results;
}

runBenchmark().catch(console.error);
