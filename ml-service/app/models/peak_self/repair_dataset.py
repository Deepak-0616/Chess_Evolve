import sys
import os
import json
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
load_dotenv()

from sqlalchemy import text
from app.db import get_engine
from app.datasets.target_generation import calculate_peak_score
from app.datasets.schemas import PeakTargetConfig

def repair():
    engine = get_engine()
    config = PeakTargetConfig()
    
    with engine.connect() as conn:
        with conn.begin():
            query = '''
                SELECT r.id, r.features 
                FROM "MLDatasetRecord" r
                JOIN "MLDataset" d ON r."datasetId" = d.id
                WHERE d."datasetType" = 'PEAK_SELF' AND r."peakScore" IS NULL
            '''
            result = conn.execute(text(query))
            rows = result.fetchall()
            print(f"Found {len(rows)} PEAK_SELF rows needing repair.")
            
            for row in rows:
                feat = json.loads(row.features) if isinstance(row.features, str) else row.features
                cand = feat.get("candidate", {})
                pos = feat.get("position", {})
                player = feat.get("player", {})
                weakness = feat.get("weakness", {})
                
                scores = calculate_peak_score(cand, pos, player, weakness, config)
                peak_score = scores.get("peakScore", 0.0)
                
                conn.execute(
                    text('UPDATE "MLDatasetRecord" SET "peakScore" = :sc WHERE id = :id'),
                    {"sc": peak_score, "id": row.id}
                )
    print("Repair complete.")

if __name__ == "__main__":
    repair()
