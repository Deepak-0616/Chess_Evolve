import json
import sys
from app.db import get_engine
from sqlalchemy import text
from app.retraining.pipeline import RetrainingPipeline

def main():
    dry_run = "--dry-run" in sys.argv
    activate_if_passed = "--activate" in sys.argv
    
    print(f"=== Starting Phase 16 Retraining Pipeline (dry_run={dry_run}, activate={activate_if_passed}) ===")
    
    engine = get_engine()
    with engine.connect() as conn:
        cand = conn.execute(text("""
            SELECT c."userId", cp."chessUsername", c.status, c."newGamesSinceLastTrain"
            FROM "ModelUpdateCandidate" c
            JOIN "ChessProfile" cp ON cp."userId" = c."userId"
            WHERE c.status = 'RETRAINING_ELIGIBLE'
            LIMIT 1
        """)).fetchone()
        
    if not cand:
        print("No user with status RETRAINING_ELIGIBLE found.")
        sys.exit(1)
        
    user_id = cand[0]
    username = cand[1]
    print(f"Discovered RETRAINING_ELIGIBLE user: {username} ({user_id}) with {cand[3]} new games.")
    
    pipeline = RetrainingPipeline()
    job_info = pipeline.get_or_create_job(user_id=user_id, triggered_by="MANUAL", dry_run=dry_run)
    job_id = job_info["jobId"]
    print(f"Retraining Job ID: {job_id} (isExisting: {job_info.get('isExisting', False)})")
    
    # Run pipeline
    print("Executing pipeline stages...")
    result = pipeline.run_pipeline(job_id=job_id, dry_run=(not activate_if_passed))
    
    print("\n=== PIPELINE EXECUTION RESULT ===")
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    main()
