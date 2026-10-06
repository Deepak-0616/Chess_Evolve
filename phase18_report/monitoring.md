# Chess Evolve - Production Monitoring & Alerting Guide (Phase 18)

## 1. Executive Summary

This document establishes the observability, metrics collection, and alerting architecture for Chess Evolve AI. Observability is structured around the **Four Golden Signals**: Latency, Traffic, Errors, and Saturation across the API Gateway, Worker Queue, ML Inference Engine, and Database layers.

---

## 2. Core Metrics & Telemetry Specification

### 2.1 API & Application Gateway (Express Node.js)
| Metric Name | Type | Target SLA / Baseline | Alert Warning Threshold | Alert Critical Threshold |
|---|---|---|---|---|
| `http_requests_total` | Counter | Steady traffic | N/A | Spike > 300% / drop to 0 |
| `http_request_duration_ms` | Histogram | p50 < 20ms, p95 < 100ms | p95 > 250ms for 5m | p95 > 1000ms for 3m |
| `http_5xx_error_rate` | Gauge | 0.0% | > 1.0% of requests | > 5.0% of requests |
| `http_429_rate_limit_rate` | Counter | < 5/min | > 50/min (potential abuse) | > 200/min |
| `auth_failures_total` | Counter | < 2/min | > 20/min (credential stuffing) | > 100/min |

### 2.2 Asynchronous Worker & Redis Queue (BullMQ)
| Metric Name | Type | Target SLA / Baseline | Alert Warning Threshold | Alert Critical Threshold |
|---|---|---|---|---|
| `bullmq_queue_depth_waiting` | Gauge | 0–10 jobs | > 50 jobs for 10m | > 200 jobs for 15m |
| `bullmq_jobs_failed_total` | Counter | 0 | > 5 failures / hour | > 25 failures / hour |
| `bullmq_jobs_stalled_total` | Counter | 0 | > 2 stalled / 30m | > 10 stalled / 30m |
| `redis_connected_clients` | Gauge | 5–20 connections | > 80% pool limit | > 95% pool limit |
| `redis_memory_used_bytes` | Gauge | < 50 MB | > 80% maxmemory | > 90% maxmemory |

### 2.3 ML Inference & PyTorch Engine (FastAPI)
| Metric Name | Type | Target SLA / Baseline | Alert Warning Threshold | Alert Critical Threshold |
|---|---|---|---|---|
| `ml_inference_duration_ms` | Histogram | p50 < 10ms, p95 < 25ms | p95 > 50ms for 5m | p95 > 150ms for 2m |
| `ml_training_duration_seconds`| Histogram | 60–300s per model | > 600s | > 900s (timeout trigger) |
| `model_load_failures_total` | Counter | 0 | >= 1 failure | >= 3 failures |
| `model_checksum_mismatches` | Counter | 0 | >= 1 (security alert) | >= 1 (critical alert) |

### 2.4 Stockfish UCI Engine Sandbox
| Metric Name | Type | Target SLA / Baseline | Alert Warning Threshold | Alert Critical Threshold |
|---|---|---|---|---|
| `stockfish_active_processes` | Gauge | 0–4 concurrent | = 4 (at saturation limit) | = 4 with wait queue > 10 |
| `stockfish_execution_timeouts`| Counter | 0 | > 2 timeouts / hour | > 10 timeouts / hour |
| `stockfish_crash_events` | Counter | 0 | >= 1 crash | >= 3 crashes |

### 2.5 Database & Connection Pool (Supabase PostgreSQL)
| Metric Name | Type | Target SLA / Baseline | Alert Warning Threshold | Alert Critical Threshold |
|---|---|---|---|---|
| `db_connection_pool_active` | Gauge | 1–5 connections | > 80% of max pool (40/50)| > 90% of max pool (45/50)|
| `db_query_duration_ms` | Histogram | p50 < 15ms | p95 > 100ms for 5m | p95 > 500ms for 2m |
| `db_deadlocks_total` | Counter | 0 | >= 1 deadlock | >= 3 deadlocks |

---

## 3. Log Aggregation & Redaction Standards

All system log events are structured JSON lines adhering to the following schema:
```json
{
  "timestamp": "2026-10-06T00:26:00.000Z",
  "level": "info",
  "service": "chess-evolve-backend",
  "environment": "production",
  "requestId": "req_84f9a21b",
  "userId": "b2ea5969-f4a9-4fb6-9228-10a3bd42adcf",
  "route": "/api/v1/play/sessions/cm123/move",
  "method": "POST",
  "statusCode": 200,
  "durationMs": 14.8,
  "clientIp": "203.0.113.195"
}
```

### Absolute Redaction Enforcement
The structured logger ([backend/src/middleware/logger.js](file:///c:/Users/deepa/Desktop/Deepak/github/Chess_Evolve/backend/src/middleware/logger.js)) strictly excludes:
- `Authorization` header bearer tokens and JWT payloads.
- Passwords, connection string credentials, and API secret keys (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ML_SERVICE_AUTH_SECRET`).
- PII and raw database query parameters in production mode.
