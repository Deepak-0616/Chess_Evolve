from app.db import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    print("=== USERS & CHESS PROFILES ===")
    users = conn.execute(text("""
        SELECT u.id, u.email, u."displayName", cp.id as profile_id, cp."chessUsername", cp."syncStatus" 
        FROM "User" u 
        LEFT JOIN "ChessProfile" cp ON cp."userId" = u.id
    """)).fetchall()
    for u in users:
        print(dict(u._mapping))
