from app.db import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    print("--- Detailed MLModelVersion records ---")
    rows = conn.execute(text("""
        SELECT id, "modelType", version, status, "isActive", "dependentModelVersionId", "artifactPath", "createdAt", "activatedAt", "supersededAt"
        FROM "MLModelVersion"
        ORDER BY "modelType", version ASC
    """)).fetchall()
    for r in rows:
        print(f"ID: {r[0]} | Type: {r[1]} v{r[2]} | Status: {r[3]} | Active: {r[4]} | Dep: {r[5]} | Created: {r[7]} | Activated: {r[8]}")

    print("\n--- Retraining Jobs ---")
    jobs = conn.execute(text("""
        SELECT id, "userId", status, stage, "progressPct", "isActivated", "currentGatePassed", "peakGatePassed", "createdAt"
        FROM "ModelRetrainingJob"
        ORDER BY "createdAt" DESC
    """)).fetchall()
    for j in jobs:
        print(f"Job: {j[0]} | Status: {j[2]} | Stage: {j[3]} | Pct: {j[4]} | Active: {j[5]} | Gates: Curr={j[6]}, Peak={j[7]}")

    print("\n--- ModelUpdateCandidate ---")
    cands = conn.execute(text("""
        SELECT "userId", status, "currentSelfActiveVersion", "peakSelfActiveVersion", "activationStatus"
        FROM "ModelUpdateCandidate"
    """)).fetchall()
    for c in cands:
        print(c)
