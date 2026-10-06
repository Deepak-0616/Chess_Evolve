import json
from app.db import get_engine
from sqlalchemy import text
from app.retraining.dataset_generator import generate_retraining_dataset

engine = get_engine()
with engine.connect() as conn:
    cand = conn.execute(text("""
        SELECT "userId" FROM "ModelUpdateCandidate" WHERE status = 'RETRAINING_ELIGIBLE' LIMIT 1
    """)).fetchone()

if not cand:
    print("No RETRAINING_ELIGIBLE candidate found")
    exit(1)

uid = cand[0]
print(f"Testing dataset generation for user {uid}...")
res = generate_retraining_dataset(user_id=uid, dataset_version="v2", window_game_count=100)
print("Dataset Generation Result:")
print(json.dumps(res, indent=2))
