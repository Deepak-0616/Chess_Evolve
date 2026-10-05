import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv("../.env")

db_url = os.environ.get("DIRECT_DATABASE_URL") or os.environ.get("DATABASE_URL")
if db_url and "pgbouncer=true" in db_url:
    db_url = db_url.replace("pgbouncer=true", "")
    db_url = db_url.replace("?&", "?").rstrip("?")
if not db_url:
    print("No DATABASE_URL found")
    sys.exit(1)

def query_stats():
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Real arena users
        cur.execute("SELECT COUNT(*) as c FROM \"ArenaProfile\"")
        arena_users = cur.fetchone()['c']

        # Ready arena models
        cur.execute("SELECT COUNT(*) as c FROM \"ArenaModel\" am JOIN \"MLModelVersion\" mv ON am.\"mlModelVersionId\" = mv.id WHERE mv.status = 'READY'")
        ready_models = cur.fetchone()['c']

        # Public/discoverable models
        cur.execute("SELECT COUNT(*) as c FROM \"ArenaModel\" am JOIN \"MLModelVersion\" mv ON am.\"mlModelVersionId\" = mv.id WHERE am.visibility IN ('PUBLIC', 'DISCOVERABLE')")
        public_models = cur.fetchone()['c']

        # Arena matches
        cur.execute("SELECT COUNT(*) as c FROM \"ArenaMatch\"")
        arena_matches = cur.fetchone()['c']

        # Completed matches
        cur.execute("SELECT COUNT(*) as c FROM \"ArenaMatch\" WHERE status IN ('DRAW', 'USER_WON', 'MODEL_WON', 'RESIGNED')")
        completed_matches = cur.fetchone()['c']

        print(f"REAL ARENA USERS: {arena_users}")
        print(f"READY ARENA MODELS: {ready_models}")
        print(f"PUBLIC/DISCOVERABLE MODELS: {public_models}")
        print(f"ARENA MATCHES: {arena_matches}")
        print(f"COMPLETED MATCHES: {completed_matches}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error querying database: {e}")

if __name__ == "__main__":
    query_stats()
