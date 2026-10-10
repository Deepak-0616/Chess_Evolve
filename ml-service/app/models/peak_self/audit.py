import sys
import os
import json
from dotenv import load_dotenv
from collections import Counter
import statistics

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
load_dotenv()

from sqlalchemy import text
from app.db import get_engine
from app.datasets.target_generation import calculate_peak_score
from app.datasets.schemas import PeakTargetConfig

def run_audit(dataset_id: str = None):
    engine = get_engine()
    config = PeakTargetConfig()
    
    total = 0
    valid = 0
    excluded = 0
    
    sf_top1_count = 0
    
    target_rank_dist = Counter()
    
    confidences = []
    
    reasons = {
        "engineQuality": 0,
        "styleCompatibility": 0,
        "weaknessCorrection": 0,
        "preferenceCompatibility": 0
    }
    
    # We load all peak_self target records
    # A position can have multiple candidates, but only one is the peak target (isPeakTarget=True)
    with engine.connect() as conn:
        query = """
            SELECT r.id, r."datasetId", r."candidateMove", r."isPeakTarget", r."peakScore", r.features
            FROM "MLDatasetRecord" r
            JOIN "MLDataset" d ON r."datasetId" = d.id
            WHERE d."datasetType" = 'PEAK_SELF' AND r."isPeakTarget" = true
        """
        if dataset_id:
            query += f" AND r.\"datasetId\" = '{dataset_id}'"
            
        result = conn.execute(text(query)).fetchall()
        
        for row in result:
            total += 1
            feat = json.loads(row.features) if isinstance(row.features, str) else row.features
            
            cand = feat.get("candidate", {})
            pos = feat.get("position", {})
            player = feat.get("player", {})
            weakness = feat.get("weakness", {})
            
            # Recalculate full scores to get reasons
            scores = calculate_peak_score(cand, pos, player, weakness, config)
            
            # Audit checks
            is_valid = True
            
            if row.peakScore is None:
                is_valid = False
            if cand.get("engine_rank") is None:
                is_valid = False
            
            if not is_valid:
                excluded += 1
                continue
                
            valid += 1
            
            rank = cand.get("engine_rank", 1)
            if rank == 1:
                sf_top1_count += 1
                
            target_rank_dist[f"rank{rank}"] += 1
            
            confidences.append(scores["peakScore"])
            
            reasons["engineQuality"] += scores["engineQuality"]
            reasons["styleCompatibility"] += scores["styleCompatibility"]
            reasons["weaknessCorrection"] += scores["weaknessCorrection"]
            reasons["preferenceCompatibility"] += scores["preferenceCompatibility"]
            
    # Compute averages for reasons
    if valid > 0:
        for k in reasons:
            reasons[k] = reasons[k] / valid
            
    report = {
        "datasetVersion": "v1",
        "totalExamples": total,
        "validExamples": valid,
        "excludedExamples": excluded,
        "stockfishTop1Rate": (sf_top1_count / valid) if valid > 0 else 0,
        "targetEngineRank": dict(target_rank_dist),
        "targetConfidence": {
            "mean": statistics.mean(confidences) if confidences else 0,
            "median": statistics.median(confidences) if confidences else 0,
            "min": min(confidences) if confidences else 0,
            "max": max(confidences) if confidences else 0
        },
        "reasons": reasons
    }
    
    with open(os.path.join(os.path.dirname(__file__), "peak_target_report.json"), "w") as f:
        json.dump(report, f, indent=4)
        
    print("Audit Complete. Report generated.")
    
if __name__ == "__main__":
    run_audit()
