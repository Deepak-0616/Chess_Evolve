# Chess Evolve - Production Backup & Disaster Recovery Runbook (Phase 17)

## 1. Overview & RPO / RTO Targets

- **Recovery Point Objective (RPO)**: <= 1 hour for transactional database state; 0 data loss for active model artifacts.
- **Recovery Time Objective (RTO)**: <= 30 minutes to restore API availability; <= 2 hours for full cluster re-hydration.

---

## 2. PostgreSQL & Supabase Database Backup Strategy

### 2.1 Managed Automated Backups (Supabase Platform)
1. **Daily Full Backups**: Enabled automatically on Pro/Team Supabase plans with 7 to 30 day point-in-time retention.
2. **Point-In-Time Recovery (PITR)**:
   - Configured in the Supabase Dashboard under `Database -> Backups`.
   - Continuous write-ahead log (WAL) archiving allowing rollback to any second within the retention window.

### 2.2 Manual On-Demand Logical Backups (CLI / Cron)
Execute logical database dump before major schema migrations:
```bash
# Automated logical schema and data dump
pg_dump "$DIRECT_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="chess_evolve_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 2.3 Restoration Procedure
To restore from a logical backup into a fresh database:
```bash
# 1. Terminate active backend connections to prevent race conditions
# 2. Run pg_restore
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$DIRECT_DATABASE_URL" \
  chess_evolve_backup_YYYYMMDD_HHMMSS.dump

# 3. Re-apply Prisma schema validation
npx prisma db push --skip-generate
```

---

## 3. Model Artifact Storage Backup & Integrity

### 3.1 Storage Topology
Model artifacts are stored in canonical object paths:
`{MODEL_STORAGE_PATH}/{modelType}/{userId}/{modelVersionId}/checkpoint_best.pt`

### 3.2 Integrity Verification
Every model record in `MLModelVersion` tracks:
- `artifactPath`: Canonical physical or object URI.
- `checksumSha256`: SHA-256 cryptographic hash calculated at creation.
- `version`, `featureVersion`, `datasetVersion`.

### 3.3 Artifact Synchronization & Replication
```bash
# Sync local artifacts to Supabase Storage bucket / S3 backup bucket
aws s3 sync ./artifacts s3://chess-evolve-model-backups/artifacts/ \
  --exact-timestamps \
  --delete
```

---

## 4. Redis & BullMQ Queue Disaster Recovery

### 4.1 Redis Persistence
- In production, configure Redis with:
  - `appendonly yes` (AOF) with `appendfsync everysec`.
  - Periodic RDB snapshots (`save 900 1 300 10 60 10000`).

### 4.2 Queue Recovery on Redis Node Failure
1. BullMQ handles worker crashes gracefully via lock expiration.
2. Stalled jobs are automatically recovered by `stalledInterval` (default 30s) and reassigned to healthy workers.
3. If Redis suffers a complete hardware failure:
   - Re-provision Redis instance.
   - Restart the worker daemon (`node src/worker.js`).
   - Query uncompleted jobs in Postgres (`status = 'PENDING' | 'RUNNING'`) and re-enqueue them via their respective queues.

---

## 5. Model Rollback & Recovery Procedures

If an activated model displays anomalous inference or poor playing quality:
1. Trigger atomic rollback via API:
   ```http
   POST /api/v1/models/rollback
   Authorization: Bearer <ADMIN_OR_USER_TOKEN>
   Content-Type: application/json

   {
     "targetVersion": 1
   }
   ```
2. The system executes a serialized database transaction:
   - Verifies target model version exists and is in `READY` or `SUPERSEDED` state.
   - Verifies dependency integrity (Peak Self matches required Current Self).
   - Deactivates current models (`isActive = false, status = 'SUPERSEDED'`).
   - Activates previous models (`isActive = true, status = 'ACTIVE'`).
   - Inserts audit record in `ModelRetrainingJob`.

---

## 6. Data-Loss Scenarios & Mitigation Playbook

| Scenario | Severity | Impact | Recovery Action |
|---|---|---|---|
| Supabase DB Node Outage | Critical | Full system offline | Failover to Supabase standby replica (automatic in Pro plans) or restore latest WAL |
| Redis Process Crash | Medium | Background jobs paused | System automatically reconnects; restart Redis; BullMQ auto-resumes in-flight jobs |
| Model Artifact Corruption | High | Inference fails for user | Verify SHA-256 checksum; restore artifact file from S3 replication bucket |
| Corrupt Chess.com Sync | Low | Partial game import | Sync is idempotent; trigger `POST /chess/sync` to resume from last synced archive |
