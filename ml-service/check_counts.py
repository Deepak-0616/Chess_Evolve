from app.db import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    print("--- Games ---")
    games = conn.execute(text("""
        SELECT u.id, cp."chessUsername", COUNT(g.id), MIN(g."playedAt"), MAX(g."playedAt")
        FROM "User" u
        JOIN "ChessProfile" cp ON cp."userId" = u.id
        LEFT JOIN "Game" g ON g."chessProfileId" = cp.id
        GROUP BY u.id, cp."chessUsername"
    """)).fetchall()
    for row in games:
        print(row)
    
    print("\n--- Analyzed Games ---")
    ag = conn.execute(text("""
        SELECT u.id, COUNT(g.id)
        FROM "User" u
        JOIN "ChessProfile" cp ON cp."userId" = u.id
        JOIN "Game" g ON g."chessProfileId" = cp.id
        WHERE g."analyzed" = true
        GROUP BY u.id
    """)).fetchall()
    for row in ag:
        print(row)

    print("\n--- Positions ---")
    pos = conn.execute(text("""
        SELECT g."chessProfileId", COUNT(pa.id)
        FROM "PositionAnalysis" pa
        JOIN "Game" g ON pa."gameId" = g.id
        GROUP BY g."chessProfileId"
    """)).fetchall()
    for row in pos:
        print(row)

    print("\n--- Feature Records ---")
    fr = conn.execute(text("""
        SELECT "userId", "featureVersion", COUNT(*), COUNT(DISTINCT "gameId"), COUNT(DISTINCT "positionId")
        FROM "FeatureRecord"
        GROUP BY "userId", "featureVersion"
    """)).fetchall()
    for row in fr:
        print(row)

    print("\n--- MLDataset Records ---")
    mdr = conn.execute(text("""
        SELECT d."userId", d."datasetType", d.version, COUNT(r.id), COUNT(DISTINCT r."gameId"), COUNT(DISTINCT r."positionId")
        FROM "MLDataset" d
        LEFT JOIN "MLDatasetRecord" r ON r."datasetId" = d.id
        GROUP BY d."userId", d."datasetType", d.version
    """)).fetchall()
    for row in mdr:
        print(row)
