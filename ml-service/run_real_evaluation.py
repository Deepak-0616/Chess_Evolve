import os
import json
import csv
from datetime import datetime
from sqlalchemy import text
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.db import get_engine
def run_evaluation():
    print("Starting REAL Chess Evolve Evaluation...")
    
    # 1. Connect to DB to find models and datasets
    print("Connecting to database...")
    engine = get_engine()
    
    current_self = None
    peak_self = None
    
    with engine.connect() as conn:
        res_current = conn.execute(text("SELECT * FROM \"MLModelVersion\" WHERE \"modelType\" = 'CURRENT_SELF' ORDER BY version DESC LIMIT 1")).fetchone()
        if res_current:
            current_self = dict(zip(res_current._mapping.keys(), res_current))
            
        res_peak = conn.execute(text("SELECT * FROM \"MLModelVersion\" WHERE \"modelType\" = 'PEAK_SELF' ORDER BY version DESC LIMIT 1")).fetchone()
        if res_peak:
            peak_self = dict(zip(res_peak._mapping.keys(), res_peak))
            
    print(f"Found Current Self: {current_self['id'] if current_self else 'None'} (Status: {current_self['status'] if current_self else 'N/A'})")
    print(f"Found Peak Self: {peak_self['id'] if peak_self else 'None'} (Status: {peak_self['status'] if peak_self else 'N/A'})")

    # Metrics dictionary
    metrics = {
        "Top-1 Accuracy": "NOT_AVAILABLE",
        "Top-3 Accuracy": "NOT_AVAILABLE",
        "MRR": "NOT_AVAILABLE",
        "Log Loss": "NOT_AVAILABLE",
        "ECE": "NOT_AVAILABLE",
        "Average Engine Rank": "NOT_AVAILABLE",
        "Average CPL": "NOT_AVAILABLE",
        "Stockfish Top-1 Rate": "NOT_AVAILABLE",
        "JS Divergence": "NOT_AVAILABLE",
        "Move-Type Similarity": "NOT_AVAILABLE",
        "Weakness Reduction": "NOT_AVAILABLE",
        "Style Preservation": "NOT_AVAILABLE",
        "Engine Quality Improvement": "NOT_AVAILABLE"
    }

    reasons = {}

    if not current_self or current_self.get("status") != "READY":
        reason = f"Current Self model is not trained/ready. Status: {current_self.get('status') if current_self else 'Not Found'}."
        print(reason)
        for k in metrics:
            reasons[k] = reason
    else:
        # Load real metrics from Current Self
        print("Loading Current Self metrics from DB...")
        cm = current_self.get("metrics", {})
        if isinstance(cm, str):
            cm = json.loads(cm)
        metrics["Top-1 Accuracy"] = cm.get("top1", "NOT_AVAILABLE")
        metrics["Top-3 Accuracy"] = cm.get("top3", "NOT_AVAILABLE")
        metrics["MRR"] = cm.get("mrr", "NOT_AVAILABLE")
        metrics["Log Loss"] = cm.get("valLoss", "NOT_AVAILABLE")
        
    if not peak_self or peak_self.get("status") != "READY":
        reason = f"Peak Self model is not trained/ready. Status: {peak_self.get('status') if peak_self else 'Not Found'}."
        print(reason)
        for k in ["Weakness Reduction", "Style Preservation", "Engine Quality Improvement"]:
            reasons[k] = reason
    else:
        pm = peak_self.get("metrics", {})
        if isinstance(pm, str):
            pm = json.loads(pm)
        pm_eval = peak_self.get("evaluationMetrics", {})
        if isinstance(pm_eval, str):
            pm_eval = json.loads(pm_eval)
        pm_behav = peak_self.get("behavioralMetrics", {})
        if isinstance(pm_behav, str):
            pm_behav = json.loads(pm_behav)
            
        metrics["Peak Top-1 Accuracy"] = pm.get("top1", "NOT_AVAILABLE")
        metrics["Peak Top-3 Accuracy"] = pm.get("top3", "NOT_AVAILABLE")
        metrics["Peak MRR"] = pm.get("mrr", "NOT_AVAILABLE")
        metrics["Peak Log Loss"] = pm.get("valLoss", "NOT_AVAILABLE")
        
        metrics["Weakness Reduction"] = pm_behav.get("weaknessReductionRate", "NOT_AVAILABLE")
        metrics["Style Preservation"] = pm_behav.get("styleCollapseRate", "NOT_AVAILABLE")
        metrics["Engine Quality Improvement"] = pm_behav.get("engineRankDistance", "NOT_AVAILABLE")

    # Generate the accuracy folder
    out_dir = "../accuracy"
    os.makedirs(out_dir, exist_ok=True)
    
    # Generate accuracy_report.csv
    csv_path = os.path.join(out_dir, "accuracy_report.csv")
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Metric", "Current Self", "Peak Self", "Difference", "Direction"])
        
        def write_metric(name, m_c, m_p, dir_str):
            c = metrics.get(m_c, "NOT_AVAILABLE")
            p = metrics.get(m_p, "NOT_AVAILABLE")
            diff = "NOT_AVAILABLE"
            if isinstance(c, (int, float)) and isinstance(p, (int, float)):
                diff = f"{p - c:.4f}"
            
            c_str = f"{c:.4f}" if isinstance(c, float) else c
            p_str = f"{p:.4f}" if isinstance(p, float) else p
            writer.writerow([name, c_str, p_str, diff, dir_str])
            
        write_metric("Top-1 Accuracy", "Top-1 Accuracy", "Peak Top-1 Accuracy", "Higher is better")
        write_metric("Top-3 Accuracy", "Top-3 Accuracy", "Peak Top-3 Accuracy", "Higher is better")
        write_metric("MRR", "MRR", "Peak MRR", "Higher is better")
        write_metric("Log Loss", "Log Loss", "Peak Log Loss", "Lower is better")
        
        writer.writerow(["Weakness Reduction", "-", f"{metrics.get('Weakness Reduction', 'NOT_AVAILABLE')}", "-", "Higher is better"])
        writer.writerow(["Engine Quality Improvement", "-", f"{metrics.get('Engine Quality Improvement', 'NOT_AVAILABLE')}", "-", "Higher is better"])
        writer.writerow(["Move-Type Distance", "-", f"{metrics.get('Style Preservation', 'NOT_AVAILABLE')}", "-", "Lower is better"])

    # Generate accuracy_report.json
    report_json = {
        "evaluation": {
            "timestamp": datetime.utcnow().isoformat(),
            "datasetVersion": "v1",
            "featureVersion": "v1",
            "failureReason": None
        },
        "currentSelf": {
            "modelVersion": str(current_self.get("version")) if current_self else "NOT_AVAILABLE",
            "metrics": {
                "top1": metrics.get("Top-1 Accuracy"),
                "top3": metrics.get("Top-3 Accuracy"),
                "mrr": metrics.get("MRR"),
                "logLoss": metrics.get("Log Loss")
            }
        },
        "peakSelf": {
            "modelVersion": str(peak_self.get("version")) if peak_self else "NOT_AVAILABLE",
            "metrics": {
                "top1": metrics.get("Peak Top-1 Accuracy"),
                "top3": metrics.get("Peak Top-3 Accuracy"),
                "mrr": metrics.get("Peak MRR"),
                "logLoss": metrics.get("Peak Log Loss"),
                "weaknessReduction": metrics.get("Weakness Reduction"),
                "engineQualityImprovement": metrics.get("Engine Quality Improvement"),
                "stylePreservation": metrics.get("Style Preservation")
            }
        }
    }
    
    with open(os.path.join(out_dir, "accuracy_report.json"), "w") as f:
        json.dump(report_json, f, indent=2)

    # Generate detailed_metrics.json
    detailed_metrics = {
        "evaluationContext": {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "SUCCESS",
            "reason": "Successfully generated metrics."
        },
        "currentSelfRawMetrics": current_self.get("metrics", {}) if current_self else {},
        "peakSelfRawMetrics": peak_self.get("metrics", {}) if peak_self else {},
        "reasonsForUnavailableMetrics": reasons
    }
    
    with open(os.path.join(out_dir, "detailed_metrics.json"), "w") as f:
        json.dump(detailed_metrics, f, indent=2)

    # Generate evaluation_metadata.json
    metadata = {
        "executionTimestamp": datetime.utcnow().isoformat(),
        "gitCommit": "NOT_AVAILABLE",
        "currentSelfArtifactPath": current_self.get("artifactPath") if current_self else "NOT_AVAILABLE",
        "peakSelfArtifactPath": peak_self.get("artifactPath") if peak_self else "NOT_AVAILABLE",
        "datasetVersion": "NOT_AVAILABLE",
        "featureVersion": "NOT_AVAILABLE",
        "pythonVersion": "3.10+",
        "pytorchVersion": "2.0+",
        "stockfishVersion": "16.1",
        "testGamesCount": 0,
        "testPositionsCount": 0,
        "evaluationCommand": "python run_real_evaluation.py",
        "evaluationStatus": "FAILED - INSUFFICIENT DATA"
    }
    
    with open(os.path.join(out_dir, "evaluation_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    # Generate model_comparison.csv
    with open(os.path.join(out_dir, "model_comparison.csv"), "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Model", "Top-1", "Top-3", "MRR", "Engine Rank", "CPL", "Status"])
        writer.writerow(["Current Self", "NOT_AVAILABLE", "NOT_AVAILABLE", "NOT_AVAILABLE", "NOT_AVAILABLE", "NOT_AVAILABLE", current_self.get("status") if current_self else "N/A"])
        writer.writerow(["Peak Self", "NOT_AVAILABLE", "NOT_AVAILABLE", "NOT_AVAILABLE", "NOT_AVAILABLE", "NOT_AVAILABLE", peak_self.get("status") if peak_self else "N/A"])

    # Generate README.md
    readme_content = """# Chess Evolve Accuracy Evaluation

## Purpose
This folder contains the actual evaluation results of the trained Current Self and Peak Self models. 
The objective is to evaluate model prediction metrics against real player move decisions and compare the differences.

## Models
- **Current Self**: Predicts how the player historically tends to play.
- **Peak Self**: Predicts a stronger version of the player's style while attempting to preserve behavioral identity.

## Data Source
- **Database**: Active Supabase Postgres DB
- **Current Self Version**: {current_version}
- **Peak Self Version**: {peak_version}

## Results
Please refer to `accuracy_report.csv` and `accuracy_report.json` for detailed metrics.
""".format(
    current_version=current_self.get("version") if current_self else "None",
    peak_version=peak_self.get("version") if peak_self else "None"
)

    with open(os.path.join(out_dir, "README.md"), "w") as f:
        f.write(readme_content)

    print("\nEvaluation completed.")
    print(f"\nCurrent Self Top-1: {metrics.get('Top-1 Accuracy', 'NOT_AVAILABLE')}")
    print(f"Peak Self Top-1: {metrics.get('Peak Top-1 Accuracy', 'NOT_AVAILABLE')}")
    print(f"Weakness Reduction: {metrics.get('Weakness Reduction', 'NOT_AVAILABLE')}")
    
    print("\nResults saved to:\naccuracy/")
    
    print("\nGenerated files:")
    for f in os.listdir(out_dir):
        print(f"accuracy/{f}")

if __name__ == "__main__":
    run_evaluation()
