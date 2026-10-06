from app.db import get_engine
from sqlalchemy import text

engine = get_engine()

rls_statements = [
    'ALTER TABLE "EvolutionSnapshot" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "ModelUpdateCandidate" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "ChessDNAVersion" ENABLE ROW LEVEL SECURITY;',
    
    'DROP POLICY IF EXISTS "Users can only access their own evolution snapshots" ON "EvolutionSnapshot";',
    'CREATE POLICY "Users can only access their own evolution snapshots" ON "EvolutionSnapshot" FOR ALL USING (auth.uid()::text = "userId");',
    
    'DROP POLICY IF EXISTS "Users can only access their own model update candidates" ON "ModelUpdateCandidate";',
    'CREATE POLICY "Users can only access their own model update candidates" ON "ModelUpdateCandidate" FOR ALL USING (auth.uid()::text = "userId");',

    'DROP POLICY IF EXISTS "Users can only access their own chess dna versions" ON "ChessDNAVersion";',
    'CREATE POLICY "Users can only access their own chess dna versions" ON "ChessDNAVersion" FOR ALL USING (auth.uid()::text = "userId");',
]

with engine.connect() as conn:
    for stmt in rls_statements:
        try:
            conn.execute(text(stmt))
            print("Executed:", stmt[:70])
        except Exception as e:
            print("Error executing:", stmt[:70], "->", e)
    conn.commit()
print("Phase 15 RLS policies applied successfully.")
