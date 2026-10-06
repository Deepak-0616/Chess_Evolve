import os
import json
from sqlalchemy import text
from app.db import get_engine
import torch

def run_phase13_audit():
    engine = get_engine()
    out_dir = "../model_audit"
    os.makedirs(out_dir, exist_ok=True)
    
    with engine.connect() as conn:
        models = conn.execute(text("SELECT * FROM \"MLModelVersion\" WHERE status = 'READY'")).fetchall()
        
        audit_results = []
        for row in models:
            row_dict = dict(zip(row._mapping.keys(), row))
            
            # Check artifact
            artifact_exists = False
            artifact_loadable = False
            path = row_dict["artifactPath"]
            if path and os.path.exists(path):
                artifact_exists = True
                target_path = path if not os.path.isdir(path) else os.path.join(path, "checkpoint_best.pt")
                if os.path.exists(target_path):
                    try:
                        checkpoint = torch.load(target_path, map_location="cpu")
                        artifact_loadable = True
                    except Exception as e:
                        pass
            
            # Check Peak Dependency
            dependency_valid = True
            dependency_exists = False
            if row_dict["modelType"] == "PEAK_SELF":
                dep_id = row_dict["dependentModelVersionId"]
                if dep_id:
                    dep = conn.execute(text(f"SELECT * FROM \"MLModelVersion\" WHERE id = '{dep_id}' AND \"modelType\" = 'CURRENT_SELF'")).fetchone()
                    if dep:
                        dependency_exists = True
                        if dep.status != 'READY':
                            dependency_valid = False
                    else:
                        dependency_valid = False
                else:
                    dependency_valid = False
            
            audit_results.append({
                "id": row_dict["id"],
                "userId": row_dict["userId"],
                "modelType": row_dict["modelType"],
                "version": row_dict["version"],
                "datasetVersion": row_dict["datasetVersion"],
                "featureVersion": row_dict["featureVersion"],
                "architectureVersion": row_dict["architectureVersion"],
                "trainingConfigVersion": row_dict["trainingConfigVersion"],
                "trainingJobId": row_dict["trainingJobId"],
                "status": row_dict["status"],
                "evaluationStatus": row_dict["evaluationStatus"],
                "evaluationMetrics": row_dict.get("evaluationMetrics"),
                "behavioralMetrics": row_dict.get("behavioralMetrics"),
                "baselineMetrics": row_dict.get("baselineMetrics"),
                "qualityGateResult": row_dict.get("qualityGateResult"),
                "artifactPath": row_dict["artifactPath"],
                "trainedAt": row_dict["trainedAt"].isoformat() if row_dict["trainedAt"] else None,
                "artifact_exists": artifact_exists,
                "artifact_loadable": artifact_loadable,
                "dependency_exists": dependency_exists if row_dict["modelType"] == "PEAK_SELF" else None,
                "dependency_valid": dependency_valid if row_dict["modelType"] == "PEAK_SELF" else None
            })
            
    with open(os.path.join(out_dir, "model_registry_audit.json"), "w") as f:
        json.dump(audit_results, f, indent=4)
        
    with open(os.path.join(out_dir, "model_registry_audit.md"), "w") as f:
        f.write("# Model Registry Audit\n\n")
        for res in audit_results:
            f.write(f"### Model: {res['id']} ({res['modelType']} v{res['version']})\n")
            f.write(f"- User: {res['userId']}\n")
            f.write(f"- Status: {res['status']}\n")
            f.write(f"- Artifact Exists: {res['artifact_exists']}\n")
            f.write(f"- Artifact Loadable: {res['artifact_loadable']}\n")
            if res["modelType"] == "PEAK_SELF":
                f.write(f"- Peak Dependency Valid: {res['dependency_valid']}\n")
            f.write("\n")

if __name__ == "__main__":
    run_phase13_audit()
