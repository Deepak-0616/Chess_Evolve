from app.db import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    users = conn.execute(text("""
        SELECT u.id, cp."chessUsername" 
        FROM "User" u 
        JOIN "ChessProfile" cp ON cp."userId" = u.id
    """)).fetchall()
    
    for uid, name in users:
        print(f"\nUser: {name} ({uid})")
        g_stats = conn.execute(text(f"""
            SELECT MIN("playedAt"), MAX("playedAt"), COUNT(*) 
            FROM "Game" g 
            JOIN "ChessProfile" cp ON cp.id = g."chessProfileId" 
            WHERE cp."userId" = '{uid}'
        """)).fetchone()
        print(f"  Games: {g_stats[2]} games from {g_stats[0]} to {g_stats[1]}")
        
        t_stats = conn.execute(text(f"""
            SELECT MIN("startedAt"), MAX("startedAt"), COUNT(*) 
            FROM "TrainingSession" 
            WHERE "userId" = '{uid}'
        """)).fetchone()
        print(f"  Training sessions: {t_stats[2]} sessions from {t_stats[0]} to {t_stats[1]}")
        
        att_cnt = conn.execute(text(f"""
            SELECT COUNT(*) FROM "TrainingAttempt" WHERE "userId" = '{uid}'
        """)).scalar()
        print(f"  Training attempts: {att_cnt}")

        dna = conn.execute(text(f"""
            SELECT aggression, "riskTaking", "tacticalPreference", "positionalPreference", "defensiveAbility", "kingSafety", "topWeaknesses", "createdAt"
            FROM "ChessDNA" WHERE "userId" = '{uid}'
        """)).fetchone()
        if dna:
            print(f"  ChessDNA: agg={dna[0]}, risk={dna[1]}, tac={dna[2]}, pos={dna[3]}, def={dna[4]}, king={dna[5]}")
            print(f"    Weaknesses: {dna[6]}")
            print(f"    Created: {dna[7]}")
        else:
            print("  No ChessDNA record found.")


        model_versions = conn.execute(text(f"""
            SELECT "modelType", version, status, "createdAt" FROM "MLModelVersion" WHERE "userId" = '{uid}' ORDER BY "modelType", version
        """)).fetchall()
        print(f"  Model versions: {len(model_versions)}")
        for mv in model_versions:
            print(f"    {mv[0]} v{mv[1]} ({mv[2]}) at {mv[3]}")
