import os
import json
import csv
import torch
from sqlalchemy import text
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db import get_engine
from app.models.current_self.model import CurrentSelfModel
from app.models.peak_self.model import PeakSelfNetwork
from app.models.current_self.config import CurrentSelfTrainingConfig
from app.models.peak_self.config import PeakSelfTrainingConfig

def run_audit():
    engine = get_engine()
    
    out_dir = "../model_audit"
    os.makedirs(out_dir, exist_ok=True)
    
    audit_data = []
    
    with engine.connect() as conn:
        query = """
            SELECT "userId", "modelType", version, status, "datasetVersion", 
                   "featureVersion", "gamesUsed", "positionsUsed", 
                   "dependentModelVersionId", "evaluationStatus", 
                   "qualityGateResult", "artifactPath"
            FROM "MLModelVersion"
        """
        rows = conn.execute(text(query)).fetchall()
        
        for row in rows:
            # Check artifact
            artifact_status = "MISSING"
            artifact_loadable = False
            
            path = row.artifactPath
            if path and os.path.exists(path):
                artifact_status = "EXISTS"
                # If it's a directory (like Peak Self saves), find the checkpoint
                target_path = path
                if os.path.isdir(path):
                    target_path = os.path.join(path, "checkpoint_best.pt")
                
                if os.path.exists(target_path):
                    try:
                        checkpoint = torch.load(target_path, map_location="cpu")
                        
                        if row.modelType == "CURRENT_SELF":
                            model = CurrentSelfModel(CurrentSelfTrainingConfig())
                            if "model_state_dict" in checkpoint:
                                model.load_state_dict(checkpoint["model_state_dict"])
                            else:
                                model.load_state_dict(checkpoint)
                        else:
                            config = PeakSelfTrainingConfig()
                            model = PeakSelfNetwork(
                                position_dim=config.position_dim,
                                candidate_dim=config.candidate_dim,
                                hidden_dim=config.hidden_dim,
                                dropout=config.dropout
                            )
                            if "model_state_dict" in checkpoint:
                                model.load_state_dict(checkpoint["model_state_dict"])
                            else:
                                model.load_state_dict(checkpoint)
                                
                        artifact_loadable = True
                    except Exception as e:
                        artifact_status = f"LOAD_ERROR: {str(e)}"
            
            audit_data.append({
                "userId": row.userId,
                "modelType": row.modelType,
                "version": row.version,
                "status": row.status,
                "datasetVersion": row.datasetVersion,
                "featureVersion": row.featureVersion,
                "gamesUsed": row.gamesUsed,
                "positionsUsed": row.positionsUsed,
                "dependentModelVersionId": row.dependentModelVersionId,
                "evaluationStatus": row.evaluationStatus,
                "qualityGatePassed": "YES" if row.qualityGateResult and json.loads(row.qualityGateResult if isinstance(row.qualityGateResult, str) else json.dumps(row.qualityGateResult)).get("status") == "PASS" else "NO",
                "artifactExists": artifact_status,
                "artifactLoadable": artifact_loadable
            })
            
    # Save CSV
    with open(os.path.join(out_dir, "model_registry.csv"), "w", newline="") as f:
        if audit_data:
            writer = csv.DictWriter(f, fieldnames=audit_data[0].keys())
            writer.writeheader()
            writer.writerows(audit_data)
            
    # Save JSON
    with open(os.path.join(out_dir, "model_registry.json"), "w") as f:
        json.dump(audit_data, f, indent=4)
        
    # Save README
    with open(os.path.join(out_dir, "README.md"), "w") as f:
        f.write("# Model Registry Audit\n\nThis audit verifies the existence and PyTorch loadability of all models in the database.\n\n")
        f.write("## Summary\n")
        f.write(f"- Total Models: {len(audit_data)}\n")
        ready_models = [m for m in audit_data if m["status"] == "READY"]
        f.write(f"- READY Models: {len(ready_models)}\n")
        loadable_models = [m for m in audit_data if m["artifactLoadable"]]
        f.write(f"- Loadable Artifacts: {len(loadable_models)}\n")
        
    print("Audit Complete.")

if __name__ == "__main__":
    run_audit()
