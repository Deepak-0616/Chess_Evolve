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

        # Real users
        cur.execute("SELECT COUNT(*) as c FROM \"User\"")
        users = cur.fetchone()['c']

        # Games
        cur.execute("SELECT COUNT(*) as c FROM \"Game\"")
        games = cur.fetchone()['c']

        # Analyzed games
        cur.execute("SELECT COUNT(*) as c FROM \"Game\" WHERE analyzed = true")
        analyzed_games = cur.fetchone()['c']

        # Chess DNA
        cur.execute("SELECT COUNT(*) as c FROM \"ChessDNA\"")
        dna_count = cur.fetchone()['c']
        dna_status = "AVAILABLE" if dna_count > 0 else "NOT AVAILABLE"

        # Current Self
        cur.execute("SELECT status FROM \"MLModelVersion\" WHERE \"modelType\" = 'CURRENT_SELF' ORDER BY version DESC LIMIT 1")
        cs = cur.fetchone()
        cs_status = cs['status'] if cs else "NOT_READY"

        # Peak Self
        cur.execute("SELECT status FROM \"MLModelVersion\" WHERE \"modelType\" = 'PEAK_SELF' ORDER BY version DESC LIMIT 1")
        ps = cur.fetchone()
        ps_status = ps['status'] if ps else "NOT_READY"

        # Evolution data
        cur.execute("SELECT COUNT(*) as c FROM \"MLModelVersion\" WHERE \"behavioralMetrics\" IS NOT NULL")
        evol_count = cur.fetchone()['c']
        evol_status = "AVAILABLE" if evol_count > 0 else "NOT AVAILABLE"

        # Arena data
        cur.execute("SELECT COUNT(*) as c FROM \"ArenaMatch\"")
        arena_count = cur.fetchone()['c']
        arena_status = "AVAILABLE" if arena_count > 0 else "NOT AVAILABLE"

        print(f"Real users: {users}")
        print(f"Games: {games}")
        print(f"Analyzed games: {analyzed_games}")
        print(f"Chess DNA: {dna_status}")
        print(f"Current Self: {cs_status}")
        print(f"Peak Self: {ps_status}")
        print(f"Evolution data: {evol_status}")
        print(f"Arena data: {arena_status}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error querying database: {e}")

if __name__ == "__main__":
    query_stats()
