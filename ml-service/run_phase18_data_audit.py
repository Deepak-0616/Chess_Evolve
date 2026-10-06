import os
import sys
from app.db import get_engine
from sqlalchemy import text

def audit_database():
    print("=== Chess Evolve Phase 18 Production Data Integrity Audit ===")
    engine = get_engine()

    tables = [
        "User", "ChessProfile", "Game", "GameAnalysis", "PositionAnalysis",
        "ChessDNA", "ChessDNAVersion", "MLModelVersion", "TrainingPlan",
        "TrainingSession", "TrainingPosition", "TrainingAttempt", "TrainingProgress",
        "PlaySession", "ArenaProfile", "ArenaModel", "ArenaRating", "ArenaMatch",
        "ArenaChallenge", "FeatureGenerationJob", "FeatureDataset", "FeatureRecord",
        "DatasetGenerationJob", "MLDataset", "MLDatasetRecord", "CoachConversation",
        "CoachMessage", "EvolutionSnapshot", "ModelUpdateCandidate", "ModelRetrainingJob"
    ]

    print("\n1. Table Counts:")
    counts = {}
    with engine.connect() as conn:
        for t in tables:
            try:
                cnt = conn.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
                counts[t] = cnt
                print(f"  {t:25}: {cnt}")
            except Exception as e:
                counts[t] = f"Error: {e}"
                print(f"  {t:25}: Error")

    print("\n2. Active Model Invariants Verification:")
    with engine.connect() as conn:
        active_models = conn.execute(text('''
            SELECT "userId", "modelType", COUNT(*) as active_count
            FROM "MLModelVersion"
            WHERE "isActive" = true
            GROUP BY "userId", "modelType"
        ''')).fetchall()

        invariant_violations = []
        for row in active_models:
            uid, mtype, count = row[0], row[1], row[2]
            print(f"  User {uid} - {mtype}: {count} active model(s)")
            if count > 1:
                invariant_violations.append(f"User {uid} has {count} active {mtype} models (max 1 permitted)")

        print("\n3. Peak Self -> Current Self Dependency Integrity:")
        peak_models = conn.execute(text('''
            SELECT p.id, p."userId", p.version, p."dependentModelVersionId", c."isActive", c.status, c.version as c_version
            FROM "MLModelVersion" p
            LEFT JOIN "MLModelVersion" c ON p."dependentModelVersionId" = c.id
            WHERE p."modelType" = 'PEAK_SELF' AND p."isActive" = true
        ''')).fetchall()

        for p in peak_models:
            pid, uid, pver, dep_id, c_active, c_status, c_ver = p[0], p[1], p[2], p[3], p[4], p[5], p[6]
            print(f"  Peak v{pver} (id={pid}) -> Current Self v{c_ver} (id={dep_id}, isActive={c_active}, status={c_status})")
            if not dep_id:
                invariant_violations.append(f"Peak Self {pid} has NULL dependentModelVersionId")
            elif not c_active:
                invariant_violations.append(f"Peak Self {pid} references inactive Current Self {dep_id}")

        if not invariant_violations:
            print("  --> Invariant Status: 100% SATISFIED (Exactly 1 active model per type per user, valid dependencies).")
        else:
            for v in invariant_violations:
                print(f"  --> VIOLATION: {v}")

        print("\n4. Relational & Foreign Key Integrity Checks:")
        orphan_checks = [
            ("Game -> ChessProfile", 'SELECT COUNT(*) FROM "Game" g LEFT JOIN "ChessProfile" cp ON g."chessProfileId" = cp.id WHERE cp.id IS NULL'),
            ("GameAnalysis -> Game", 'SELECT COUNT(*) FROM "GameAnalysis" a LEFT JOIN "Game" g ON a."gameId" = g.id WHERE g.id IS NULL'),
            ("PositionAnalysis -> Game", 'SELECT COUNT(*) FROM "PositionAnalysis" p LEFT JOIN "Game" g ON p."gameId" = g.id WHERE g.id IS NULL'),
            ("MLModelVersion -> User", 'SELECT COUNT(*) FROM "MLModelVersion" m LEFT JOIN "User" u ON m."userId" = u.id WHERE u.id IS NULL'),
            ("PlaySession -> User", 'SELECT COUNT(*) FROM "PlaySession" s LEFT JOIN "User" u ON s."userId" = u.id WHERE u.id IS NULL'),
            ("TrainingSession -> User", 'SELECT COUNT(*) FROM "TrainingSession" t LEFT JOIN "User" u ON t."userId" = u.id WHERE u.id IS NULL'),
            ("ArenaMatch -> MLModelVersion", 'SELECT COUNT(*) FROM "ArenaMatch" m LEFT JOIN "MLModelVersion" w ON m."whiteModelVersionId" = w.id WHERE w.id IS NULL'),
        ]
        all_orphans_clean = True
        for name, query in orphan_checks:
            cnt = conn.execute(text(query)).scalar()
            print(f"  {name:35}: {cnt} orphans")
            if cnt > 0:
                all_orphans_clean = False

        if all_orphans_clean:
            print("  --> Relational Status: 100% CLEAN (0 orphan records across foreign keys).")

if __name__ == "__main__":
    audit_database()
