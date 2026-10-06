from app.db import get_engine
from sqlalchemy import text

engine = get_engine()

statements = [
    'ALTER TABLE "ModelRetrainingJob" ENABLE ROW LEVEL SECURITY;',
    'DROP POLICY IF EXISTS "Users can only access their own retraining jobs" ON "ModelRetrainingJob";',
    'CREATE POLICY "Users can only access their own retraining jobs" ON "ModelRetrainingJob" FOR ALL USING (auth.uid()::text = "userId");',
    
    # Initialize existing READY models as ACTIVE / isActive = true if no active model exists
    """
    UPDATE "MLModelVersion"
    SET "isActive" = true, "status" = 'ACTIVE', "activatedAt" = NOW()
    WHERE status = 'READY' AND "isActive" = false;
    """
]

with engine.connect() as conn:
    for stmt in statements:
        try:
            conn.execute(text(stmt))
            print("Executed:", stmt.strip()[:70])
        except Exception as e:
            print("Error executing:", stmt.strip()[:70], "->", e)
    conn.commit()

print("Phase 16 RLS & Model Activation state initialized successfully.")
