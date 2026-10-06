from app.db import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    v1_recs = conn.execute(text("""
        SELECT "isActualMove", "candidateMove", "actualMove"
        FROM "MLDatasetRecord"
        WHERE "datasetId" = 'cmuv7wapr04bd4vna97h1bxg5'
        LIMIT 10
    """)).fetchall()
    print("v1 samples:")
    for r in v1_recs:
        print(r)
    
    true_cnt = conn.execute(text("""
        SELECT COUNT(DISTINCT "positionId")
        FROM "MLDatasetRecord"
        WHERE "datasetId" = 'cmuv7wapr04bd4vna97h1bxg5' AND "isActualMove" = true
    """)).fetchone()[0]
    total_pos = conn.execute(text("""
        SELECT COUNT(DISTINCT "positionId")
        FROM "MLDatasetRecord"
        WHERE "datasetId" = 'cmuv7wapr04bd4vna97h1bxg5'
    """)).fetchone()[0]
    print(f"v1 positions with actual move: {true_cnt} / {total_pos}")
    
    # Also check how actualMove and candidateMove look in PositionAnalysis
    pa_sample = conn.execute(text("""
        SELECT fen, move, "candidateMoves"
        FROM "PositionAnalysis"
        WHERE "playerMove" = true
        LIMIT 5
    """)).fetchall()
    print("\nPositionAnalysis samples:")
    for p in pa_sample:
        print("Move:", p[1], "| Candidates:", [c.get("move") for c in p[2] or []])
