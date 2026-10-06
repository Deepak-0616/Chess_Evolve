from app.db import get_engine
from sqlalchemy import text

engine = get_engine()

rls_statements = [
    'ALTER TABLE "TrainingPlan" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "TrainingSession" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "TrainingPosition" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "TrainingAttempt" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "TrainingProgress" ENABLE ROW LEVEL SECURITY;',
    
    'DROP POLICY IF EXISTS "Users can only access their own training plans" ON "TrainingPlan";',
    'CREATE POLICY "Users can only access their own training plans" ON "TrainingPlan" FOR ALL USING (auth.uid()::text = "userId");',
    
    'DROP POLICY IF EXISTS "Users can only access their own training sessions" ON "TrainingSession";',
    'CREATE POLICY "Users can only access their own training sessions" ON "TrainingSession" FOR ALL USING (auth.uid()::text = "userId");',
    
    'DROP POLICY IF EXISTS "Users can only access their own training positions" ON "TrainingPosition";',
    'CREATE POLICY "Users can only access their own training positions" ON "TrainingPosition" FOR ALL USING (auth.uid()::text = "userId");',
    
    'DROP POLICY IF EXISTS "Users can only access their own training attempts" ON "TrainingAttempt";',
    'CREATE POLICY "Users can only access their own training attempts" ON "TrainingAttempt" FOR ALL USING (auth.uid()::text = "userId");',
    
    'DROP POLICY IF EXISTS "Users can only access their own training progress" ON "TrainingProgress";',
    'CREATE POLICY "Users can only access their own training progress" ON "TrainingProgress" FOR ALL USING (auth.uid()::text = "userId");',
]

with engine.connect() as conn:
    for stmt in rls_statements:
        try:
            conn.execute(text(stmt))
            print("Executed:", stmt[:60])
        except Exception as e:
            print("Error executing:", stmt[:60], "->", e)
    conn.commit()
print("RLS policies applied successfully.")
