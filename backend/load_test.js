import axios from "axios";
import { performance } from "perf_hooks";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000";

async function runLoadTest() {
  console.log("==================================================");
  console.log("   CHESS EVOLVE - PRODUCTION LOAD BENCHMARK       ");
  console.log("==================================================");

  const testSuites = [
    { name: "Health Probe (/health)", url: `${BASE_URL}/health`, method: "GET", count: 100, concurrency: 10 },
    { name: "Readiness Probe (/ready)", url: `${BASE_URL}/ready`, method: "GET", count: 20, concurrency: 5 },
    { name: "Swagger Docs (/api/docs)", url: `${BASE_URL}/api/docs`, method: "GET", count: 50, concurrency: 10 },
  ];

  const results = [];

  for (const suite of testSuites) {
    console.log(`\nStarting: ${suite.name} (${suite.count} requests, concurrency=${suite.concurrency})...`);
    const latencies = [];
    let successCount = 0;
    let failCount = 0;

    const startTotal = performance.now();

    // Execute in batches of concurrency
    for (let i = 0; i < suite.count; i += suite.concurrency) {
      const batchSize = Math.min(suite.concurrency, suite.count - i);
      const batchPromises = Array.from({ length: batchSize }, async () => {
        const t0 = performance.now();
        try {
          const res = await axios.get(suite.url, { timeout: 10000 });
          const t1 = performance.now();
          latencies.push(t1 - t0);
          if (res.status === 200 || res.status === 503) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          const t1 = performance.now();
          latencies.push(t1 - t0);
          failCount++;
        }
      });
      await Promise.all(batchPromises);
    }

    const totalDurationSec = (performance.now() - startTotal) / 1000;
    latencies.sort((a, b) => a - b);

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
    const throughput = (suite.count / totalDurationSec).toFixed(1);

    const summary = {
      suite: suite.name,
      totalRequests: suite.count,
      successful: successCount,
      failed: failCount,
      errorRatePct: ((failCount / suite.count) * 100).toFixed(2),
      avgLatencyMs: avgLatency.toFixed(2),
      p50Ms: p50.toFixed(2),
      p95Ms: p95.toFixed(2),
      p99Ms: p99.toFixed(2),
      throughputReqSec: throughput,
    };

    results.push(summary);
    console.log(`Finished: ${suite.name} -> Throughput: ${throughput} req/s, P95: ${p95.toFixed(1)}ms, Error Rate: ${summary.errorRatePct}%`);
  }

  console.log("\n==================================================");
  console.log("   BENCHMARK SUMMARY RESULTS                      ");
  console.log("==================================================");
  console.table(results);

  return results;
}

runLoadTest().catch(console.error);
