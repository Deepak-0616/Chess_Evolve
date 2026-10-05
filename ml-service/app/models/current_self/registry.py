from sqlalchemy import create_engine, text
import os
import json
import uuid
import datetime

class ModelRegistry:
    def __init__(self):
        db_url = os.getenv("DIRECT_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/chess_evolve")
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+psycopg2://")
        self.engine = create_engine(db_url)

    def start_training(self, model_version_id: str):
        with self.engine.connect() as conn:
            conn.execute(text("""
                UPDATE "MLModelVersion" 
                SET status = 'TRAINING' 
                WHERE id = :id
            """), {"id": model_version_id})
            conn.commit()

    def update_status(self, model_version_id: str, status: str, metrics: dict = None, artifact_path: str = None, eval_report: dict = None):
        metrics_json = json.dumps(metrics) if metrics else None
        
        with self.engine.connect() as conn:
            query = """
                UPDATE "MLModelVersion" 
                SET status = :status
            """
            params = {"id": model_version_id, "status": status}
            
            if metrics_json is not None:
                query += ", metrics = :metrics"
                params["metrics"] = metrics_json
                
            if artifact_path is not None:
                query += ", \"artifactPath\" = :artifact_path, \"trainedAt\" = :trained_at"
                params["artifact_path"] = artifact_path
                params["trained_at"] = datetime.datetime.utcnow()
                
            if eval_report is not None:
                query += """, 
                    "evaluationStatus" = :eval_status,
                    "evaluationMetrics" = :eval_metrics,
                    "behavioralMetrics" = :behavioral_metrics,
                    "baselineMetrics" = :baseline_metrics,
                    "qualityGateResult" = :qg_result,
                    "evaluationCompletedAt" = :eval_time
                """
                
                # If validation passed, and model is READY, otherwise update status to match eval
                if eval_report["qualityGate"]["status"] == "FAIL":
                    query = query.replace("status = :status", "status = 'VALIDATION_FAILED'")
                elif eval_report["qualityGate"]["status"] == "INSUFFICIENT_EVIDENCE":
                    query = query.replace("status = :status", "status = 'INSUFFICIENT_DATA'")
                    
                params["eval_status"] = eval_report["qualityGate"]["status"]
                params["eval_metrics"] = json.dumps(eval_report["metrics"])
                params["behavioral_metrics"] = json.dumps(eval_report["behavioralSimilarity"])
                params["baseline_metrics"] = json.dumps(eval_report["baselines"])
                params["qg_result"] = json.dumps(eval_report["qualityGate"])
                params["eval_time"] = datetime.datetime.utcnow()
                
            query += " WHERE id = :id"
            
            conn.execute(text(query), params)
            conn.commit()
