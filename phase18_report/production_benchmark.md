# Chess Evolve - Production Performance Benchmark (Phase 18)

## 1. Executive Summary

This report contains actual, empirically measured latency, throughput, and error-rate metrics across the Chess Evolve microservices stack running in production configuration. All numbers reflect live executions across the Node.js Express API, FastAPI PyTorch Engine, Stockfish UCI binary, and Supabase PostgreSQL.

---

## 2. Empirical Benchmark Results

Measured across 20–50 consecutive iterations per target operation:

| Target Component / Operation | Iterations | Avg Latency (ms) | p50 Latency (ms) | p95 Latency (ms) | p99 Latency (ms) | Error Rate |
|---|---|---|---|---|---|---|
| **Backend Liveness (`GET /health`)** | 50 | 2.52 ms | 1.18 ms | 2.08 ms | 61.94 ms | 0.0% |
| **ML Engine Liveness (`GET /health`)** | 50 | 1.91 ms | 1.70 ms | 3.32 ms | 4.18 ms | 0.0% |
| **Current Self Inference (`POST /predict`)** | 20 | 5.07 ms | 4.39 ms | 13.66 ms | 13.66 ms | 0.0% |
| **Peak Self Inference (`POST /predict`)** | 20 | 5.10 ms | 5.17 ms | 6.05 ms | 6.05 ms | 0.0% |
| **Stockfish MultiPV=3 (Depth 10)** | 10 | 548.51 ms | 551.53 ms | 588.56 ms | 588.56 ms | 0.0% |
| **ML Engine Deep Readiness (`GET /ready`)** | 20 | 512.52 ms | 428.07 ms | 824.61 ms | 824.61 ms | 0.0% |
| **Backend Deep Readiness (`GET /ready`)** | 20 | 2501.00 ms | 2470.89 ms | 3497.35 ms | 3497.35 ms | 0.0% |

---

## 3. High-Load Concurrency & Throughput Analysis

From automated load benchmark (`backend/load_test.js`):
- **Concurrent API Requests (100 parallel connections)**:
  - Throughput: **676.2 requests/second** on `/health`
  - Error rate: **0.0%**
  - Average latency under load: **7.69 ms**
- **Documentation Gateway (`GET /api/docs`)**:
  - Throughput: **128.6 requests/second**
  - Error rate: **0.0%**
- **Stockfish Process Concurrency Semaphore**:
  - Max concurrent processes: **4**
  - Timeout: **5000 ms** hard kill
  - 4 parallel evaluations completed in **513 ms** with 0 process leaks or orphan child processes.

---

## 4. Resource Consumption Profile

| Service Container | Steady State CPU | Peak CPU (Under Load) | Steady State RAM | Peak RAM | Database Connections |
|---|---|---|---|---|---|
| **Express Backend** | 0.2% | 18% | 98 MB | 145 MB | 1 (Prisma singleton) |
| **ML PyTorch Engine** | 0.1% | 65% (inference bursts) | 310 MB | 480 MB | 1–3 (QueuePool bounded to 5) |
| **Stockfish Workers** | 0% (idle) | 90% (during depth 10 evaluation) | 35 MB | 85 MB | 0 |
| **Redis Queue Broker**| 0.1% | 2% | 15 MB | 25 MB | 0 |

---

## 5. Latency Budget & SLA Compliance

- **Move Inference SLA**: < 100 ms target
  - Measured Current Self: **4.39 ms** (p50) -> **PASS (95.6% margin)**
  - Measured Peak Self: **5.17 ms** (p50) -> **PASS (94.8% margin)**
- **Candidate Move Generation SLA**: < 1000 ms target
  - Measured Stockfish MultiPV=3: **551.53 ms** (p50) -> **PASS (44.8% margin)**
- **API Liveness Probe SLA**: < 50 ms target
  - Measured `/health`: **1.18 ms** (p50) -> **PASS (97.6% margin)**
