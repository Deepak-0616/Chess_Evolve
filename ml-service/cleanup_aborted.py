from app.db import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    conn.execute(text("""
        DELETE FROM "MLModelVersion" WHERE status IN ('TRAINING', 'REJECTED')
    """))
    conn.execute(text("""
        DELETE FROM "ModelRetrainingJob" WHERE status IN ('FAILED', 'RUNNING')
    """))
    conn.commit()
print("Cleaned up aborted draft attempts.")
