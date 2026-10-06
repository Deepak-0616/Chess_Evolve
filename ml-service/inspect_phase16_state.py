from app.db import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    print("=== USERS & MODELS ===")
    users = conn.execute(text("""
        SELECT u.id, cp."chessUsername" 
        FROM "User" u 
        JOIN "ChessProfile" cp ON cp."userId" = u.id
    """)).fetchall()
    
    for uid, name in users:
        print(f"\nUser: {name} ({uid})")
        models = conn.execute(text(f"""
            SELECT id, "modelType", version, status, "gamesUsed", "positionsUsed", "dependentModelVersionId", "artifactPath"
            FROM "MLModelVersion"
            WHERE "userId" = '{uid}'
            ORDER BY "modelType", version
        """)).fetchall()
        for m in models:
            print(f"  Model: {m[1]} v{m[2]} ({m[3]}) | Games: {m[4]} | Pos: {m[5]} | Dep: {m[6]} | Path: {m[7]}")

    print("\n=== DATASETS ===")
    datasets = conn.execute(text("""
        SELECT id, "userId", "datasetType", version, "totalGames", "totalPositions", "totalRecords", "trainRecords", "validationRecords", "testRecords", status
        FROM "MLDataset"
    """)).fetchall()
    print(f"Total MLDatasets: {len(datasets)}")
    for d in datasets:
        print(f"  ID: {d[0]} | Type: {d[2]} | v: {d[3]} | User: {d[1]} | Games: {d[4]} | Records: {d[6]} (Train: {d[7]}, Val: {d[8]}, Test: {d[9]}) | Status: {d[10]}")

    print("\n=== FEATURE DATASETS ===")
    feat_ds = conn.execute(text("""
        SELECT id, "userId", "featureVersion", "gameCount", "positionCount", "candidateCount", status
        FROM "FeatureDataset"
    """)).fetchall()
    for fd in feat_ds:
        print(f"  FeatureDataset: ID: {fd[0]} | User: {fd[1]} | Games: {fd[3]} | Pos: {fd[4]} | Cands: {fd[5]} | Status: {fd[6]}")

    print("\n=== RETRAINING ELIGIBILITY CANDIDATE ===")
    cands = conn.execute(text("""
        SELECT id, "userId", status, "newGamesSinceLastTrain", "newPositionsSinceLastTrain", "eligibilityReasons"
        FROM "ModelUpdateCandidate"
    """)).fetchall()
    for c in cands:
        print(f"  Candidate: User: {c[1]} | Status: {c[2]} | New Games: {c[3]} | New Pos: {c[4]}")
        print(f"    Reasons: {c[5]}")
