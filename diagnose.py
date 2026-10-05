import os
import sys
import json
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv(".env")

db_url = os.environ.get("DIRECT_DATABASE_URL") or os.environ.get("DATABASE_URL")
if db_url and "pgbouncer=true" in db_url:
    db_url = db_url.replace("pgbouncer=true", "")
    db_url = db_url.replace("?&", "?").rstrip("?")
if not db_url:
    print("No DATABASE_URL found")
    sys.exit(1)

def main():
    conn = psycopg2.connect(db_url)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    data = {}

    cur.execute("SELECT COUNT(*) as c FROM \"User\"")
    data["Users"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"ChessProfile\"")
    data["ChessProfiles"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"Game\"")
    data["Games"] = cur.fetchone()['c']
    
    cur.execute("SELECT COUNT(*) as c FROM \"Game\" WHERE pgn IS NOT NULL AND pgn != ''")
    data["Games with PGN"] = cur.fetchone()['c']

    # we count moves by whether we can parse it, but for DB counts we just use PositionAnalysis
    cur.execute("SELECT COUNT(*) as c FROM \"PositionAnalysis\"")
    data["Games with moves"] = "Requires Python parsing (Will check in step 3)" 
    data["PositionAnalysis records"] = cur.fetchone()['c']
    
    cur.execute("SELECT COUNT(*) as c FROM \"GameAnalysis\"")
    data["GameAnalysis records"] = cur.fetchone()['c']
    
    cur.execute("SELECT COUNT(*) as c FROM \"Game\" WHERE analyzed = true")
    data["Analyzed games"] = cur.fetchone()['c']

    # The schema might not have "FeatureGenerationJob" if it was not added. Let's check tables.
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    tables = [r['table_name'] for r in cur.fetchall()]

    data["Feature jobs"] = 0
    if "FeatureGenerationJob" in tables:
        cur.execute("SELECT COUNT(*) as c FROM \"FeatureGenerationJob\"")
        data["Feature jobs"] = cur.fetchone()['c']

    data["Feature datasets"] = 0
    if "FeatureDataset" in tables:
        cur.execute("SELECT COUNT(*) as c FROM \"FeatureDataset\"")
        data["Feature datasets"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"FeatureRecord\"")
    data["Feature records"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"ChessDNA\"")
    data["DNA versions"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"MLDataset\"")
    data["ML datasets"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"MLDatasetRecord\"")
    data["ML dataset records"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"MLDatasetRecord\" WHERE split = 'TRAIN'")
    data["TRAIN records"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"MLDatasetRecord\" WHERE split = 'VALIDATION'")
    data["VALIDATION records"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"MLDatasetRecord\" WHERE split = 'TEST'")
    data["TEST records"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"MLModelVersion\" WHERE \"modelType\" = 'CURRENT_SELF'")
    data["Current Self model versions"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"MLModelVersion\" WHERE \"modelType\" = 'PEAK_SELF'")
    data["Peak Self model versions"] = cur.fetchone()['c']

    cur.execute("SELECT COUNT(*) as c FROM \"DatasetGenerationJob\"")
    data["Training jobs"] = cur.fetchone()['c']
    
    cur.execute("SELECT \"syncStatus\", \"syncProgress\" FROM \"ChessProfile\"")
    profiles = cur.fetchall()
    
    cur.close()
    conn.close()

    # Save to JSON
    with open("pipeline_diagnostics/database_counts.json", "w") as f:
        json.dump(data, f, indent=2)

    # Save to CSV
    with open("pipeline_diagnostics/database_counts.csv", "w") as f:
        f.write("Metric,Count\n")
        for k, v in data.items():
            f.write(f"{k},{v}\n")

    # Save to README.md
    with open("pipeline_diagnostics/README.md", "w") as f:
        f.write("# Pipeline Diagnostics\n\n")
        for k, v in data.items():
            f.write(f"- **{k}**: {v}\n")
        
        f.write("\n## ChessProfile Sync Statuses\n")
        for p in profiles:
            f.write(f"Status: {p['syncStatus']}\n")
            f.write(f"Progress: {json.dumps(p['syncProgress'], indent=2)}\n\n")

if __name__ == "__main__":
    main()
