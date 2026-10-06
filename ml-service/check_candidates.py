from app.db import get_engine
from sqlalchemy import text
import json

engine = get_engine()
with engine.connect() as conn:
    # Check how many PositionAnalysis have candidateMoves != '[]' and != 'null'
    has_cands = conn.execute(text('''
        SELECT COUNT(*) FROM "PositionAnalysis" 
        WHERE "candidateMoves" IS NOT NULL AND jsonb_array_length("candidateMoves"::jsonb) > 0
    ''')).fetchone()[0]
    total_pa = conn.execute(text('SELECT COUNT(*) FROM "PositionAnalysis"')).fetchone()[0]
    print(f"PositionAnalysis with non-empty candidateMoves: {has_cands} / {total_pa}")
    
    # Check FeatureRecord candidate moves
    has_fr = conn.execute(text('SELECT COUNT(*), COUNT(DISTINCT "positionId"), COUNT(DISTINCT "candidateMove") FROM "FeatureRecord"')).fetchone()
    print(f"FeatureRecord rows: {has_fr[0]}, distinct positions: {has_fr[1]}, distinct candidate moves: {has_fr[2]}")
    
    # Check sample PositionAnalysis with non-empty candidateMoves
    sample = conn.execute(text('''
        SELECT pa.id, pa.fen, pa."candidateMoves", pa."bestMove", pa."cpLoss", pa.classification
        FROM "PositionAnalysis" pa
        WHERE "candidateMoves" IS NOT NULL AND jsonb_array_length("candidateMoves"::jsonb) > 0
        LIMIT 1
    ''')).fetchone()
    if sample:
        print(f"Sample PA with candidates: {sample[0]}, best: {sample[3]}, CPL: {sample[4]}, class: {sample[5]}")
        print("Candidates content:", sample[2][:2] if isinstance(sample[2], list) else str(sample[2])[:200])
