from app.db import get_engine
from sqlalchemy import text
import json

engine = get_engine()
with engine.connect() as conn:
    users = conn.execute(text('SELECT u.id, u.email, cp."chessUsername" FROM "User" u LEFT JOIN "ChessProfile" cp ON cp."userId" = u.id')).fetchall()
    print("USERS:")
    for u in users:
        print(f"  ID: {u[0]}, Email: {u[1]}, ChessUsername: {u[2]}")
        # ChessDNA
        dna = conn.execute(text('SELECT "topWeaknesses", "topStrengths", "tacticalPreference", "defensiveAbility" FROM "ChessDNA" WHERE "userId" = :uid'), {'uid': u[0]}).fetchone()
        if dna:
            print(f"    DNA Weaknesses: {dna[0]}")
            print(f"    DNA Strengths: {dna[1]}")
        else:
            print("    No ChessDNA record")
            
        # Count positions for this user where playerMove = true
        pos_stats = conn.execute(text('''
            SELECT 
                COUNT(*) as total_player_positions,
                COUNT(CASE WHEN pa.classification = 'BLUNDER' THEN 1 END) as blunders,
                COUNT(CASE WHEN pa.classification = 'MISTAKE' THEN 1 END) as mistakes,
                COUNT(CASE WHEN pa.classification = 'INACCURACY' THEN 1 END) as inaccuracies,
                COUNT(CASE WHEN pa."cpLoss" >= 100 THEN 1 END) as high_cpl
            FROM "PositionAnalysis" pa
            JOIN "Game" g ON g.id = pa."gameId"
            JOIN "ChessProfile" cp ON cp.id = g."chessProfileId"
            WHERE cp."userId" = :uid AND pa."playerMove" = true
        '''), {'uid': u[0]}).fetchone()
        print(f"    Player Positions: {pos_stats[0]}, Blunders: {pos_stats[1]}, Mistakes: {pos_stats[2]}, Inaccuracies: {pos_stats[3]}, CP Loss >= 100: {pos_stats[4]}")
        
        # Sample 1 position with blunder or mistake
        sample = conn.execute(text('''
            SELECT pa.id, pa."gameId", pa."moveNumber", pa.fen, pa.move, pa."bestMove", pa."cpLoss", pa.classification, pa."candidateMoves"
            FROM "PositionAnalysis" pa
            JOIN "Game" g ON g.id = pa."gameId"
            JOIN "ChessProfile" cp ON cp.id = g."chessProfileId"
            WHERE cp."userId" = :uid AND pa."playerMove" = true AND pa.classification IN ('BLUNDER', 'MISTAKE')
            ORDER BY pa."cpLoss" DESC
            LIMIT 1
        '''), {'uid': u[0]}).fetchone()
        if sample:
            cands = sample[8]
            cand_count = len(cands) if isinstance(cands, list) else 0
            print(f"    Sample Blunder/Mistake: Move {sample[2]} {sample[4]} (best: {sample[5]}, CPL: {sample[6]}, class: {sample[7]}, candidates: {cand_count})")
            if cand_count > 0:
                print(f"      Top candidate: {cands[0]}")
