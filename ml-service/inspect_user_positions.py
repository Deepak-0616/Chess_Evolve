from app.db import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    # Dynamically find the eligible user
    cand = conn.execute(text("""
        SELECT c."userId", cp."chessUsername", c.status, c."newGamesSinceLastTrain"
        FROM "ModelUpdateCandidate" c
        JOIN "ChessProfile" cp ON cp."userId" = c."userId"
        WHERE c.status = 'RETRAINING_ELIGIBLE'
        LIMIT 1
    """)).fetchone()
    
    if not cand:
        print("No user currently RETRAINING_ELIGIBLE.")
        exit(0)
        
    uid = cand[0]
    username = cand[1]
    print(f"Found eligible user: {username} ({uid})")
    
    q = text("""
        SELECT COUNT(DISTINCT g.id) as game_cnt,
               COUNT(pa.id) as total_pa,
               COUNT(CASE WHEN pa."playerMove" = true THEN 1 END) as player_pa,
               MIN(g."playedAt") as min_date,
               MAX(g."playedAt") as max_date
        FROM "Game" g
        JOIN "PositionAnalysis" pa ON pa."gameId" = g.id
        WHERE g."chessProfileId" = (SELECT id FROM "ChessProfile" WHERE "userId" = :uid)
    """)
    row = conn.execute(q, {"uid": uid}).fetchone()
    print("User Game & Position Stats:", row)
    
    # Check candidate moves in pa
    sample_pa = conn.execute(text("""
        SELECT id, "moveNumber", fen, move, "candidateMoves"
        FROM "PositionAnalysis"
        WHERE "gameId" IN (SELECT id FROM "Game" WHERE "chessProfileId" = (SELECT id FROM "ChessProfile" WHERE "userId" = :uid))
        AND "playerMove" = true
        LIMIT 3
    """), {"uid": uid}).fetchall()
    for s in sample_pa:
        print(f"  Pos: {s[0]} | Move #{s[1]}: {s[3]} | Candidates: {len(s[4]) if s[4] else 0}")
